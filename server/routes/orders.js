const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

// Unit Conversion Helpers
const CONVERSIONS = {
  // Mass
  'g-kg': 0.001,
  'kg-g': 1000,
  // Volume
  'mL-L': 0.001,
  'L-mL': 1000
};

function getConversionFactor(orderedUnit, baseUnit) {
  if (orderedUnit === baseUnit) return 1.0;
  const key = `${orderedUnit}-${baseUnit}`;
  if (CONVERSIONS[key] !== undefined) {
    return CONVERSIONS[key];
  }
  return null; // Incompatible units
}

// GET /api/orders - Get orders list
// Admins see all, Sellers see their own
router.get('/', authenticateToken, async (req, res) => {
  const isAdmin = req.user.role === 'ADMIN';
  try {
    let queryText = `
      SELECT o.*, u.name as creator_name 
      FROM orders o
      LEFT JOIN users u ON o.created_by = u.id
    `;
    const params = [];

    if (!isAdmin) {
      queryText += ' WHERE o.created_by = $1';
      params.push(req.user.id);
    }

    queryText += ' ORDER BY o.created_at DESC';

    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id - Get order details with items
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN';

  try {
    // Fetch order
    const orderRes = await db.query(
      `SELECT o.*, u.name as creator_name, u.email as creator_email 
       FROM orders o
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRes.rows[0];

    // Check permission
    if (!isAdmin && order.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to this order' });
    }

    // Fetch order items
    const itemsRes = await db.query(
      `SELECT oi.*, p.name as product_name, p.sku as product_sku
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    order.items = itemsRes.rows;
    res.json(order);
  } catch (err) {
    console.error('Fetch order detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders - Create an order or quotation
router.post('/', authenticateToken, async (req, res) => {
  const { customer_name, customer_email, status, items } = req.body;

  if (!customer_name || !status || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Customer name, status, and items are required.' });
  }

  if (!['QUOTATION', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be QUOTATION or COMPLETED.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Generate unique order number (e.g. ORD-20260603-12345)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `${status === 'QUOTATION' ? 'QT' : 'ORD'}-${dateStr}-${randomSuffix}`;

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const { product_id, quantity, unit } = item;

      if (!product_id || !quantity || !unit) {
        throw new Error('Each item must contain product_id, quantity, and unit.');
      }

      // Fetch product details with FOR UPDATE to lock row during transaction
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [product_id]);
      if (prodRes.rows.length === 0) {
        throw new Error(`Product with ID ${product_id} not found.`);
      }

      const product = prodRes.rows[0];

      // Verify unit compatibility and get conversion factor
      const conversionFactor = getConversionFactor(unit, product.unit);
      if (conversionFactor === null) {
        throw new Error(
          `Incompatible unit: Cannot order product "${product.name}" in unit "${unit}". Base unit is "${product.unit}".`
        );
      }

      // Calculate quantity in database base unit
      const baseQuantityToDeduct = Number(quantity) * conversionFactor;

      // Check stock availability if COMPLETED order
      if (status === 'COMPLETED') {
        const availableQty = Number(product.quantity);
        if (availableQty < baseQuantityToDeduct) {
          throw new Error(
            `Insufficient stock for "${product.name}". Requested: ${quantity} ${unit} (${baseQuantityToDeduct.toFixed(4)} ${product.unit}), Available: ${availableQty.toFixed(4)} ${product.unit}.`
          );
        }

        // Deduct stock
        await client.query(
          'UPDATE products SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [baseQuantityToDeduct, product_id]
        );
      }

      // Calculate prices
      // base_price is per baseUnit. The price per orderedUnit = base_price * conversionFactor
      const basePrice = Number(product.price);
      const pricePerUnit = basePrice * conversionFactor;
      const subtotal = Number(quantity) * pricePerUnit;

      totalAmount += subtotal;

      processedItems.push({
        product_id,
        quantity,
        unit,
        price_per_unit: pricePerUnit,
        subtotal
      });
    }

    // Insert Order header
    const orderInsertRes = await client.query(
      `INSERT INTO orders (order_number, customer_name, customer_email, total_amount, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orderNumber, customer_name.trim(), customer_email ? customer_email.trim() : null, totalAmount, status, req.user.id]
    );

    const orderId = orderInsertRes.rows[0].id;

    // Insert Order items
    for (const pItem of processedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit, price_per_unit, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, pItem.product_id, pItem.quantity, pItem.unit, pItem.price_per_unit, pItem.subtotal]
      );
    }

    await client.query('COMMIT');
    
    // Fetch and return the fully populated order details
    const finalOrderRes = await db.query(
      `SELECT o.*, u.name as creator_name 
       FROM orders o
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.id = $1`,
      [orderId]
    );
    const finalOrder = finalOrderRes.rows[0];
    finalOrder.items = processedItems;

    res.status(201).json(finalOrder);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create order transaction error:', err);
    res.status(400).json({ error: err.message || 'Failed to place order.' });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id/status - Update order status (e.g. cancel order, finalize quotation)
// Admins can finalize or cancel any order. Sellers can cancel their own.
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const isAdmin = req.user.role === 'ADMIN';

  if (!['COMPLETED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status update. Can only transition to COMPLETED or CANCELLED.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch existing order
    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (orderRes.rows.length === 0) {
      throw new Error('Order not found.');
    }

    const order = orderRes.rows[0];

    // Access control
    if (!isAdmin && order.created_by !== req.user.id) {
      throw new Error('Unauthorized to modify this order.');
    }

    // Status transition rules
    if (order.status === status) {
      return res.json({ message: `Order is already in ${status} status.`, order });
    }

    if (order.status === 'COMPLETED' && status === 'CANCELLED') {
      // Revert stock! Add items back to products
      const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
      for (const item of itemsRes.rows) {
        if (!item.product_id) continue;
        
        // Fetch product base unit to find conversion factor
        const prodRes = await client.query('SELECT unit FROM products WHERE id = $1', [item.product_id]);
        if (prodRes.rows.length === 0) continue;
        const productUnit = prodRes.rows[0].unit;

        const conversionFactor = getConversionFactor(item.unit, productUnit);
        const baseQtyToReturn = Number(item.quantity) * (conversionFactor || 1);

        await client.query(
          'UPDATE products SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [baseQtyToReturn, item.product_id]
        );
      }
    } else if (order.status === 'QUOTATION' && status === 'COMPLETED') {
      // Deduct stock! Check availability first
      const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
      for (const item of itemsRes.rows) {
        if (!item.product_id) {
          throw new Error('Cannot fulfill order containing deleted products.');
        }

        const prodRes = await client.query('SELECT name, quantity, unit FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
        if (prodRes.rows.length === 0) {
          throw new Error('Product not found.');
        }
        const product = prodRes.rows[0];

        const conversionFactor = getConversionFactor(item.unit, product.unit);
        const baseQtyToDeduct = Number(item.quantity) * (conversionFactor || 1);

        if (Number(product.quantity) < baseQtyToDeduct) {
          throw new Error(`Insufficient stock for "${product.name}". Needed: ${baseQtyToDeduct} ${product.unit}, available: ${product.quantity} ${product.unit}.`);
        }

        await client.query(
          'UPDATE products SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [baseQtyToDeduct, item.product_id]
        );
      }
    } else if (order.status === 'CANCELLED') {
      throw new Error('Cannot modify a CANCELLED order.');
    }

    // Update status
    const updateRes = await client.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    await client.query('COMMIT');
    res.json(updateRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update order status error:', err);
    res.status(400).json({ error: err.message || 'Failed to update status.' });
  } finally {
    client.release();
  }
});

module.exports = router;
