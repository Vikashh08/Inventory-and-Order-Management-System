const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

// GET /api/dashboard/stats - Retrieve inventory & sales statistics
router.get('/stats', authenticateToken, async (req, res) => {
  const isAdmin = req.user.role === 'ADMIN';
  const userId = req.user.id;

  try {
    // 1. Total Revenue (Completed Orders only)
    let revQuery = "SELECT SUM(total_amount) as total_revenue FROM orders WHERE status = 'COMPLETED'";
    const revParams = [];
    if (!isAdmin) {
      revQuery += " AND created_by = $1";
      revParams.push(userId);
    }
    const revRes = await db.query(revQuery, revParams);
    const totalRevenue = parseFloat(revRes.rows[0].total_revenue || 0);

    // 2. Order counts by status
    let orderCountQuery = "SELECT status, COUNT(*) as count FROM orders";
    const countParams = [];
    if (!isAdmin) {
      orderCountQuery += " WHERE created_by = $1";
      countParams.push(userId);
    }
    orderCountQuery += " GROUP BY status";
    const orderCountRes = await db.query(orderCountQuery, countParams);
    const orderStats = {
      COMPLETED: 0,
      QUOTATION: 0,
      CANCELLED: 0
    };
    orderCountRes.rows.forEach(row => {
      if (orderStats[row.status] !== undefined) {
        orderStats[row.status] = parseInt(row.count);
      }
    });

    // 3. Products Stats (Total distinct products and low stock products)
    const totalProdRes = await db.query("SELECT COUNT(*) as total FROM products");
    const totalProducts = parseInt(totalProdRes.rows[0].total || 0);

    const lowStockRes = await db.query("SELECT COUNT(*) as total FROM products WHERE quantity <= min_stock_level");
    const lowStockCount = parseInt(lowStockRes.rows[0].total || 0);

    // 4. Recent completed and quotation orders
    let recentOrdersQuery = `
      SELECT o.*, u.name as creator_name 
      FROM orders o
      LEFT JOIN users u ON o.created_by = u.id
    `;
    const recentParams = [];
    if (!isAdmin) {
      recentOrdersQuery += " WHERE o.created_by = $1";
      recentParams.push(userId);
    }
    recentOrdersQuery += " ORDER BY o.created_at DESC LIMIT 5";
    const recentOrdersRes = await db.query(recentOrdersQuery, recentParams);

    // 5. Low stock product alerts list
    const lowStockProductsRes = await db.query(
      "SELECT id, name, sku, quantity, unit, min_stock_level FROM products WHERE quantity <= min_stock_level ORDER BY (min_stock_level - quantity) DESC LIMIT 5"
    );

    // 6. Sales trends: daily revenue for the past 7 days
    let trendQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as day,
        SUM(total_amount) as daily_revenue
      FROM orders
      WHERE status = 'COMPLETED'
    `;
    const trendParams = [];
    if (!isAdmin) {
      trendQuery += " AND created_by = $1";
      trendParams.push(userId);
    }
    trendQuery += " GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') ORDER BY day ASC LIMIT 7";
    const trendRes = await db.query(trendQuery, trendParams);
    const salesTrend = trendRes.rows.map(row => ({
      date: row.day,
      revenue: parseFloat(row.daily_revenue || 0)
    }));

    res.json({
      totalRevenue,
      orderStats,
      totalProducts,
      lowStockCount,
      recentOrders: recentOrdersRes.rows,
      lowStockProducts: lowStockProductsRes.rows,
      salesTrend
    });

  } catch (err) {
    console.error('Fetch dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
