const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');
const fs = require('fs');

// --- DEBUG CONFIGURATION ---
// STRICTLY retrieved from environment. Default to 0 (OFF).
const DEBUG_LEVEL = parseInt(process.env.DEBUG_LEVEL || '0', 10);

const logDebug = (section, message, data = null) => {
    if (DEBUG_LEVEL > 0) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [DEBUG] [${section}] ${message}`);
        if (data && DEBUG_LEVEL > 1) {
            // Level 2 includes data dumping
            console.log(JSON.stringify(data, null, 2));
        }
    }
};
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
const dotenvResult = require('dotenv').config({ path: envPath });

if (dotenvResult.error) {
    console.log(`[SmartMeter Log] INFO: Nu s-a găsit fișierul .env. Se folosesc variabilele de mediu existente.`);
} else {
    logDebug('CONFIG', '.env file loaded successfully.');
}

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
    connectTimeout: 10000 // 10 seconds timeout
};

// Security: Never log the password even in debug mode
const safeDbConfig = { ...dbConfig, password: '***REDACTED***' };
logDebug('DATABASE', 'Initializing pool with config:', safeDbConfig);

const pool = mysql.createPool(dbConfig);

// Helper pentru a testa conexiunea la pornire
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log(`[MySQL] Conexiune reușită la baza de date (${dbHost})!`);
        logDebug('DATABASE', 'Initial connection test passed.');
        connection.release();
    } catch (err) {
        console.error('------------------------------------------------');
        console.error('[MySQL] EROARE CRITICĂ LA CONECTARE:');
        console.error(`Host: ${dbHost}`);
        console.error(`Mesaj: ${err.message}`);
        
        if (err.code === 'ECONNREFUSED' && (dbHost === 'localhost' || dbHost === '127.0.0.1')) {
            console.error('\n[SUGESTIE] Încercați să vă conectați la localhost dar nu aveți un server MySQL pornit local.');
            console.error('Dacă vreți să vă conectați la cPanel, schimbați DB_HOST în .env cu IP-ul serverului.');
        } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
            console.error('\n[SUGESTIE] Serverul respinge conexiunea.');
            console.error('1. Verificați dacă ați adăugat IP-ul dvs. în cPanel -> Remote MySQL.');
            console.error('2. Verificați dacă portul 3306 este deschis.');
        } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n[SUGESTIE] User sau parolă greșită.');
        }

        if (DEBUG_LEVEL > 0) console.error(err.stack);
        console.error('------------------------------------------------');
    }
})();

// 3. API Produse (Citire cu Filtre Dinamice)
app.get('/api/products', async (req, res) => {
    try {
        const { category, manufacturer, protocol, search } = req.query;
        logDebug('API_PRODUCTS', 'Fetching products with filters:', { category, manufacturer, protocol, search });
        
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

        logDebug('API_PRODUCTS', 'Executing Query:', query);

        const [rows] = await pool.execute(query, params);
        logDebug('API_PRODUCTS', `Found ${rows.length} products.`);

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
        if (DEBUG_LEVEL > 0) console.error(err.stack);
        res.status(500).json({ error: 'Eroare server la încărcarea produselor. Verificați conexiunea la baza de date.' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        logDebug('API_PRODUCTS', `Fetching details for product ID: ${req.params.id}`);
        const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            logDebug('API_PRODUCTS', 'Product not found');
            return res.status(404).json({ error: 'Produs inexistent' });
        }

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
        logDebug('API_PRODUCTS', 'Error fetching product details', err);
        res.status(500).json({ error: err.message });
    }
});

// 3.5 API Discount Validation
app.get('/api/validate-discount', async (req, res) => {
    try {
        const { code } = req.query;
        logDebug('API_DISCOUNT', `Validating code: ${code}`);
        
        if (!code) return res.status(400).json({ error: 'Cod lipsă' });

        // Presupunem tabela 'discounts' cu coloanele: code, type ('percent'|'fixed'), value, is_active
        const [rows] = await pool.execute(
            'SELECT code, type, value FROM discounts WHERE code = ? AND is_active = 1', 
            [code]
        );

        if (rows.length > 0) {
            logDebug('API_DISCOUNT', 'Code valid', rows[0]);
            res.json(rows[0]);
        } else {
            logDebug('API_DISCOUNT', 'Code invalid or expired');
            res.status(404).json({ error: 'Cod invalid sau expirat' });
        }
    } catch (err) {
        console.error('[API Discount] Error:', err);
        // Fallback pentru demo dacă nu există tabela
        logDebug('API_DISCOUNT', 'DB Check failed, falling back to static codes for demo.');
        if (code === 'B2B10') res.json({ code: 'B2B10', type: 'percent', value: 10 });
        else if (code === 'WELCOME50') res.json({ code: 'WELCOME50', type: 'fixed', value: 50 });
        else res.status(500).json({ error: 'Eroare la validarea codului.' });
    }
});

// 4. API Client Orders (Istoric Comenzi)
app.get('/api/my-orders', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: 'Token missing' });
        
        logDebug('API_MY_ORDERS', `Fetching orders for token: ${token.substring(0, 5)}...`);

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
            } catch(e) {
                logDebug('API_MY_ORDERS', 'Error parsing JSON details', e);
            }
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

        logDebug('API_ORDERS', 'Received new order request', { email, total: totals.total, itemCount: items.length });

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
        logDebug('API_ORDERS', `Order created in DB with ID: ${orderId}, Number: ${orderNumber}`);

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
        logDebug('API_ORDERS', 'Transaction committed successfully.');

        // RE-ENABLED EMAIL SENDING TO ADMIN ONLY
        // Asynchronously send email to avoid blocking the response
        sendOrderEmail(orderNumber, req.body).catch(err => {
            console.error("Email error:", err);
            logDebug('API_ORDERS', 'Email sending failed', err);
        });

        res.status(201).json({ success: true, orderNumber, message: 'Comanda a fost înregistrată.' });

    } catch (err) {
        await conn.rollback();
        console.error('[API Order] Transaction Error:', err);
        logDebug('API_ORDERS', 'Transaction rolled back due to error', err);
        res.status(500).json({ error: 'Eroare la procesarea comenzii.' });
    } finally {
        conn.release();
    }
});

// 6. API Contact Form
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        logDebug('API_CONTACT', `Received contact message from ${email}`);

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii.' });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: 465,
            secure: true,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            tls: { rejectUnauthorized: false }
        });

        // Email content
        const htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border-top: 4px solid #0f172a;">
                <h2 style="color: #0f172a; margin-top: 0;">Mesaj Nou de pe SmartMeter.ro</h2>
                <div style="margin: 20px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
                    <p><strong>Nume:</strong> ${name}</p>
                    <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                </div>
                <div>
                    <p style="font-weight: bold; color: #334155;">Mesaj:</p>
                    <p style="white-space: pre-wrap; color: #475569;">${message}</p>
                </div>
                <div style="margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center;">
                    Acest mesaj a fost trimis prin formularul de contact de pe site.
                </div>
            </div>
        </div>
        `;

        const mailOptions = {
            from: `"SmartMeter Contact" <${process.env.SMTP_USER}>`,
            to: 'adrian.geanta@smartmeter.ro, office.git.brothers@gmail.com', // Send to both
            replyTo: email,
            subject: `Mesaj Contact: ${name}`,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Email] Contact form message sent from ${email}`);
        logDebug('API_CONTACT', 'Email dispatched successfully.');

        res.status(200).json({ success: true, message: 'Mesajul a fost trimis.' });

    } catch (err) {
        console.error('[API Contact] Error:', err);
        logDebug('API_CONTACT', 'Failed to send email', err);
        res.status(500).json({ error: 'Eroare la trimiterea mesajului.' });
    }
});

async function sendOrderEmail(orderNumber, data) {
    const { items, billing, shipping, totals, email, order_notes } = data;
    logDebug('EMAIL_SERVICE', `Preparing order email for #${orderNumber}`);
    
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 465,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }
    });

    // 1. Products HTML Rows
    const productsHtml = items.map((item, index) => `
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 12px;">
                <div style="font-weight: bold; color: #1e293b;">${item.name}</div>
                <div style="font-size: 11px; color: #94a3b8; font-family: monospace;">SKU: ${item.sku}</div>
            </td>
            <td style="padding: 12px; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; text-align: right;">${item.price} RON</td>
            <td style="padding: 12px; text-align: right; font-weight: bold;">${(item.price * item.quantity).toFixed(2)} RON</td>
        </tr>
    `).join('');

    // 2. Client Details Table (Facturare vs Livrare)
    const clientTableHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; border: 1px solid #e2e8f0;">
        <thead>
            <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Tip Adresă</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Nume</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Companie</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Adresă</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Oraș</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Telefon</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight:bold;">Facturare</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${billing.name}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${billing.company || '-'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${billing.address1} ${billing.address2 ? ', ' + billing.address2 : ''}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${billing.city}, ${billing.postcode}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${billing.phone}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight:bold;">Livrare</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${shipping.name}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${shipping.company || '-'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${shipping.address1} ${shipping.address2 ? ', ' + shipping.address2 : ''}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${shipping.city}, ${shipping.postcode}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${shipping.phone}</td>
            </tr>
        </tbody>
    </table>
    `;

    // 3. Full Layout (Based on Screenshot)
    const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <!-- HEADER (Black background, white text) -->
            <div style="background-color: #0f172a; padding: 25px; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Comandă Nouă #${orderNumber}</h1>
                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">
                    Data: ${new Date().toLocaleDateString('ro-RO')} | Status: <span style="color: #4ade80; font-weight: bold;">În procesare</span>
                </p>
            </div>

            <div style="padding: 30px;">
                
                <!-- CONTACT & NOTES BOX (Yellow/Orange) -->
                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                    <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: bold;">Contact & Notițe:</h3>
                    <p style="margin: 5px 0; font-size: 14px;">
                        <span style="color: #92400e; font-weight: bold;">Email Client:</span> 
                        <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
                    </p>
                    <p style="margin: 5px 0; font-size: 14px;">
                        <span style="color: #92400e; font-weight: bold;">Notițe:</span> ${order_notes || 'N/A'}
                    </p>
                </div>

                <!-- PRODUCT TABLE -->
                <h3 style="font-size: 18px; color: #1e293b; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Produse din coș</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f1f5f9; color: #64748b; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">
                            <th style="padding: 10px; text-align: left;">PRODUS</th>
                            <th style="padding: 10px; text-align: center;">CANTITATE</th>
                            <th style="padding: 10px; text-align: right;">PREȚ UNITAR</th>
                            <th style="padding: 10px; text-align: right;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productsHtml}
                    </tbody>
                </table>

                <!-- TOTALS -->
                <div style="margin-top: 20px; text-align: right;">
                    ${totals.discount > 0 ? `
                        <p style="margin: 5px 0; font-size: 14px; color: #64748b;">Preț înainte de reducere: ${totals.subtotal} RON</p>
                        <div style="margin: 5px 0; font-size: 14px; padding: 5px; background-color: #f0fdf4; display: inline-block; border-radius: 4px;">
                            <span style="color: #15803d; font-weight: bold;">Reducere aplicată (${totals.discountCode}):</span> 
                            <span style="color: #16a34a;">-${totals.discount} RON</span>
                        </div>
                        <div style="font-size: 24px; font-weight: bold; color: #059669; margin-top: 10px; border-top: 2px solid #e2e8f0; padding-top: 10px;">
                            TOTAL FINAL (după reducere): ${totals.total} RON
                        </div>
                    ` : `
                        <p style="margin: 5px 0; font-size: 14px; color: #64748b;">Subtotal: ${totals.subtotal} RON</p>
                        <div style="font-size: 24px; font-weight: bold; color: #0f172a; margin-top: 10px; border-top: 2px solid #e2e8f0; padding-top: 10px;">
                            TOTAL FINAL: ${totals.total} RON
                        </div>
                    `}
                </div>

                <!-- CLIENT DETAILS -->
                <div style="margin-top: 40px;">
                    <h3 style="font-size: 18px; color: #1e293b; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Detalii Client</h3>
                    ${clientTableHtml}
                </div>

            </div>

            <!-- FOOTER -->
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0;">Acest email a fost generat automat de SmartMeter.ro</p>
                <p style="margin: 5px 0;">București, Romania | adrian.geanta@smartmeter.ro</p>
            </div>
        </div>
    </div>
    `;

    const mailOptions = {
        from: `"Smart Meter Admin" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER, // SEND ONLY TO ADMIN
        // NO CC to client, as requested
        subject: `Comandă Nouă #${orderNumber} - ${billing.name}`,
        html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email] Notification sent to ADMIN for order ${orderNumber}`);
    logDebug('EMAIL_SERVICE', `Email successfully sent for #${orderNumber}`);
}

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Changed default port to 3001 to prevent conflict with Vite (3000)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Serverul SmartMeter rulează pe portul ${PORT} cu MySQL Pool.`);
    logDebug('SERVER', `Server started on port ${PORT}`);
});