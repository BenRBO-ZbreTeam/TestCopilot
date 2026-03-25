require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes API
app.use('/api/products', require('./routes/products'));
app.use('/api/movements', require('./routes/movements'));
app.use('/api/alerts', require('./routes/notifications'));
app.use('/api/restaurants', require('./routes/restaurants'));

// Santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stock résumé (pour le dashboard)
const db = require('./database');
app.get('/api/stock', (req, res) => {
  const stock = db.prepare(`
    SELECT p.id, p.name, p.ean_code, p.unit, p.category, p.min_stock,
      COALESCE(s.quantity, 0) as quantity,
      CASE WHEN COALESCE(s.quantity, 0) <= p.min_stock AND p.min_stock > 0 THEN 1 ELSE 0 END as is_low_stock,
      s.updated_at as last_movement
    FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
    ORDER BY p.name ASC
  `).all();
  res.json(stock);
});

// Servir le frontend en production
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`   API disponible sur http://localhost:${PORT}/api\n`);
});
