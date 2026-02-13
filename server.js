const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
// Încercăm să încărcăm .env dacă există local
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. Servirea fișierelor statice (Frontend-ul tău Vite)
app.use(express.static(path.join(__dirname, 'dist')));

// 2. Ruta pentru trimiterea email-ului de comandă
app.post('/api/trimite-comanda', async (req, res) => {
    const d = req.body;
    
    // Debugging: Verificăm dacă variabilele există (fără a afișa parola în clar)
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    console.log(`[SMTP Debug] Host: ${smtpHost}, User: ${smtpUser}, Pass: ${smtpPass ? 'EXISTĂ' : 'LIPSEȘTE'}`);

    if (!smtpHost || !smtpUser || !smtpPass) {
        console.error('EROARE: Variabilele de mediu SMTP nu sunt setate corect.');
        return res.status(500).json({ 
            success: false, 
            error: 'Eroare Server: Datele de logare email (SMTP) lipsesc. Verificați configurarea în cPanel.' 
        });
    }

    // Configurare transportator email
    let transporter = nodemailer.createTransport({
        host: smtpHost,
        port: 465,
        secure: true, // SSL pe portul 465
        auth: { 
            user: smtpUser, 
            pass: smtpPass 
        },
        tls: {
            // Necesită rejectUnauthorized: false pe unele servere shared hosting
            rejectUnauthorized: false
        }
    });

    const mailOptions = {
        from: `"Smart Meters" <${smtpUser}>`, // Folosim userul autentificat ca expeditor
        to: 'adrian.geanta@smartmeter.ro', // Destinatarul (tu)
        replyTo: d.email, // Când dai Reply, răspunzi clientului
        subject: `Comandă Nouă B2B - ${d.billing_name || 'Client'}`,
        text: `Detaliile Comenzii:
-------------------------
Nume Client: ${d.billing_name}
Email Client: ${d.email}
Total Comandă: ${d.final_total} RON

DETALII COMPLETE:
${d.order_notes}
`
    };

    try {
        await transporter.verify(); // Verifică conexiunea înainte de trimitere
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Comanda a fost trimisă!' });
    } catch (err) {
        console.error('Eroare SMTP la trimitere:', err);
        // Trimitem mesajul de eroare specific către frontend
        res.status(500).json({ success: false, error: err.message || 'Eroare necunoscută la serverul de mail' });
    }
});

// 3. Fallback pentru SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Aplicația rulează pe portul ${PORT}`);
});