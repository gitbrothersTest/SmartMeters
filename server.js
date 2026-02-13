const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// 1. Configurare Mediu (Environment)
// Încercăm să încărcăm fișierul .env și logăm rezultatul pentru debugging în cPanel (stderr.log)
const envPath = path.join(__dirname, '.env');
const dotenvResult = require('dotenv').config({ path: envPath });

if (dotenvResult.error) {
    console.log(`[SmartMeters Log] INFO: Nu s-a găsit fișierul .env la calea: ${envPath}`);
    console.log(`[SmartMeters Log] Se vor folosi variabilele din interfața cPanel (Environment Variables).`);
} else {
    console.log(`[SmartMeters Log] SUCCESS: Fișierul .env a fost încărcat de la: ${envPath}`);
}

// 2. Servirea fișierelor statice (Frontend-ul tău Vite)
app.use(express.static(path.join(__dirname, 'dist')));

// 3. Ruta pentru trimiterea email-ului de comandă
app.post('/api/trimite-comanda', async (req, res) => {
    const d = req.body;
    
    // Configurare SMTP - Citire exclusivă din variabilele de mediu
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Logăm statusul configurării (FĂRĂ A AFIȘA PAROLA)
    console.log('--- ÎNCERCARE TRIMITERE EMAIL ---');
    console.log(`Host: ${smtpHost ? smtpHost : 'LIPSEȘTE'}`);
    console.log(`User: ${smtpUser ? smtpUser : 'LIPSEȘTE'}`);
    console.log(`Pass: ${smtpPass ? 'PREZENTĂ' : 'LIPSEȘTE'}`);

    // Validare strictă: Dacă lipsește orice variabilă, oprim execuția
    if (!smtpHost || !smtpUser || !smtpPass) {
        const missingVars = [];
        if (!smtpHost) missingVars.push('SMTP_HOST');
        if (!smtpUser) missingVars.push('SMTP_USER');
        if (!smtpPass) missingVars.push('SMTP_PASS');

        console.error(`[EROARE CRITICĂ] Lipsesc variabilele: ${missingVars.join(', ')}`);
        return res.status(500).json({ 
            success: false, 
            error: `Eroare Server: Configurarea SMTP este incompletă. Lipsesc: ${missingVars.join(', ')}. Verificați fișierul .env.` 
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
            rejectUnauthorized: false
        }
    });

    const mailOptions = {
        from: `"Smart Meters Comenzi" <${smtpUser}>`, 
        to: smtpUser, // Trimitem email-ul către aceeași adresă (admin)
        replyTo: d.email, // Răspunde direct clientului dacă dai Reply
        subject: `Comandă Nouă B2B - ${d.billing_name || 'Client'}`,
        text: `Detaliile Comenzii:
-------------------------
Nume Client: ${d.billing_name}
Companie: ${d.company || '-'}
Email Client: ${d.email}
Telefon: ${d.phone || '-'}
Total Comandă: ${d.final_total} RON

DETALII COMPLETE (Notițe + Produse):
${d.order_notes}
`
    };

    try {
        await transporter.verify(); // Verifică conexiunea SMTP înainte de trimitere
        console.log('[SUCCESS] Conexiune SMTP verificată.');
        
        await transporter.sendMail(mailOptions);
        console.log('[SUCCESS] Email trimis cu succes.');
        
        res.status(200).json({ success: true, message: 'Comanda a fost trimisă!' });
    } catch (err) {
        console.error('[EROARE SMTP]', err);
        // Returnăm eroarea exactă către frontend pentru a ajuta la depanare
        res.status(500).json({ success: false, error: err.message || 'Eroare necunoscută la serverul de mail' });
    }
});

// 4. Fallback pentru SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serverul SmartMeters rulează pe portul ${PORT}`);
    console.log(`Director curent: ${__dirname}`);
});