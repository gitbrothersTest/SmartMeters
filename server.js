
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');
const fs = require('fs');
const he = require('he');
const cors = require('cors');

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

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN || true,
    methods: ['GET', 'POST'],
    maxAge: 86400
}));
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));
app.use(express.json({ limit: '1mb' }));

// Email validation helper
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' }
});

const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // strict limit for orders and contact
    message: { error: 'Prea multe încercări. Vă rugăm să încercați mai târziu.' }
});

app.use('/api/', apiLimiter);

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

// --- SERVE EXTERNAL IMAGES (SMART RESOLVER) ---
const EXTERNAL_IMAGES_PATH = process.env.PRODUCT_IMAGES_PATH || '/home/smartmet/images/SmartMeters/Products';
const LOCAL_IMAGES_PATH = path.join(__dirname, 'public/images/products');

const normalizeImageUrl = (dbPath) => {
    if (!dbPath) return '';
    if (dbPath.startsWith('http')) return dbPath;
    if (dbPath.startsWith(EXTERNAL_IMAGES_PATH)) {
        return dbPath.replace(EXTERNAL_IMAGES_PATH, '/product-images');
    }
    if (!dbPath.startsWith('/product-images') && !dbPath.startsWith('/')) {
        return `/product-images/${dbPath}`;
    }
    return dbPath;
};

app.use('/product-images', (req, res, next) => {
    // SECURITY: Resolve the full path and verify it stays within allowed directories
    const decodedPath = decodeURIComponent(req.path);
    if (decodedPath.includes('..')) return res.status(403).send('Forbidden');

    if (path.extname(decodedPath)) {
        // Verify the resolved path stays within allowed image directories
        const resolvedExt = path.resolve(EXTERNAL_IMAGES_PATH, decodedPath.substring(1));
        const resolvedLocal = path.resolve(LOCAL_IMAGES_PATH, decodedPath.substring(1));
        if (!resolvedExt.startsWith(EXTERNAL_IMAGES_PATH) && !resolvedLocal.startsWith(LOCAL_IMAGES_PATH)) {
            return res.status(403).send('Forbidden');
        }
        return next();
    }
    const sku = decodedPath.substring(1);
    const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.PNG', '.JPG', '.JPEG', '.WEBP', '.GIF'];
    let foundPath = null;

    if (fs.existsSync(EXTERNAL_IMAGES_PATH)) {
        for (const ext of extensions) {
            const testPath = path.join(EXTERNAL_IMAGES_PATH, sku + ext);
            if (fs.existsSync(testPath) && fs.lstatSync(testPath).isFile()) {
                foundPath = testPath;
                break;
            }
        }
    }
    if (!foundPath && fs.existsSync(LOCAL_IMAGES_PATH)) {
        for (const ext of extensions) {
            const testPath = path.join(LOCAL_IMAGES_PATH, sku + ext);
            if (fs.existsSync(testPath) && fs.lstatSync(testPath).isFile()) {
                foundPath = testPath;
                break;
            }
        }
    }
    if (foundPath) return res.sendFile(foundPath);
    next();
});

if (fs.existsSync(EXTERNAL_IMAGES_PATH)) app.use('/product-images', express.static(EXTERNAL_IMAGES_PATH));
if (fs.existsSync(LOCAL_IMAGES_PATH)) app.use('/product-images', express.static(LOCAL_IMAGES_PATH));
else try { fs.mkdirSync(LOCAL_IMAGES_PATH, { recursive: true }); } catch (e) { }

// --- DATABASE CONNECTION STRATEGY ---
let pool;
const useTunnel = process.env.USE_HTTP_TUNNEL === 'true';

if (useTunnel) {
    console.log('[TUNNEL] Mod activ: HTTP TUNNELING');
    pool = {
        execute: async (sql, params) => {
            try {
                const response = await fetch(process.env.DB_TUNNEL_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Bridge-Secret': process.env.DB_TUNNEL_SECRET
                    },
                    body: JSON.stringify({ sql, params })
                });
                if (!response.ok) throw new Error(`Bridge Error (${response.status}): ${await response.text()}`);
                const result = await response.json();
                if (result.error) throw new Error(result.error);
                if (result.insertId !== undefined) {
                    return [{ insertId: result.insertId, affectedRows: result.affectedRows }, null];
                }
                return [result.rows || [], null];
            } catch (err) {
                console.error('[TUNNEL ERROR]', err.message);
                throw err;
            }
        },
        getConnection: async () => {
            // WARNING: HTTP tunnel mode does NOT support real transactions.
            // beginTransaction/commit/rollback are no-ops. Order atomicity
            // depends on the tunnel endpoint completing all queries.
            return {
                execute: async (sql, params) => pool.execute(sql, params),
                beginTransaction: async () => { },
                commit: async () => { },
                rollback: async () => { },
                release: () => { }
            };
        }
    };
} else {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        decimalNumbers: true,
        connectTimeout: 10000
    });
}

// API: Products
app.get('/api/products', async (req, res) => {
    try {
        const { category, manufacturer, protocol, search, include_inactive, stock_status } = req.query;
        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];

        if (include_inactive !== 'true') {
            query += ' AND is_active = 1';
        }

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

        if (stock_status) {
            const statuses = stock_status.split(',').filter(s => s.trim() !== '');
            if (statuses.length > 0) {
                const placeholders = statuses.map(() => '?').join(',');
                query += ` AND stock_status IN (${placeholders})`;
                params.push(...statuses);
            }
        }

        query += ' ORDER BY created_at DESC';
        const [rows] = await pool.execute(query, params);

        const safeJsonParse = (str, fallback = {}) => {
            if (typeof str !== 'string') return str || fallback;
            try { return JSON.parse(str); } catch (e) { return fallback; }
        };

        const products = rows.map(p => ({
            ...p,
            shortDescription: safeJsonParse(p.short_description, { ro: '', en: '' }),
            fullDescription: safeJsonParse(p.full_description, { ro: '', en: '' }),
            specs: safeJsonParse(p.specs, {}),
            image: normalizeImageUrl(p.image_url),
            stockStatus: p.stock_status,
            isActive: !!p.is_active,
            datasheetUrl: p.datasheet_url
        }));

        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Eroare la conexiunea cu baza de date.' });
    }
});

// API: Single Product
app.get('/api/products/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Produs inexistent' });

        const safeJsonParse = (str, fallback = {}) => {
            if (typeof str !== 'string') return str || fallback;
            try { return JSON.parse(str); } catch (e) { return fallback; }
        };

        const p = rows[0];
        const product = {
            ...p,
            shortDescription: safeJsonParse(p.short_description, { ro: '', en: '' }),
            fullDescription: safeJsonParse(p.full_description, { ro: '', en: '' }),
            specs: safeJsonParse(p.specs, {}),
            image: normalizeImageUrl(p.image_url),
            stockStatus: p.stock_status,
            isActive: !!p.is_active,
            datasheetUrl: p.datasheet_url
        };
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Eroare internă.' });
    }
});

// API: Validate Discount
app.get('/api/validate-discount', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT code, type, value FROM discounts WHERE code = ? AND is_active = 1', [req.query.code]);
        if (rows.length > 0) res.json(rows[0]);
        else res.status(404).json({ error: 'Cod invalid sau expirat' });
    } catch (err) {
        res.status(500).json({ error: 'Eroare validare DB' });
    }
});

// API: My Orders Summaries (by token or IP)
app.get('/api/order-history', async (req, res) => {
    try {
        const { token } = req.query;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const [orders] = await pool.execute(
            'SELECT order_number, created_at, final_total FROM orders WHERE client_token = ? OR client_ip = ? ORDER BY created_at DESC',
            [token || null, ip]
        );

        const summaries = orders.map(order => ({
            orderNumber: order.order_number,
            date: order.created_at,
            total: order.final_total
        }));

        res.json(summaries);
    } catch (err) {
        res.status(500).json({ error: 'Eroare la preluarea istoricului de comenzi.' });
    }
});


// API: Single Order Details (for optimized MyOrders page)
app.get('/api/order-details/:order_number', async (req, res) => {
    try {
        const { order_number } = req.params;
        const { token } = req.query;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // SECURITY: Verify ownership — same check as order-history
        const [orders] = await pool.execute(
            'SELECT * FROM orders WHERE order_number = ? AND (client_token = ? OR client_ip = ?)',
            [order_number, token || null, ip]
        );
        if (orders.length === 0) return res.status(404).json({ error: 'Comanda nu a fost gasita' });

        const order = orders[0];
        const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
        order.items = items;

        try {
            if (typeof order.billing_details === 'string') order.billing_details = JSON.parse(order.billing_details);
            if (typeof order.shipping_details === 'string') order.shipping_details = JSON.parse(order.shipping_details);
        } catch (e) { }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Eroare la preluarea detaliilor comenzii.' });
    }
});


// API: Create Order (SERVER-SIDE PRICE VALIDATION)
app.post('/api/orders', strictLimiter, async (req, res) => {
    const { email, billing, shipping, items, totals, order_notes, clientToken } = req.body;
    const tempOrderNumber = 'PENDING-' + Date.now();

    if (!email || !billing || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Date incomplete pentru comandă.' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Adresa de email nu este validă.' });
    }

    try {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // --- SERVER-SIDE PRICE VALIDATION ---
            const productIds = items.map(i => i.id);
            const placeholdersIds = productIds.map(() => '?').join(',');
            const [dbProducts] = await conn.execute(
                `SELECT id, price, name, sku FROM products WHERE id IN (${placeholdersIds}) AND is_active = 1`,
                productIds
            );

            const dbPriceMap = new Map();
            dbProducts.forEach(p => dbPriceMap.set(String(p.id), p));

            let serverSubtotal = 0;
            const validatedItems = [];
            for (const item of items) {
                const dbProduct = dbPriceMap.get(String(item.id));
                if (!dbProduct) {
                    await conn.rollback();
                    conn.release();
                    return res.status(400).json({ error: `Produsul "${item.name || item.id}" nu este disponibil.` });
                }
                const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
                const serverPrice = Number(dbProduct.price);
                serverSubtotal += serverPrice * qty;
                validatedItems.push({
                    id: dbProduct.id,
                    name: dbProduct.name,
                    sku: dbProduct.sku,
                    quantity: qty,
                    price: serverPrice
                });
            }

            // Re-validate discount server-side
            let serverDiscount = 0;
            let discountCode = null;
            if (totals && totals.discountCode) {
                const [discRows] = await conn.execute(
                    'SELECT code, type, value FROM discounts WHERE code = ? AND is_active = 1',
                    [totals.discountCode]
                );
                if (discRows.length > 0) {
                    const disc = discRows[0];
                    discountCode = disc.code;
                    serverDiscount = disc.type === 'percent'
                        ? (serverSubtotal * Number(disc.value)) / 100
                        : Number(disc.value);
                }
            }

            const serverTotal = Math.max(0, serverSubtotal - serverDiscount);

            const [orderResult] = await conn.execute(
                `INSERT INTO orders (order_number, client_token, client_ip, customer_email, billing_details, shipping_details, order_notes, subtotal, discount_code, discount_amount, final_total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
                [tempOrderNumber, clientToken, req.headers['x-forwarded-for'] || req.socket.remoteAddress, email, JSON.stringify(billing), JSON.stringify(shipping), order_notes || '', serverSubtotal, discountCode, serverDiscount, serverTotal]
            );

            const orderId = orderResult.insertId;
            const finalOrderNumber = `ORD-${new Date().getFullYear()}-${orderId.toString().padStart(6, '0')}`;
            await conn.execute('UPDATE orders SET order_number = ? WHERE id = ?', [finalOrderNumber, orderId]);

            if (validatedItems.length > 0) {
                const itemValues = [];
                const placeholders = validatedItems.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
                validatedItems.forEach(item => {
                    itemValues.push(orderId, item.id, item.name, item.sku, item.quantity, item.price, (item.price * item.quantity));
                });
                await conn.execute(`INSERT INTO order_items (order_id, product_id, product_name, sku, quantity, unit_price, total_price) VALUES ${placeholders}`, itemValues);
            }

            await conn.commit();

            // Build email data with server-validated totals
            const emailData = { ...req.body, items: validatedItems, totals: { subtotal: serverSubtotal, discount: serverDiscount, discountCode, total: serverTotal } };
            sendOrderEmail(finalOrderNumber, emailData).catch(err => console.error("Email error:", err));
            res.status(201).json({ success: true, orderNumber: finalOrderNumber, message: 'Comanda a fost înregistrată.' });

        } catch (err) {
            await conn.rollback();
            console.error('[ORDER ERROR]', err.message);
            res.status(500).json({ error: 'Eroare la procesarea comenzii.' });
        } finally {
            conn.release();
        }
    } catch (err) {
        res.status(500).json({ error: 'Nu se poate conecta la baza de date.' });
    }
});

// API: Contact
app.post('/api/contact', strictLimiter, async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        if (!name || !email || !message) return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii.' });
        if (!isValidEmail(email)) return res.status(400).json({ error: 'Adresa de email nu este validă.' });

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST, port: 465, secure: true,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' }
        });

        // SECURITY: Sanitize all user input before inserting into HTML
        const safeName = he.encode(name);
        const safeEmail = he.encode(email);
        const safePhone = he.encode(phone || 'N/A');
        const safeMessage = he.encode(message).replace(/\n/g, '<br>');

        const notificationEmails = process.env.NOTIFICATION_EMAILS || 'adrian.geanta@smartmeter.ro, office.git.brothers@gmail.com';

        const mailOptions = {
            from: `"SmartMeter Contact" <${process.env.SMTP_USER}>`,
            to: notificationEmails,
            replyTo: email, subject: `Mesaj Contact: ${safeName}`,
            html: `<div style="font-size: 18px;"><p>Nume: ${safeName}</p><p>Email: ${safeEmail}</p><p>Telefon: ${safePhone}</p><p>Mesaj:</p><blockquote>${safeMessage}</blockquote></div>`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Mesajul a fost trimis.' });

    } catch (err) {
        res.status(500).json({ error: 'Eroare la trimiterea mesajului.' });
    }
});

// ... rest of the file (sendOrderEmail, static serving, etc)
async function sendOrderEmail(orderNumber, data) {
    const { items, billing, shipping, totals, email, order_notes } = data;

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: 465, secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' }
    });

    const baseFontSize = "18px";

    // SECURITY: Sanitize all user-provided data before inserting into HTML
    const safeEmail = he.encode(email || '');
    const safeNotes = he.encode(order_notes || 'Nu există notite.');
    const safeBilling = {
        name: he.encode(billing.name || ''),
        company: he.encode(billing.company || '-'),
        address1: he.encode(billing.address1 || ''),
        city: he.encode(billing.city || ''),
        phone: he.encode(billing.phone || '')
    };
    const safeShipping = {
        name: he.encode(shipping.name || ''),
        company: he.encode(shipping.company || '-'),
        address1: he.encode(shipping.address1 || ''),
        city: he.encode(shipping.city || ''),
        phone: he.encode(shipping.phone || '')
    };

    const productsHtml = items.map((item) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px;"><div style="font-weight: bold; color: #0f172a; font-size: ${baseFontSize};">${he.encode(String(item.name))}</div><div style="font-size: 14px; color: #94a3b8;">SKU: ${he.encode(String(item.sku))}</div></td>
            <td style="padding: 12px; text-align: center; font-size: ${baseFontSize};">${Number(item.quantity)}</td>
            <td style="padding: 12px; text-align: right; font-size: ${baseFontSize};">${Number(item.price)} RON</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; font-size: ${baseFontSize};">${(Number(item.price) * Number(item.quantity)).toFixed(2)} RON</td>
        </tr>`).join('');

    const htmlContent = `<div style="font-family: sans-serif; background-color: #f5f5f5; padding: 20px;"><div style="max-width: 1000px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);"><div style="background-color: #0f172a; color: white; padding: 30px;"><h1 style="margin: 0; font-size: 28px;">Comandă Nouă #${he.encode(orderNumber)}</h1><p style="margin: 10px 0 0 0; opacity: 0.9; font-size: ${baseFontSize};">Data: ${new Date().toLocaleDateString('ro-RO')} | Status: <span style="color: #4ade80;">Comandă Primită (Nouă)</span></p></div><div style="padding: 30px; font-size: ${baseFontSize}; line-height: 1.6;"><div style="background-color: #fffbeb; border-left: 6px solid #d97706; padding: 20px; margin-bottom: 30px;"><h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 20px;">Contact & Notițe:</h3><p style="margin: 0 0 10px 0;"><strong>Email Client:</strong> <a href="mailto:${safeEmail}" style="color: #2563eb;">${safeEmail}</a></p><p style="margin: 0;"><strong>Notițe:</strong> ${safeNotes}</p></div><h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; font-size: 22px;">Produse din coș</h3><table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;"><thead style="background-color: #f1f5f9; color: #64748b; font-size: 14px; text-transform: uppercase;"><tr><th style="padding: 12px; text-align: left;">Produs</th><th style="padding: 12px; text-align: center;">Cantitate</th><th style="padding: 12px; text-align: right;">Preț Unitar</th><th style="padding: 12px; text-align: right;">Total</th></tr></thead><tbody>${productsHtml}</tbody></table><div style="text-align: right; margin-bottom: 40px; font-size: ${baseFontSize};"><p style="margin: 5px 0; color: #64748b;">Subtotal: ${Number(totals.subtotal)} RON</p>${Number(totals.discount) > 0 ? `<p style="margin: 5px 0; color: #16a34a;">Discount (${he.encode(String(totals.discountCode || ''))}): -${Number(totals.discount)} RON</p>` : ''}<h2 style="color: #059669; margin: 15px 0 0 0; font-size: 32px;">TOTAL FINAL: ${Number(totals.total)} RON</h2></div><h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; font-size: 22px;">Detalii Client</h3><table style="width: 100%; border-collapse: collapse; font-size: ${baseFontSize};"><thead style="background-color: #f1f5f9; text-align: left; font-size: 14px;"><tr><th style="padding: 12px;">Tip Adresă</th><th style="padding: 12px;">Nume</th><th style="padding: 12px;">Companie</th><th style="padding: 12px;">Adresă</th><th style="padding: 12px;">Oraș</th><th style="padding: 12px;">Telefon</th></tr></thead><tbody><tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 12px; font-weight: bold;">Facturare</td><td style="padding: 12px;">${safeBilling.name}</td><td style="padding: 12px;">${safeBilling.company}</td><td style="padding: 12px;">${safeBilling.address1}</td><td style="padding: 12px;">${safeBilling.city}</td><td style="padding: 12px;">${safeBilling.phone}</td></tr><tr><td style="padding: 12px; font-weight: bold;">Livrare</td><td style="padding: 12px;">${safeShipping.name}</td><td style="padding: 12px;">${safeShipping.company}</td><td style="padding: 12px;">${safeShipping.address1}</td><td style="padding: 12px;">${safeShipping.city}</td><td style="padding: 12px;">${safeShipping.phone}</td></tr></tbody></table></div><div style="background-color: #f8fafc; padding: 30px; text-align: center; color: #94a3b8; font-size: 14px; border-top: 1px solid #e2e8f0;"><p style="margin: 0;">Acest email a fost generat automat de SmartMeters.ro</p><p style="margin: 5px 0 0 0;">București, Romania | adrian.geanta@smartmeter.ro</p></div></div></div>`;

    const mailOptions = {
        from: `"Smart Meter Admin" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER, subject: `Comandă Nouă #${he.encode(orderNumber)} - ${safeBilling.name}`,
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
});
