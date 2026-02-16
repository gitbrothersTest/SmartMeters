const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');
const fs = require('fs');

// --- DEBUG CONFIGURATION ---
const DEBUG_LEVEL = parseInt(process.env.DEBUG_LEVEL || '0', 10);

const logDebug = (section, message, data = null) => {
    if (DEBUG_LEVEL > 0) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [DEBUG] [${section}] ${message}`);
        if (data && DEBUG_LEVEL > 1) {
            console.log(JSON.stringify(data, null, 2));
        }
    }
};

// --- MOCK DATA (Fallback if DB is unreachable) ---
const MOCK_PRODUCTS = [
  {
    id: '1',
    sku: 'EL-3PH-001',
    name: 'SmartMeter Pro 3-Phase',
    category: 'ELECTRIC',
    manufacturer: 'SmartMeter',
    protocol: 'Modbus RTU',
    price: 450,
    currency: 'RON',
    stock_status: 'in_stock',
    image_url: 'https://picsum.photos/400/400?random=1',
    short_description: JSON.stringify({ ro: 'Contor electric trifazat industrial cu precizie clasa B.', en: 'Industrial 3-phase electric meter with Class B accuracy.' }),
    full_description: JSON.stringify({ ro: 'Acest contor inteligent trifazat este ideal pentru aplicații industriale și comerciale.', en: 'This smart 3-phase meter is ideal for industrial and commercial applications.' }),
    specs: JSON.stringify({ 'Voltaj': '3x230/400V', 'Frecvență': '50Hz', 'Precizie': 'Clasa B (1%)' })
  },
  {
    id: '2',
    sku: 'WT-DN20-002',
    name: 'AquaSmart Ultrasonic DN20',
    category: 'WATER',
    manufacturer: 'AquaTech',
    protocol: 'M-Bus',
    price: 320,
    currency: 'RON',
    stock_status: 'in_stock',
    image_url: 'https://picsum.photos/400/400?random=2',
    short_description: JSON.stringify({ ro: 'Apometru ultrasonic inteligent pentru apă rece.', en: 'Smart ultrasonic water meter for cold water.' }),
    full_description: JSON.stringify({ ro: 'Tehnologie ultrasonică pentru o precizie ridicată.', en: 'Ultrasonic technology for high accuracy.' }),
    specs: JSON.stringify({ 'Diametru': 'DN20', 'Temp. Max': '50°C', 'Presiune': 'PN16' })
  },
  {
    id: '3',
    sku: 'GS-G4-003',
    name: 'GasFlux G4 Smart',
    category: 'GAS',
    manufacturer: 'NoARK',
    protocol: 'Pulse',
    price: 850,
    currency: 'RON',
    stock_status: 'on_request',
    image_url: 'https://picsum.photos/400/400?random=3',
    short_description: JSON.stringify({ ro: 'Contor de gaz cu diafragmă și modul de comunicație.', en: 'Diaphragm gas meter with communication module.' }),
    full_description: JSON.stringify({ ro: 'Contor volumetric de gaz cu corecție de temperatură.', en: 'Volumetric gas meter with temperature correction.' }),
    specs: JSON.stringify({ 'Tip': 'G4', 'Presiune Max': '0.5 bar' })
  },
  {
    id: '4',
    sku: 'TH-HEAT-004',
    name: 'ThermoCompact Integral',
    category: 'THERMAL',
    manufacturer: 'Siemens',
    protocol: 'M-Bus',
    price: 680,
    currency: 'RON',
    stock_status: 'in_stock',
    image_url: 'https://picsum.photos/400/400?random=4',
    short_description: JSON.stringify({ ro: 'Contor de energie termică compact.', en: 'Compact thermal energy meter.' }),
    full_description: JSON.stringify({ ro: 'Unitate compactă pentru măsurarea energiei termice.', en: 'Compact unit for measuring thermal energy.' }),
    specs: JSON.stringify({ 'Senzori': 'Pt500', 'Baterie': '10 ani' })
  }
];

// ---------------------------

const app = express();
app.use(express.json());

// Logger Middleware
app.use((req, res, next) => {
    if (DEBUG_LEVEL > 0) {
        console.log(`[Request] ${req.method} ${req.url}`);
    }
    next();
});

// 1. Configurare Mediu
const envPath = path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });

// 2. Configurare Bază de Date (Connection Pool)
const dbHost = process.env.DB_HOST || 'localhost';
const dbConfig = {
    host: dbHost,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    connectTimeout: 5000 // Reduced timeout for faster fallback
};

const pool = mysql.createPool(dbConfig);
let IS_DB_CONNECTED = false;

// Helper pentru a testa conexiunea la pornire
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log(`[MySQL] Conexiune reușită la baza de date (${dbHost})!`);
        IS_DB_CONNECTED = true;
        connection.release();
    } catch (err) {
        console.warn('------------------------------------------------');
        console.warn(`[MySQL] ATENȚIE: Nu s-a putut conecta la baza de date (${dbHost}).`);
        console.warn(`Eroare: ${err.code} - ${err.message}`);
        console.warn('SERVERUL VA RULA ÎN "MOCK MODE" (Date simulate).');
        console.warn('------------------------------------------------');
        IS_DB_CONNECTED = false;
    }
})();

// 3. API Produse (Citire cu Filtre Dinamice)
app.get('/api/products', async (req, res) => {
    try {
        if (!IS_DB_CONNECTED) {
            // MOCK MODE RETURN
            logDebug('API_PRODUCTS', 'Serving MOCK data (DB disconnected)');
            const { category, manufacturer, protocol, search } = req.query;
            let filtered = [...MOCK_PRODUCTS];
            
            // Simple in-memory filtering for mock mode
            if (category && category !== 'ALL') filtered = filtered.filter(p => p.category === category);
            if (manufacturer && manufacturer !== 'ALL') filtered = filtered.filter(p => p.manufacturer === manufacturer);
            if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

            const mapped = filtered.map(p => ({
                ...p,
                shortDescription: JSON.parse(p.short_description),
                fullDescription: JSON.parse(p.full_description),
                specs: JSON.parse(p.specs),
                image: p.image_url,
                stockStatus: p.stock_status,
                datasheetUrl: null
            }));
            return res.json(mapped);
        }

        // REAL DB MODE
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
        res.status(500).json({ error: 'Server error loading products.' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        if (!IS_DB_CONNECTED) {
            const p = MOCK_PRODUCTS.find(x => x.id === req.params.id);
            if (!p) return res.status(404).json({ error: 'Produs inexistent (Mock)' });
            return res.json({
                ...p,
                shortDescription: JSON.parse(p.short_description),
                fullDescription: JSON.parse(p.full_description),
                specs: JSON.parse(p.specs),
                image: p.image_url,
                stockStatus: p.stock_status,
                datasheetUrl: null
            });
        }

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

// 3.5 API Discount Validation
app.get('/api/validate-discount', async (req, res) => {
    const { code } = req.query;
    // Mock Mode or Fallback
    if (!IS_DB_CONNECTED) {
        if (code === 'B2B10') return res.json({ code: 'B2B10', type: 'percent', value: 10 });
        if (code === 'WELCOME50') return res.json({ code: 'WELCOME50', type: 'fixed', value: 50 });
        return res.status(404).json({ error: 'Cod invalid' });
    }

    try {
        const [rows] = await pool.execute('SELECT code, type, value FROM discounts WHERE code = ? AND is_active = 1', [code]);
        if (rows.length > 0) res.json(rows[0]);
        else res.status(404).json({ error: 'Cod invalid sau expirat' });
    } catch (err) {
        // Fallback static codes if DB fails during query
        if (code === 'B2B10') res.json({ code: 'B2B10', type: 'percent', value: 10 });
        else res.status(500).json({ error: 'Eroare validare' });
    }
});

// 4. API Client Orders (Istoric Comenzi)
app.get('/api/my-orders', async (req, res) => {
    if (!IS_DB_CONNECTED) {
        return res.json([]); // Return empty list in mock mode
    }
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: 'Token missing' });
        
        const [orders] = await pool.execute('SELECT * FROM orders WHERE client_token = ? ORDER BY created_at DESC', [token]);
        for (let order of orders) {
            const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
            order.items = items;
            try {
                if(typeof order.billing_details === 'string') order.billing_details = JSON.parse(order.billing_details);
                if(typeof order.shipping_details === 'string') order.shipping_details = JSON.parse(order.shipping_details);
            } catch(e) {}
        }
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Eroare la preluarea comenzilor.' });
    }
});

// 5. API Comenzi (Tranzacțional)
app.post('/api/orders', async (req, res) => {
    const { email, billing, shipping, items, totals, order_notes, clientToken } = req.body;
    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    if (!IS_DB_CONNECTED) {
        // MOCK ORDER SUCCESS
        logDebug('API_ORDERS', 'Mock Order Received. Sending email only.');
        // Still try to send email in mock mode if SMTP is configured
        sendOrderEmail(orderNumber, req.body).catch(err => console.error("Mock Email Error:", err));
        return res.status(201).json({ success: true, orderNumber, message: 'Comanda a fost înregistrată (MOD SIMULARE).' });
    }

    const conn = await pool.getConnection();
    try {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await conn.beginTransaction();

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
            itemValues.push(orderId, item.id, item.name, item.sku, item.quantity, item.price, (item.price * item.quantity));
        });

        if (items.length > 0) {
            await conn.execute(
                `INSERT INTO order_items (order_id, product_id, product_name, sku, quantity, unit_price, total_price) VALUES ${placeholders}`,
                itemValues
            );
        }

        await conn.commit();
        
        sendOrderEmail(orderNumber, req.body).catch(err => console.error("Email error:", err));

        res.status(201).json({ success: true, orderNumber, message: 'Comanda a fost înregistrată.' });

    } catch (err) {
        await conn.rollback();
        console.error('[API Order] Transaction Error:', err);
        res.status(500).json({ error: 'Eroare la procesarea comenzii.' });
    } finally {
        conn.release();
    }
});

// 6. API Contact Form
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii.' });

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: 465,
            secure: true,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            tls: { rejectUnauthorized: false }
        });

        // Email content omitted for brevity, keeping existing structure...
        const htmlContent = `
        <div style="padding: 20px;">
            <h2>Mesaj Nou de pe SmartMeter.ro</h2>
            <p><strong>Nume:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Mesaj:</strong> ${message}</p>
        </div>`;

        const mailOptions = {
            from: `"SmartMeter Contact" <${process.env.SMTP_USER}>`,
            to: 'adrian.geanta@smartmeter.ro, office.git.brothers@gmail.com',
            replyTo: email,
            subject: `Mesaj Contact: ${name}`,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Mesajul a fost trimis.' });

    } catch (err) {
        console.error('[API Contact] Error:', err);
        // Even if email fails, if we are in mock mode, maybe just say success to UI
        if (!IS_DB_CONNECTED) return res.status(200).json({ success: true, message: 'Mesaj simulat (SMTP error).' });
        res.status(500).json({ error: 'Eroare la trimiterea mesajului.' });
    }
});

async function sendOrderEmail(orderNumber, data) {
    const { items, billing, shipping, totals, email, order_notes } = data;
    
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 465,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }
    });

    const productsHtml = items.map((item) => `
        <tr>
            <td>${item.name} <small>(${item.sku})</small></td>
            <td>${item.quantity}</td>
            <td>${item.price} RON</td>
            <td>${(item.price * item.quantity).toFixed(2)} RON</td>
        </tr>
    `).join('');

    const htmlContent = `
    <h1>Comandă Nouă #${orderNumber}</h1>
    <p>Client: ${billing.name} (${email})</p>
    <table border="1" cellpadding="5" cellspacing="0">
        <thead><tr><th>Produs</th><th>Cantitate</th><th>Preț</th><th>Total</th></tr></thead>
        <tbody>${productsHtml}</tbody>
    </table>
    <p><strong>Total: ${totals.total} RON</strong></p>
    `;

    const mailOptions = {
        from: `"Smart Meter Admin" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        subject: `Comandă Nouă #${orderNumber} - ${billing.name}`,
        html: htmlContent
    };

    await transporter.sendMail(mailOptions);
}

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Serverul SmartMeter rulează pe portul ${PORT}.`);
    console.log(`Mod de operare: ${IS_DB_CONNECTED ? 'ONLINE (Database)' : 'OFFLINE (Mock Data)'}`);
});