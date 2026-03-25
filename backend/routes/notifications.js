const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const db = require('../database');

// Créer le transporteur email
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Vérifier et envoyer les alertes de stock
async function checkAndSendAlerts(productId, newQty) {
  const alert = db.prepare(`
    SELECT ac.*, p.name as product_name, p.unit, p.min_stock
    FROM alert_configs ac
    JOIN products p ON ac.product_id = p.id
    WHERE ac.product_id = ? AND ac.is_active = 1
  `).get(productId);

  if (!alert) return;
  if (newQty > alert.min_quantity) return;

  // Anti-spam : ne pas notifier 2x dans les 2 heures
  if (alert.last_notified_at) {
    const lastNotif = new Date(alert.last_notified_at);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    if (lastNotif > twoHoursAgo) return;
  }

  const emails = alert.emails.split(',').map(e => e.trim()).filter(Boolean);
  if (emails.length === 0) return;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Stock Logistique" <${process.env.SMTP_USER}>`,
      to: emails.join(', '),
      subject: `⚠️ Stock bas : ${alert.product_name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #fff; color: #000;">
          <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px;">Stock bas détecté</h1>
          <p style="font-size: 16px; color: #666; margin: 0 0 32px;">Logistique Stock — Notification automatique</p>

          <div style="background: #F5F5F5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666;">PRODUIT</p>
            <p style="margin: 0 0 20px; font-size: 20px; font-weight: 600;">${alert.product_name}</p>

            <div style="display: flex; gap: 24px;">
              <div>
                <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666;">STOCK ACTUEL</p>
                <p style="margin: 0; font-size: 28px; font-weight: 700; color: #FF3B30;">${newQty} ${alert.unit}</p>
              </div>
              <div>
                <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666;">SEUIL MINIMUM</p>
                <p style="margin: 0; font-size: 28px; font-weight: 700;">${alert.min_quantity} ${alert.unit}</p>
              </div>
            </div>
          </div>

          <p style="font-size: 14px; color: #666; margin: 0;">
            Veuillez procéder au réapprovisionnement de ce produit.
          </p>
        </div>
      `
    });

    db.prepare('UPDATE alert_configs SET last_notified_at = CURRENT_TIMESTAMP WHERE product_id = ?').run(productId);
    console.log(`Alerte envoyée pour "${alert.product_name}" (stock: ${newQty})`);
  } catch (err) {
    console.error('Erreur envoi email:', err.message);
  }
}

// GET /api/alerts - Liste des alertes configurées
router.get('/', (req, res) => {
  const alerts = db.prepare(`
    SELECT ac.*, p.name as product_name, p.unit, COALESCE(s.quantity, 0) as current_stock
    FROM alert_configs ac
    JOIN products p ON ac.product_id = p.id
    LEFT JOIN stock s ON p.id = s.product_id
    ORDER BY p.name
  `).all();
  res.json(alerts);
});

// POST /api/alerts - Créer ou mettre à jour une alerte
router.post('/', (req, res) => {
  const { product_id, min_quantity, emails, is_active } = req.body;

  if (!product_id || min_quantity === undefined || !emails) {
    return res.status(400).json({ error: 'product_id, min_quantity et emails sont requis' });
  }

  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });

  db.prepare(`
    INSERT INTO alert_configs (product_id, min_quantity, emails, is_active)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(product_id) DO UPDATE SET
      min_quantity = excluded.min_quantity,
      emails = excluded.emails,
      is_active = excluded.is_active
  `).run(product_id, min_quantity, emails, is_active !== false ? 1 : 0);

  const alert = db.prepare(`
    SELECT ac.*, p.name as product_name, p.unit, COALESCE(s.quantity, 0) as current_stock
    FROM alert_configs ac JOIN products p ON ac.product_id = p.id
    LEFT JOIN stock s ON p.id = s.product_id
    WHERE ac.product_id = ?
  `).get(product_id);

  res.status(201).json(alert);
});

// PUT /api/alerts/:id - Mettre à jour
router.put('/:id', (req, res) => {
  const { min_quantity, emails, is_active } = req.body;

  const alert = db.prepare('SELECT * FROM alert_configs WHERE id = ?').get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alerte introuvable' });

  db.prepare(`
    UPDATE alert_configs SET min_quantity=?, emails=?, is_active=?
    WHERE id=?
  `).run(
    min_quantity ?? alert.min_quantity,
    emails ?? alert.emails,
    is_active !== undefined ? (is_active ? 1 : 0) : alert.is_active,
    req.params.id
  );

  res.json({ success: true });
});

// DELETE /api/alerts/:id
router.delete('/:id', (req, res) => {
  const alert = db.prepare('SELECT id FROM alert_configs WHERE id = ?').get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alerte introuvable' });
  db.prepare('DELETE FROM alert_configs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/alerts/test-email - Tester l'envoi d'email
router.post('/test-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email requis' });

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Stock Logistique" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Test — Alertes Stock Logistique',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px;">
          <h1 style="font-size: 24px; font-weight: 700;">Configuration email OK</h1>
          <p style="color: #666;">Les alertes de stock sont bien configurées et fonctionnelles.</p>
        </div>
      `
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.checkAndSendAlerts = checkAndSendAlerts;
