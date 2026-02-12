const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. Servirea fișierelor statice (Frontend-ul tău Vite)
// Se asigură că folderul "dist" este cel accesat de browser
app.use(express.static(path.join(__dirname, 'dist')));

// 2. Ruta pentru trimiterea email-ului de comandă către Adrian
app.post('/api/trimite-comanda', async (req, res) => {
    const d = req.body;
    
    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 465,
        secure: true, // SSL
        auth: { 
            user: process.env.SMTP_USER, 
            pass: process.env.SMTP_PASS 
        }
    });

    const mailOptions = {
        from: `"Smart Meters" <${process.env.SMTP_USER}>`,
        to: 'adrian.geanta@smartmeter.ro',
        subject: `Comandă Nouă B2B - ${d.billing_name || 'Client'}`,
        text: `Email contact: ${d.email}\nNotițe: ${d.order_notes}\nTOTAL: ${d.final_total} RON`
        // Poți extinde formatul textului conform cerințelor tale ulterioare
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Comanda a fost trimisă!' });
    } catch (err) {
        console.error('Eroare SMTP:', err);
        res.status(500).json({ success: false, error: 'Eroare la trimiterea email-ului.' });
    }
});

// 3. Fallback pentru SPA (Single Page Application)
// Orice rută necunoscută este trimisă către index.html pentru a lăsa React să se ocupe
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Portul este alocat automat de cPanel prin variabila de mediu PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Aplicația rulează pe portul ${PORT}`);
});