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

// 4. API Client Orders (Istoric Comenzi)
app.get('/api/my-orders', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: 'Token missing' });

        // Selectăm comenzile
        const [orders] = await pool.execute(
            'SELECT * FROM orders WHERE client_token = ? ORDER BY created_at DESC', 
            [token]
        );

        // Pentru fiecare comandă, luăm articolele (se poate optimiza cu JOIN, dar e ok așa pt simplitate)
        for (let order of orders) {
            const [items] = await pool.execute(
                'SELECT * FROM order_items WHERE order_id = ?',
                [order.id]
            );
            order.items = items;
            
            // Parsăm JSON-urile din DB pentru a le trimite corect la frontend
            try {
                if(typeof order.billing_details === 'string') order.billing_details = JSON.parse(order.billing_details);
                if(typeof order.shipping_details === 'string') order.shipping_details = JSON.parse(order.shipping_details);
            } catch(e) {}
        }

        res.json(orders);
    } catch (err) {
        console.error('[API My Orders] Error:', err);
        res.status(500).json({ error: 'Eroare la preluarea comenzilor.' });
    }
});

// 5. API Comenzi (Tranzacțional)
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

        // Trimitem email-ul asincron (nu blocăm răspunsul)
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

    // Construire tabel produse HTML
    const productsHtml = items.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px;">${item.name}<br/><span style="font-size:12px;color:#777;">SKU: ${item.sku}</span></td>
            <td style="padding: 10px; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; text-align: right;">${item.price} RON</td>
            <td style="padding: 10px; text-align: right;"><b>${(item.price * item.quantity).toFixed(2)} RON</b></td>
        </tr>
    `).join('');

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Confirmare Comandă</h2>
            <p style="margin: 5px 0 0;">#${orderNumber}</p>
        </div>
        
        <div style="padding: 20px;">
            <p>Salut <strong>${billing.name}</strong>,</p>
            <p>Îți mulțumim pentru comanda plasată pe SmartMeters.ro. Iată detaliile:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #f8fafc; text-align: left;">
                        <th style="padding: 10px;">Produs</th>
                        <th style="padding: 10px; text-align: center;">Cant</th>
                        <th style="padding: 10px; text-align: right;">Preț Unit</th>
                        <th style="padding: 10px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="padding: 10px; text-align: right;">Subtotal:</td>
                        <td style="padding: 10px; text-align: right;">${totals.subtotal} RON</td>
                    </tr>
                    ${totals.discount > 0 ? `
                    <tr>
                        <td colspan="3" style="padding: 10px; text-align: right; color: green;">Discount (${totals.discountCode}):</td>
                        <td style="padding: 10px; text-align: right; color: green;">-${totals.discount} RON</td>
                    </tr>
                    ` : ''}
                    <tr style="font-size: 18px; font-weight: bold;">
                        <td colspan="3" style="padding: 10px; text-align: right;">Total Final:</td>
                        <td style="padding: 10px; text-align: right;">${totals.total} RON</td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top: 30px; background-color: #f8fafc; padding: 15px; border-radius: 6px;">
                <h3 style="margin-top: 0; font-size: 16px;">Detalii Facturare</h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.5;">
                    ${billing.company ? billing.company + '<br>' : ''}
                    ${billing.name}<br>
                    ${billing.address1}, ${billing.city}, ${billing.postcode}<br>
                    Telefon: ${billing.phone}
                </p>
            </div>
            
            <p style="margin-top: 30px; font-size: 13px; color: #777; text-align: center;">
                Vei fi contactat în scurt timp de un reprezentant pentru confirmarea stocului și emiterea facturii fiscale.
            </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
            © ${new Date().getFullYear()} SmartMeters.ro - Industrial Metering Solutions
        </div>
    </div>
    `;

    const mailOptions = {
        from: `"Smart Meters" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER, // Admin primește copia
        cc: email, // Clientul primește copia (CC) sau direct TO
        subject: `Confirmare Comandă ${orderNumber} - SmartMeters.ro`,
        html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email] Trimis (HTML) pentru comanda ${orderNumber}`);
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