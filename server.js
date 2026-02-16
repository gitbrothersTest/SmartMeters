
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

// --- SERVE EXTERNAL IMAGES (SMART RESOLVER) ---
// Priority 1: Path from .env
// Priority 2: Hardcoded Production Path
const EXTERNAL_IMAGES_PATH = process.env.PRODUCT_IMAGES_PATH || '/home/smartmet/images/SmartMeters/Products';
const LOCAL_IMAGES_PATH = path.join(__dirname, 'public/images/products');

// Helper to convert DB absolute path to Web URL
const normalizeImageUrl = (dbPath) => {
    if (!dbPath) return '';
    
    // If it's already a web URL (http/https), leave it
    if (dbPath.startsWith('http')) return dbPath;

    // If it's the absolute server path, replace it with the web alias
    if (dbPath.startsWith(EXTERNAL_IMAGES_PATH)) {
        return dbPath.replace(EXTERNAL_IMAGES_PATH, '/product-images');
    }
    
    // If it's already a relative path but misses the alias (fallback)
    if (!dbPath.startsWith('/product-images') && !dbPath.startsWith('/')) {
        return `/product-images/${dbPath}`;
    }

    return dbPath;
};

// Middleware to find image with extension if URL doesn't have one
app.use('/product-images', (req, res, next) => {
    // Safety check: prevent directory traversal
    if (req.path.includes('..')) return res.status(403).send('Forbidden');

    // If the path already has an extension, let express.static handle it or 404
    if (path.extname(req.path)) {
        return next();
    }

    // SKU is the path without the leading slash
    const sku = req.path.substring(1); 
    // Updated extensions list to include uppercase variations for Linux case sensitivity
    const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.PNG', '.JPG', '.JPEG', '.WEBP', '.GIF'];
    
    let foundPath = null;

    // 1. Check External Path
    if (fs.existsSync(EXTERNAL_IMAGES_PATH)) {
        for (const ext of extensions) {
            const testPath = path.join(EXTERNAL_IMAGES_PATH, sku + ext);
            if (fs.existsSync(testPath) && fs.lstatSync(testPath).isFile()) {
                foundPath = testPath;
                break;
            }
        }
    }
    
    // 2. Check Local Development Path if not found externally
    if (!foundPath && fs.existsSync(LOCAL_IMAGES_PATH)) {
        for (const ext of extensions) {
            const testPath = path.join(LOCAL_IMAGES_PATH, sku + ext);
            if (fs.existsSync(testPath) && fs.lstatSync(testPath).isFile()) {
                foundPath = testPath;
                break;
            }
        }
    }

    if (foundPath) {
        if (DEBUG_LEVEL > 0) console.log(`[Image Resolver] Found: ${sku} -> ${foundPath}`);
        return res.sendFile(foundPath);
    } else {
        if (DEBUG_LEVEL > 0) console.log(`[Image Resolver] MISSING: ${sku} (Checked: ${EXTERNAL_IMAGES_PATH} & ${LOCAL_IMAGES_PATH})`);
    }

    next();
});

// Serve static directories if they exist (for direct access with extension)
if (fs.existsSync(EXTERNAL_IMAGES_PATH)) {
    console.log(`[Server] Serving external images from: ${EXTERNAL_IMAGES_PATH}`);
    app.use('/product-images', express.static(EXTERNAL_IMAGES_PATH));
}

if (fs.existsSync(LOCAL_IMAGES_PATH)) {
    console.log(`[Server] Serving local images from: ${LOCAL_IMAGES_PATH}`);
    app.use('/product-images', express.static(LOCAL_IMAGES_PATH));
} else {
    // Create the directory if it doesn't exist (helpful for dev)
    try {
        fs.mkdirSync(LOCAL_IMAGES_PATH, { recursive: true });
        console.log(`[Server] Created local image directory: ${LOCAL_IMAGES_PATH}`);
    } catch(e) {
        console.error(`[Server] Could not create local image directory: ${e.message}`);
    }
}

// --- DATABASE CONNECTION STRATEGY ---
let pool;
const useTunnel = process.env.USE_HTTP_TUNNEL === 'true';

if (useTunnel) {
    console.log('------------------------------------------------');
    console.log('[TUNNEL] Mod activ: HTTP TUNNELING');
    console.log(`[TUNNEL] Target: ${process.env.DB_TUNNEL_URL}`);
    console.log('------------------------------------------------');

    // Tunnel Adapter: Mimics the mysql2 pool interface but uses fetch to talk to PHP
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

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Bridge Error (${response.status}): ${text}`);
                }

                const result = await response.json();
                if (result.error) throw new Error(result.error);

                // Mimic mysql2 return format: [rows, fields] (we omit fields for now)
                // If it's an insert, structure it properly
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
            // In HTTP Tunnel mode, we don't have real persistent connections or transactions.
            // We return a dummy object that just executes queries directly.
            // WARNING: Transactions (beginTransaction/commit) are NO-OPs here. 
            // Data integrity isn't guaranteed if a multi-step order fails halfway, 
            // but this is acceptable for local development.
            return {
                execute: async (sql, params) => pool.execute(sql, params),
                beginTransaction: async () => logDebug('TUNNEL', 'Fake Transaction Started'),
                commit: async () => logDebug('TUNNEL', 'Fake Transaction Committed'),
                rollback: async () => logDebug('TUNNEL', 'Fake Transaction Rolled Back'),
                release: () => {}
            };
        }
    };
} else {
    // Standard MySQL Connection
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
        connectTimeout: 10000 
    };

    pool = mysql.createPool(dbConfig);
    
    // Test connection
    (async () => {
        try {
            const connection = await pool.getConnection();
            console.log(`[MySQL] Conexiune reușită la baza de date (${dbHost})!`);
            connection.release();
        } catch (err) {
            console.error('------------------------------------------------');
            console.error(`[MySQL] EROARE FATALĂ: Nu s-a putut conecta la baza de date (${dbHost}).`);
            console.error(`Eroare: ${err.code} - ${err.message}`);
            console.error('------------------------------------------------');
        }
    })();
}

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
            image: normalizeImageUrl(p.image_url), // Apply URL normalization here
            stockStatus: p.stock_status,
            datasheetUrl: p.datasheet_url
        }));

        res.json(products);
    } catch (err) {
        console.error('[API Products] Error:', err);
        res.status(500).json({ error: 'Eroare la conexiunea cu baza de date.' });
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
            image: normalizeImageUrl(p.image_url), // Apply URL normalization here
            stockStatus: p.stock_status,
            datasheetUrl: p.datasheet_url
        };
        res.json(product);
    } catch (err) {
        console.error('[API Product Detail] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3.5 API Discount Validation
app.get('/api/validate-discount', async (req, res) => {
    const { code } = req.query;
    try {
        const [rows] = await pool.execute('SELECT code, type, value FROM discounts WHERE code = ? AND is_active = 1', [code]);
        if (rows.length > 0) res.json(rows[0]);
        else res.status(404).json({ error: 'Cod invalid sau expirat' });
    } catch (err) {
        console.error('[API Discount] Error:', err);
        res.status(500).json({ error: 'Eroare validare DB' });
    }
});

// 4. API Client Orders (Istoric Comenzi)
app.get('/api/my-orders', async (req, res) => {
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
        console.error('[API My Orders] Error:', err);
        res.status(500).json({ error: 'Eroare la preluarea comenzilor.' });
    }
});

// 5. API Comenzi (Tranzacțional)
app.post('/api/orders', async (req, res) => {
    const { email, billing, shipping, items, totals, order_notes, clientToken } = req.body;
    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
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

            // In MySQL2 standard, insertId is on the result object. In our tunnel wrapper, we return [{insertId: ...}]
            // We need to handle both cases gracefully or ensure wrapper matches perfectly.
            const orderId = orderResult.insertId || orderResult[0]?.insertId; 

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
            
            // Trimite email asincron (nu bloca răspunsul)
            sendOrderEmail(orderNumber, req.body).catch(err => console.error("Email error:", err));

            res.status(201).json({ success: true, orderNumber, message: 'Comanda a fost înregistrată.' });

        } catch (err) {
            await conn.rollback();
            console.error('[API Order] Transaction Error:', err);
            res.status(500).json({ error: 'Eroare la procesarea comenzii (Transaction Rollback).' });
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error('[API Order] Connection Error:', err);
        res.status(500).json({ error: 'Nu se poate conecta la baza de date.' });
    }
});

// 6. API Contact Form
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        if (!name || !email || !message) return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii.' });

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: 465,
            secure: true,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            tls: { rejectUnauthorized: false }
        });

        const htmlContent = `
        <div style="padding: 20px;">
            <h2>Mesaj Nou de pe SmartMeter.ro</h2>
            <p><strong>Nume:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Telefon:</strong> ${phone || 'N/A'}</p>
            <p><strong>Mesaj:</strong></p>
            <blockquote style="background-color: #f5f5f5; padding: 10px; border-left: 4px solid #0f172a;">
                ${message.replace(/\n/g, '<br>')}
            </blockquote>
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
        res.status(500).json({ error: 'Eroare la trimiterea mesajului (SMTP).' });
    }
});

// 7. API Admin: Import/Sync Products from JSON
app.post('/api/admin/import-products', async (req, res) => {
    try {
        const productsFile = path.join(__dirname, 'products_import.json');
        if (!fs.existsSync(productsFile)) {
            return res.status(404).json({ error: 'products_import.json not found on server' });
        }

        const fileContent = fs.readFileSync(productsFile, 'utf-8');
        const products = JSON.parse(fileContent);

        console.log(`[Import] Found ${products.length} products to sync.`);

        const upsertQuery = `
            INSERT INTO products 
            (sku, name, category, manufacturer, series, mounting, protocol, max_capacity, price, currency, stock_status, image_url, datasheet_url, short_description, full_description, specs)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            category = VALUES(category),
            manufacturer = VALUES(manufacturer),
            series = VALUES(series),
            mounting = VALUES(mounting),
            protocol = VALUES(protocol),
            max_capacity = VALUES(max_capacity),
            price = VALUES(price),
            currency = VALUES(currency),
            stock_status = VALUES(stock_status),
            image_url = VALUES(image_url),
            datasheet_url = VALUES(datasheet_url),
            short_description = VALUES(short_description),
            full_description = VALUES(full_description),
            specs = VALUES(specs),
            updated_at = CURRENT_TIMESTAMP
        `;

        let updatedCount = 0;

        for (const p of products) {
            const params = [
                p.sku,
                p.name,
                p.category,
                p.manufacturer,
                p.series || null,
                p.mounting || null,
                p.protocol || null,
                p.max_capacity || null,
                p.price,
                p.currency,
                p.stock_status,
                p.image_url,
                p.datasheet_url,
                JSON.stringify(p.short_description),
                JSON.stringify(p.full_description),
                JSON.stringify(p.specs)
            ];

            await pool.execute(upsertQuery, params);
            updatedCount++;
        }

        res.json({ success: true, message: `Successfully synced ${updatedCount} products.` });

    } catch (err) {
        console.error('[API Import] Error:', err);
        res.status(500).json({ error: err.message });
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
    console.log(`Mod de operare: ${useTunnel ? 'TUNNEL (via PHP Bridge)' : 'DIRECT (MySQL Port 3306)'}`);
});
