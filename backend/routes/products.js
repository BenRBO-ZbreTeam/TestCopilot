const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/products - Liste tous les produits avec stock
router.get('/', (req, res) => {
  const { search, category, low_stock } = req.query;

  let query = `
    SELECT p.*, COALESCE(s.quantity, 0) as quantity,
      CASE WHEN COALESCE(s.quantity, 0) <= p.min_stock AND p.min_stock > 0 THEN 1 ELSE 0 END as is_low_stock,
      ac.min_quantity as alert_min_quantity, ac.emails as alert_emails, ac.is_active as alert_active
    FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
    LEFT JOIN alert_configs ac ON p.id = ac.product_id
  `;
  const params = [];
  const conditions = [];

  if (search) {
    conditions.push('(p.name LIKE ? OR p.ean_code LIKE ? OR p.brand LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) {
    conditions.push('p.category = ?');
    params.push(category);
  }
  if (low_stock === 'true') {
    conditions.push('COALESCE(s.quantity, 0) <= p.min_stock AND p.min_stock > 0');
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY p.name ASC';

  const products = db.prepare(query).all(...params);
  res.json(products);
});

// GET /api/products/categories - Liste les catégories uniques
router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').all();
  res.json(categories.map(c => c.category));
});

// GET /api/products/ean/:code - Chercher par code EAN
router.get('/ean/:code', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, COALESCE(s.quantity, 0) as quantity
    FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
    WHERE p.ean_code = ?
  `).get(req.params.code);

  if (!product) {
    return res.status(404).json({ found: false, ean_code: req.params.code });
  }
  res.json({ found: true, product });
});

// GET /api/products/:id - Un produit
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, COALESCE(s.quantity, 0) as quantity
    FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!product) return res.status(404).json({ error: 'Produit introuvable' });
  res.json(product);
});

// POST /api/products - Créer un produit
router.post('/', (req, res) => {
  const { ean_code, name, description, brand, unit, category, min_stock } = req.body;

  if (!name) return res.status(400).json({ error: 'Le nom est requis' });

  const existing = ean_code ? db.prepare('SELECT id FROM products WHERE ean_code = ?').get(ean_code) : null;
  if (existing) return res.status(409).json({ error: 'Ce code EAN existe déjà' });

  const result = db.prepare(`
    INSERT INTO products (ean_code, name, description, brand, unit, category, min_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(ean_code || null, name, description || null, brand || null, unit || 'unité', category || 'Divers', min_stock || 0);

  // Initialiser le stock à 0
  db.prepare('INSERT INTO stock (product_id, quantity) VALUES (?, 0)').run(result.lastInsertRowid);

  const product = db.prepare('SELECT p.*, COALESCE(s.quantity, 0) as quantity FROM products p LEFT JOIN stock s ON p.id = s.product_id WHERE p.id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
});

// PUT /api/products/:id - Mettre à jour un produit
router.put('/:id', (req, res) => {
  const { ean_code, name, description, brand, unit, category, min_stock } = req.body;

  if (!name) return res.status(400).json({ error: 'Le nom est requis' });

  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });

  if (ean_code) {
    const conflict = db.prepare('SELECT id FROM products WHERE ean_code = ? AND id != ?').get(ean_code, req.params.id);
    if (conflict) return res.status(409).json({ error: 'Ce code EAN est déjà utilisé' });
  }

  db.prepare(`
    UPDATE products SET ean_code=?, name=?, description=?, brand=?, unit=?, category=?, min_stock=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(ean_code || null, name, description || null, brand || null, unit || 'unité', category || 'Divers', min_stock || 0, req.params.id);

  const updated = db.prepare('SELECT p.*, COALESCE(s.quantity, 0) as quantity FROM products p LEFT JOIN stock s ON p.id = s.product_id WHERE p.id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/products/:id
router.delete('/:id', (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
