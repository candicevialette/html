const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(express.json()); // pour parser les JSON

// Remplacez par votre URL de webhook Discord
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/VOTRE_ID/VOTRE_TOKEN";

// Route pour recevoir les données du devis, générer le PDF et l'envoyer sur Discord
app.post('/sendQuote', async (req, res) => {
  const data = req.body;
  
  // Générer le HTML du devis en intégrant les données
  const htmlContent = generateHTML(data);
  const pdfPath = path.join(__dirname, 'devis.pdf');
  
  try {
    // Lancer Puppeteer et générer le PDF
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf({ path: pdfPath, format: 'A4' });
    await browser.close();
    
    // Préparer la requête multipart pour Discord
    const form = new FormData();
    form.append('payload_json', JSON.stringify({
      content: `Nouveau devis envoyé : **${data.nom} ${data.prenom}**\n` +
               `Téléphone : ${data.tel}\nEmail : ${data.email}\nAdresse : ${data.adresse}\n` +
               `Retouches : ${data.qR}, Boutons : ${data.qB}, Hauts : ${data.qH}\n` +
               `Sous-total : ${data.sousTotal} €, TVA : ${data.tva} €, Total TTC : ${data.total} €\n` +
               `Date : ${data.date}`
    }));
    form.append('file', fs.createReadStream(pdfPath), 'devis.pdf');
    
    // Envoyer la requête vers Discord
    const response = await axios.post(DISCORD_WEBHOOK, form, {
      headers: form.getHeaders()
    });
    
    // Optionnel : supprimer le PDF temporaire
    fs.unlinkSync(pdfPath);
    
    res.json({ success: true, message: 'Devis PDF envoyé sur Discord' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération ou de l’envoi du PDF' });
  }
});

// Fonction pour générer le HTML du devis à partir des données
function generateHTML(d) {
  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>Devis Couture</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { text-align: center; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #000; padding: 10px; text-align: left; }
      .totaux { margin-top: 20px; font-weight: bold; }
      .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
      .signature-bloc { width: 30%; text-align: center; }
      .signature-zone { border: 1px dashed #000; height: 100px; margin-top: 10px; }
    </style>
  </head>
  <body>
    <h1>Devis Couture</h1>
    <p><strong>Nom :</strong> ${d.nom} ${d.prenom}</p>
    <p><strong>Email :</strong> ${d.email}</p>
    <p><strong>Téléphone :</strong> ${d.tel}</p>
    <p><strong>Adresse :</strong> ${d.adresse}</p>
    <table>
      <thead>
        <tr>
          <th>Service</th>
          <th>Quantité</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Retouche</td>
          <td>${d.qR}</td>
          <td>${d.qR * 40} €</td>
        </tr>
        <tr>
          <td>Couture de bouton</td>
          <td>${d.qB}</td>
          <td>${d.qB * 30} €</td>
        </tr>
        <tr>
          <td>Création haut</td>
          <td>${d.qH}</td>
          <td>${d.qH * 90} €</td>
        </tr>
      </tbody>
    </table>
    <div class="totaux">
      <p>Sous-total : ${d.sousTotal} €</p>
      <p>TVA (20%) : ${d.tva} €</p>
      <p>Total TTC : ${d.total} €</p>
    </div>
    <div class="signature-section">
      <div class="signature-bloc">
        <p>Signature du Client</p>
        <div class="signature-zone"></div>
      </div>
      <div class="signature-bloc">
        <p>Signature du Responsable</p>
        <div class="signature-zone"></div>
      </div>
      <div class="signature-bloc">
        <p>Tampon de l'Entreprise</p>
        <div class="signature-zone"></div>
      </div>
    </div>
  </body>
  </html>
  `;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur http://localhost:${PORT}`);
});
