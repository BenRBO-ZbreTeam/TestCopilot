const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'stock.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ean_code TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    unit TEXT DEFAULT 'unité',
    category TEXT DEFAULT 'Divers',
    min_stock INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL UNIQUE,
    quantity INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('entry', 'exit')),
    quantity INTEGER NOT NULL,
    restaurant_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
  );

  CREATE TABLE IF NOT EXISTS alert_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL UNIQUE,
    min_quantity INTEGER NOT NULL DEFAULT 0,
    emails TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    last_notified_at DATETIME,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Restaurants par défaut
const insertRestaurant = db.prepare('INSERT OR IGNORE INTO restaurants (name) VALUES (?)');
['Monsieur MOUETTE', 'GIGIO', 'TIGER Club', 'CHEZ HENRI'].forEach(name => {
  insertRestaurant.run(name);
});

// Trigger pour mettre à jour updated_at du stock
db.exec(`
  CREATE TRIGGER IF NOT EXISTS update_stock_timestamp
  AFTER UPDATE ON stock
  BEGIN
    UPDATE stock SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
`);

module.exports = db;
