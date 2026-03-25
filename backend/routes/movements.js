const express = require('express');
const router = express.Router();
const db = require('../database');
const { checkAndSendAlerts } = require('./notifications');

// GET /api/movements - Historique des mouvements
router.get('/', (req, res) => {
  const { type, restaurant_id, product_id, date_from, date_to, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT m.*,
      p.name as product_name, p.ean_code, p.unit,
      r.name as restaurant_name
    FROM movements m
    JOIN products p ON m.product_id = p.id
    LEFT JOIN restaurants r ON m.restaurant_id = r.id
  `;
  const params = [];
  const conditions = [];

  if (type) { conditions.push('m.type = ?'); params.push(type); }
  if (restaurant_id) { conditions.push('m.restaurant_id = ?'); params.push(restaurant_id); }
  if (product_id) { conditions.push('m.product_id = ?'); params.push(product_id); }
  if (date_from) { conditions.push('DATE(m.created_at) >= ?'); params.push(date_from); }
  if (date_to) { conditions.push('DATE(m.created_at) <= ?'); params.push(date_to); }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const movements = db.prepare(query).all(...params);

  // Count total
  let countQuery = 'SELECT COUNT(*) as total FROM movements m';
  const countParams = params.slice(0, -2);
  if (conditions.length > 0) countQuery += ' WHERE ' + conditions.join(' AND ');
  const { total } = db.prepare(countQuery).get(...countParams);

  res.json({ movements, total });
});

// GET /api/movements/stats - Statistiques du jour
router.get('/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const todayEntries = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as total_qty
    FROM movements WHERE type = 'entry' AND DATE(created_at) = ?
  `).get(today);

  const todayExits = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as total_qty
    FROM movements WHERE type = 'exit' AND DATE(created_at) = ?
  `).get(today);

  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
  const lowStock = db.prepare(`
    SELECT COUNT(*) as count FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
    WHERE p.min_stock > 0 AND COALESCE(s.quantity, 0) <= p.min_stock
  `).get();

  const totalStock = db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM stock').get();

  res.json({
    today: { entries: todayEntries, exits: todayExits },
    total_products: totalProducts.count,
    low_stock_count: lowStock.count,
    total_stock_quantity: totalStock.total
  });
});

// POST /api/movements - Créer un mouvement (entrée ou sortie)
router.post('/', (req, res) => {
  const { product_id, type, quantity, restaurant_id, notes } = req.body;

  if (!product_id || !type || !quantity) {
    return res.status(400).json({ error: 'product_id, type et quantity sont requis' });
  }
  if (!['entry', 'exit'].includes(type)) {
    return res.status(400).json({ error: 'type doit être entry ou exit' });
  }
  if (quantity <= 0) {
    return res.status(400).json({ error: 'La quantité doit être positive' });
  }
  if (type === 'exit' && !restaurant_id) {
    return res.status(400).json({ error: 'Le restaurant est requis pour une sortie' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });

  // Vérifier le stock disponible pour une sortie
  const currentStock = db.prepare('SELECT COALESCE(quantity, 0) as qty FROM stock WHERE product_id = ?').get(product_id);
  const currentQty = currentStock ? currentStock.qty : 0;

  if (type === 'exit' && currentQty < quantity) {
    return res.status(400).json({
      error: `Stock insuffisant. Disponible: ${currentQty} ${product.unit}`,
      available: currentQty
    });
  }

  // Transaction atomique
  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO movements (product_id, type, quantity, restaurant_id, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(product_id, type, quantity, restaurant_id || null, notes || null);

    // Mettre à jour le stock
    const newQty = type === 'entry' ? currentQty + quantity : currentQty - quantity;
    db.prepare(`
      INSERT INTO stock (product_id, quantity) VALUES (?, ?)
      ON CONFLICT(product_id) DO UPDATE SET quantity = ?, updated_at = CURRENT_TIMESTAMP
    `).run(product_id, newQty, newQty);

    return { movementId: result.lastInsertRowid, newQty };
  });

  const { movementId, newQty } = transaction();

  // Vérifier les alertes de stock
  if (type === 'exit') {
    checkAndSendAlerts(product_id, newQty).catch(console.error);
  }

  const movement = db.prepare(`
    SELECT m.*, p.name as product_name, p.ean_code, p.unit, r.name as restaurant_name
    FROM movements m
    JOIN products p ON m.product_id = p.id
    LEFT JOIN restaurants r ON m.restaurant_id = r.id
    WHERE m.id = ?
  `).get(movementId);

  res.status(201).json({ movement, new_stock: newQty });
});

module.exports = router;
