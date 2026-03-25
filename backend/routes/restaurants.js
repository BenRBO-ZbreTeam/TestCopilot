const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/restaurants
router.get('/', (req, res) => {
  const restaurants = db.prepare('SELECT * FROM restaurants ORDER BY name').all();
  res.json(restaurants);
});

module.exports = router;
