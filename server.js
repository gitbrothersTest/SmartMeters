const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');
const fs = require('fs');

const app = express();
app.use(express.json());

// Logger Middleware
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

// 1. Configurare Mediu
const envPath = path.join(__dirname, '.env');
const dotenvResult = require('dotenv').config({ path: envPath });

if (dotenvResult.error) {
    console.log(`[SmartMeters Log] INFO: Nu s-a găsit fișierul .env. Se folosesc variabilele de mediu existente.`);
}

// 2. Configurare Bază de Date (Connection Pool)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true
});

// Helper pentru a testa conexiunea la pornire
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('[MySQL] Conexiune reușită la baza de date!');
        connection.release();
    } catch (err) {
        console.error('------------------------------------------------');
        console.error('[MySQL] EROARE CRITICĂ LA CONECTARE:');
        console.error(`Mesaj: ${err.message}`);
        console.error('Verificați dacă serviciul MySQL rulează și credențialele din .env sunt corecte.');
        console.error('------------------------------------------------');
    }
})();

// 3. API Produse (Citire cu Filtre Dinamice)
app.get('/api/products', async (req, res) => {
    try {
        const { category, manufacturer, protocol, search } = req.query;
        
        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];

        if (category && category !== 'ALL') {
            query += ' AND category = ?';
            params.push(category);
        }
        if (manufacturer && manufacturer !== 'ALL') {
            query += ' AND manufacturer = ?';
            params.push(manufacturer);
        }
        if (protocol && protocol !== 'ALL') {
            query += ' AND protocol LIKE ?';
            params.push(`%${protocol}%`);
        }
        if (search) {
            query += ' AND (name LIKE ? OR sku LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await pool.execute(query, params);

        const products = rows.map(p => ({
            ...p,
            shortDescription: typeof p.short_description === 'string' ? JSON.parse(p.short_description) : p.short_description,
            fullDescription: typeof p.full_description === 'string' ? JSON.parse(p.full_description) : p.full_description,
            specs: typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs,
            image: p.image_url,
            stockStatus: p.stock_status,
            datasheetUrl: p.datasheet_url
        }));

        res.json(products);
    } catch (err) {
        console.error('[API Products] Error:', err);
        res.status(500).json({ error: 'Eroare server la încărcarea produselor. Verificați conexiunea la baza de date.' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Produs inexistent' });

        const p = rows[0];
        const product = {
            ...p,
            shortDescription: typeof p.short_description === 'string' ? JSON.parse(p.short_description) : p.short_description,
            fullDescription: typeof p.full_description === 'string' ? JSON.parse(p.full_description) : p.full_description,
            specs: typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs,
            image: p.image_url,
            stockStatus: p.stock_status,
            datasheetUrl: p.datasheet_url
        };
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. API Comenzi (Tranzacțional)
app.post('/api/orders', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { email, billing, shipping, items, totals, order_notes, clientToken } = req.body;
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        await conn.beginTransaction();

        const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

        const [orderResult] = await conn.execute(
            `INSERT INTO orders 
            (order_number, client_token, client_ip, customer_email, billing_details, shipping_details, order_notes, subtotal, discount_code, discount_amount, final_total, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
            [
                orderNumber,
                clientToken,
                clientIp,
                email,
                JSON.stringify(billing),
                JSON.stringify(shipping),
                order_notes || '',
                totals.subtotal,
                totals.discountCode || null,
                totals.discount || 0,
                totals.total
            ]
        );

        const orderId = orderResult.insertId;

        const itemValues = [];
        const placeholders = items.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
        
        items.forEach(item => {
            itemValues.push(
                orderId,
                item.id, 
                item.name,
                item.sku,
                item.quantity,
                item.price,
                (item.price * item.quantity)
            );
        });

        if (items.length > 0) {
            await conn.execute(
                `INSERT INTO order_items (order_id, product_id, product_name, sku, quantity, unit_price, total_price) VALUES ${placeholders}`,
                itemValues
            );
        }

        await conn.commit();

        sendOrderEmail(orderNumber, req.body).catch(console.error);

        res.status(201).json({ success: true, orderNumber, message: 'Comanda a fost înregistrată.' });

    } catch (err) {
        await conn.rollback();
        console.error('[API Order] Transaction Error:', err);
        res.status(500).json({ error: 'Eroare la procesarea comenzii.' });
    } finally {
        conn.release();
    }
});

async function sendOrderEmail(orderNumber, data) {
    const { items, billing, totals, email } = data;
    
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 465,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }
    });

    const productsRows = items.map(item => 
        `${item.name} (x${item.quantity}) - ${(item.price * item.quantity).toFixed(2)} RON`
    ).join('\n');

    const mailOptions = {
        from: `"Smart Meters" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        replyTo: email,
        subject: `Comandă Nouă ${orderNumber} - ${billing.name}`,
        text: `Comandă nouă de la ${billing.name}\n\nTotal: ${totals.total} RON\n\nProduse:\n${productsRows}`
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email] Trimis pentru comanda ${orderNumber}`);
}

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Changed default port to 3001 to prevent conflict with Vite (3000)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Serverul SmartMeters rulează pe portul ${PORT} cu MySQL Pool.`);
});