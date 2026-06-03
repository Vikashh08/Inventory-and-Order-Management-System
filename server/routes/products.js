const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('./auth');

// GET /api/products - Get all products
router.get('/', authenticateToken, async (req, res) => {
  const { lowStock } = req.query;
  try {
    let queryText = 'SELECT * FROM products ORDER BY name ASC';
    const params = [];
    
    if (lowStock === 'true') {
      queryText = 'SELECT * FROM products WHERE quantity <= min_stock_level ORDER BY name ASC';
    }
    
    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch product detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products - Create new product (ADMIN only)
router.post('/', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  const { name, description, sku, quantity, unit, price, min_stock_level } = req.body;

  if (!name || !sku || !unit || price === undefined || quantity === undefined) {
    return res.status(400).json({ error: 'Name, SKU, Unit, Quantity, and Price are required.' });
  }

  // Validate unit type
  const validUnits = ['g', 'kg', 'L', 'mL', 'unit'];
  if (!validUnits.includes(unit)) {
    return res.status(400).json({ error: `Invalid unit. Must be one of: ${validUnits.join(', ')}` });
  }

  try {
    // Check SKU unique
    const skuCheck = await db.query('SELECT id FROM products WHERE sku = $1', [sku.toUpperCase().trim()]);
    if (skuCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Product with this SKU already exists.' });
    }

    const queryText = `
      INSERT INTO products (name, description, sku, quantity, unit, price, min_stock_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await db.query(queryText, [
      name.trim(),
      description ? description.trim() : null,
      sku.toUpperCase().trim(),
      quantity, // Accepts high precision string/number
      unit,
      price,    // Accepts high precision string/number
      min_stock_level || 0
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/products/:id - Update product (Full metadata update for ADMIN, Stock refill for SELLER)
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN';

  try {
    const checkProduct = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (checkProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existingProduct = checkProduct.rows[0];

    if (isAdmin) {
      // Admin can update all fields
      const { name, description, sku, quantity, unit, price, min_stock_level } = req.body;

      if (!name || !sku || !unit || price === undefined || quantity === undefined) {
        return res.status(400).json({ error: 'Name, SKU, Unit, Quantity, and Price are required.' });
      }

      // Validate unit
      const validUnits = ['g', 'kg', 'L', 'mL', 'unit'];
      if (!validUnits.includes(unit)) {
        return res.status(400).json({ error: `Invalid unit. Must be one of: ${validUnits.join(', ')}` });
      }

      // Check SKU uniqueness if it changed
      if (sku.toUpperCase().trim() !== existingProduct.sku) {
        const skuCheck = await db.query('SELECT id FROM products WHERE sku = $1', [sku.toUpperCase().trim()]);
        if (skuCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Product with this SKU already exists.' });
        }
      }

      const queryText = `
        UPDATE products
        SET name = $1, description = $2, sku = $3, quantity = $4, unit = $5, price = $6, min_stock_level = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `;
      const result = await db.query(queryText, [
        name.trim(),
        description ? description.trim() : null,
        sku.toUpperCase().trim(),
        quantity,
        unit,
        price,
        min_stock_level,
        id
      ]);
      res.json(result.rows[0]);
    } else {
      // Seller can only adjust quantity (refill/audit)
      const { quantity } = req.body;
      if (quantity === undefined) {
        return res.status(400).json({ error: 'Quantity is required for stock adjustments.' });
      }

      const queryText = `
        UPDATE products
        SET quantity = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await db.query(queryText, [quantity, id]);
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/products/:id - Delete product (ADMIN only)
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully', id });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
