const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

const app = express();
app.use(express.json());

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/TON_ID/TON_TOKEN'; // <-- Remplace ici

app.post('/envoyer-devis', async (req, res) => {
  const data = req.body;

  const html = generateHTML(data);
  const filePath = path.join(__dirname, 'devis.pdf');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({ path: filePath, format: 'A4' });
  await browser.close();

  const form = new FormData();
  form.append('payload_json', JSON.stringify({
    content: `📄 Nouveau devis client : **${data.nom} ${data.prenom}**`
  }));
  form.append('file', fs.createReadStream(filePath), 'devis.pdf');

  try {
    await axios.post(DISCORD_WEBHOOK, form, {
      headers: form.getHeaders()
    });
    res.send({ success: true, message: 'PDF envoyé sur Discord' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: 'Erreur Discord' });
  }
});

// Génère le HTML à partir des données du client
function generateHTML(d) {
  return `
  <html>
    <head><style>
      body { font-family: Arial; padding: 20px; }
      h1 { text-align: center; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #000; padding: 10px; text-align: left; }
      .totaux { margin-top: 20px; font-weight: bold; }
    </style></head>
    <body>
      <h1>Devis Couture</h1>
      <p><strong>Nom :</strong> ${d.nom} ${d.prenom}</p>
      <p><strong>Email :</strong> ${d.email}</p>
      <p><strong>Téléphone :</strong> ${d.tel}</p>
      <p><strong>Adresse :</strong> ${d.adresse}</p>

      <table>
        <thead>
          <tr><th>Service</th><th>Quantité</th><th>Total</th></tr>
        </thead>
        <tbody>
          <tr><td>Retouche</td><td>${d.qR}</td><td>${d.qR * 40} €</td></tr>
          <tr><td>Couture bouton</td><td>${d.qB}</td><td>${d.qB * 30} €</td></tr>
          <tr><td>Création haut</td><td>${d.qH}</td><td>${d.qH * 90} €</td></tr>
        </tbody>
      </table>

      <div class="totaux">
        <p>Sous-total : ${d.sousTotal} €</p>
        <p>TVA (20%) : ${d.tva} €</p>
        <p>Total TTC : ${d.total} €</p>
      </div>

      <p style="margin-top:40px;">Signature Client : _______________________</p>
      <p>Signature Responsable : ____________________</p>
    </body>
  </html>`;
}

const PORT = 3000;
app.listen(PORT, () => console.log(`Serveur en écoute sur http://localhost:${PORT}`));
