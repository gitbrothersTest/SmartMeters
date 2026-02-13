const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
app.use(express.json());

// 1. Configurare Mediu
const envPath = path.join(__dirname, '.env');
const dotenvResult = require('dotenv').config({ path: envPath });

if (dotenvResult.error) {
    console.log(`[SmartMeters Log] INFO: Nu s-a găsit fișierul .env la calea: ${envPath}`);
    console.log(`[SmartMeters Log] Se vor folosi variabilele din interfața cPanel.`);
} else {
    console.log(`[SmartMeters Log] SUCCESS: Fișierul .env a fost încărcat de la: ${envPath}`);
}

// 2. Gestionare Contor Comenzi (Persistence)
const COUNTER_FILE = path.join(__dirname, 'order_counter.json');

function getNextOrderNumber() {
    let count = 1000; // Începem de la 1000 dacă nu există fișierul
    try {
        if (fs.existsSync(COUNTER_FILE)) {
            const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
            if (data && data.count) {
                count = data.count;
            }
        }
    } catch (err) {
        console.error("Eroare la citirea contorului:", err);
    }

    count++; // Incrementăm

    try {
        fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count: count }));
    } catch (err) {
        console.error("Eroare la salvarea contorului:", err);
    }

    return count;
}

// 3. Generator HTML Email Profesional
function generateOrderEmail(orderId, date, data) {
    const { items, billing, shipping, totals, order_notes, email } = data;
    
    // Helper pentru rânduri tabel produse
    const productsRows = items.map((item, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'}; border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px; font-size: 14px; color: #374151;">${item.name}<br><span style="font-size:11px; color:#6b7280;">SKU: ${item.sku}</span></td>
            <td style="padding: 12px; font-size: 14px; color: #374151; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; font-size: 14px; color: #374151; text-align: right;">${item.price} ${item.currency}</td>
            <td style="padding: 12px; font-size: 14px; font-weight: bold; color: #111827; text-align: right;">${(item.price * item.quantity).toFixed(2)} ${item.currency}</td>
        </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; color: #111827; }
            .container { max-width: 800px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .header { background-color: #0f172a; color: #ffffff; padding: 30px; text-align: left; }
            .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
            .header p { margin: 5px 0 0; font-size: 14px; color: #94a3b8; }
            .content { padding: 30px; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; color: #0f172a; }
            .info-grid { display: table; width: 100%; margin-bottom: 30px; border-collapse: collapse; }
            .info-col { display: table-cell; width: 50%; vertical-align: top; padding-right: 20px; }
            .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .data-table th { background-color: #f3f4f6; color: #4b5563; font-weight: 600; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
            .totals { text-align: right; margin-top: 20px; }
            .total-row { padding: 5px 0; font-size: 14px; color: #4b5563; }
            .total-final { font-size: 20px; font-weight: bold; color: #059669; margin-top: 10px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
            .badge { display: inline-block; padding: 4px 8px; background-color: #e0f2fe; color: #0369a1; border-radius: 4px; font-size: 12px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Comandă Nouă #${orderId}</h1>
                <p>Data: ${date} | Status: <span style="color:#4ade80;">În procesare</span></p>
            </div>
            <div class="content">
                
                <!-- Notes Section -->
                <div style="margin-bottom: 30px; background: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px;">
                    <strong style="color: #b45309; display: block; margin-bottom: 5px;">Contact & Notițe:</strong>
                    <div style="font-size: 14px; color: #78350f;">
                        <strong>Email Client:</strong> <a href="mailto:${email}">${email}</a><br>
                        ${order_notes ? `<strong>Notițe:</strong> ${order_notes}` : '<em>Fără notițe speciale.</em>'}
                    </div>
                </div>

                <!-- Products Table -->
                <div class="section-title">Produse din coș</div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th width="50%">Produs</th>
                            <th width="15%" style="text-align: center;">Cantitate</th>
                            <th width="15%" style="text-align: right;">Preț Unitar</th>
                            <th width="20%" style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productsRows}
                    </tbody>
                </table>

                <div class="totals">
                    <div class="total-row">Subtotal: <strong>${totals.subtotal} RON</strong></div>
                    ${totals.discount > 0 ? `<div class="total-row" style="color: #dc2626;">Discount (${totals.discountCode}): <strong>-${totals.discount} RON</strong></div>` : ''}
                    <div class="total-final">TOTAL FINAL: ${totals.total} RON</div>
                </div>

                <div style="height: 30px;"></div>

                <!-- Addresses Grid (Mimicking the screenshot layout) -->
                <div class="section-title">Detalii Client</div>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e5e7eb;">
                    <thead style="background: #f8fafc;">
                        <tr>
                            <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Tip Adresă</th>
                            <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Nume</th>
                            <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Companie</th>
                            <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Adresă</th>
                            <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Oraș</th>
                            <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Telefon</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Facturare</td>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">${billing.name}</td>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">${billing.company || '-'}</td>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">${billing.address1} ${billing.address2 ? '<br>' + billing.address2 : ''}</td>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">${billing.city}, ${billing.postcode}<br>${billing.country}</td>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">${billing.phone}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Livrare</td>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">${shipping.name}</td>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">${shipping.company || '-'}</td>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">${shipping.address1} ${shipping.address2 ? '<br>' + shipping.address2 : ''}</td>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">${shipping.city}, ${shipping.postcode}<br>${shipping.country}</td>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">${shipping.phone}</td>
                        </tr>
                    </tbody>
                </table>

            </div>
            <div class="footer">
                <p>Acest email a fost generat automat de SmartMeters.ro</p>
                <p>București, Romania | adrian.geanta@smartmeter.ro</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

// 4. Servirea fișierelor statice
app.use(express.static(path.join(__dirname, 'dist')));

// 5. Ruta API actualizată
app.post('/api/trimite-comanda', async (req, res) => {
    const data = req.body;
    
    // Configurare SMTP
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
        return res.status(500).json({ success: false, error: 'Configurare SMTP incompletă.' });
    }

    let transporter = nodemailer.createTransport({
        host: smtpHost,
        port: 465,
        secure: true,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false }
    });

    // Generăm număr comandă unic
    const orderId = getNextOrderNumber();
    const dateStr = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    // Generăm HTML-ul
    const htmlEmail = generateOrderEmail(orderId, dateStr, data);

    const mailOptions = {
        from: `"Smart Meters Comenzi" <${smtpUser}>`, 
        to: smtpUser, // Trimitem către admin
        replyTo: data.email, 
        subject: `Comandă Nouă #${orderId} - ${data.billing.name}`,
        html: htmlEmail // Folosim HTML
    };

    try {
        await transporter.verify();
        await transporter.sendMail(mailOptions);
        console.log(`[SUCCESS] Comanda #${orderId} trimisă cu succes.`);
        res.status(200).json({ success: true, message: 'Comanda a fost trimisă!', orderId: orderId });
    } catch (err) {
        console.error('[EROARE SMTP]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Fallback SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serverul SmartMeters rulează pe portul ${PORT}`);
});