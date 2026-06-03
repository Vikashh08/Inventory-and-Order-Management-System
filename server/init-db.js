const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  console.log('Initializing database...');
  try {
    // 1. Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // 2. Execute schema SQL
    console.log('Executing schema.sql...');
    await pool.query(schemaSql);
    console.log('Schema executed successfully.');

    // 3. Create default users
    console.log('Seeding default users...');
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('password123', salt);
    const sellerPasswordHash = await bcrypt.hash('password123', salt);

    // Insert Admin
    const adminRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Admin User', 'admin@inventory.com', adminPasswordHash, 'ADMIN']
    );
    const adminId = adminRes.rows[0].id;
    console.log(`Seeded Admin user (ID: ${adminId}, Email: admin@inventory.com)`);

    // Insert Seller
    const sellerRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Seller User', 'seller@inventory.com', sellerPasswordHash, 'SELLER']
    );
    const sellerId = sellerRes.rows[0].id;
    console.log(`Seeded Seller user (ID: ${sellerId}, Email: seller@inventory.com)`);

    // 4. Seed sample products
    console.log('Seeding sample products...');
    const sampleProducts = [
      {
        name: 'Premium Basmati Rice',
        description: 'Long grain aromatic aged basmati rice.',
        sku: 'RICE-BAS-001',
        quantity: 250.5000,
        unit: 'kg',
        price: 110.0000, // ₹110 per kg
        min_stock_level: 50.0000
      },
      {
        name: 'Whole Wheat Flour',
        description: 'Organic stone-ground whole wheat atta.',
        sku: 'WHEAT-FLR-002',
        quantity: 15.0000, // Low stock! (Min is 20)
        unit: 'kg',
        price: 45.0000, // ₹45 per kg
        min_stock_level: 20.0000
      },
      {
        name: 'Refined White Sugar',
        description: 'Fine granulated sweetening sugar.',
        sku: 'SUG-WHT-003',
        quantity: 500.0000,
        unit: 'g',
        price: 0.0500, // ₹0.05 per gram (₹50 per kg)
        min_stock_level: 1000.0000 // 1 kg min
      },
      {
        name: 'Organic Honey',
        description: 'Pure wildflower raw organic honey.',
        sku: 'HON-ORG-004',
        quantity: 12.0000,
        unit: 'unit', // Count of jars
        price: 299.0000, // ₹299 per jar
        min_stock_level: 5.0000
      },
      {
        name: 'Full Cream Milk',
        description: 'Pasteurized homogenized cow milk.',
        sku: 'MILK-FC-005',
        quantity: 80.5000,
        unit: 'L',
        price: 66.0000, // ₹66 per Litre
        min_stock_level: 15.0000
      },
      {
        name: 'Cold Pressed Coconut Oil',
        description: 'Extra virgin cold pressed coconut cooking oil.',
        sku: 'OIL-COC-006',
        quantity: 250.0000, // 250 mL
        unit: 'mL',
        price: 0.3500, // ₹0.35 per mL (₹350 per Litre)
        min_stock_level: 1000.0000 // 1 Litre min
      }
    ];

    for (const prod of sampleProducts) {
      await pool.query(
        `INSERT INTO products (name, description, sku, quantity, unit, price, min_stock_level) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [prod.name, prod.description, prod.sku, prod.quantity, prod.unit, prod.price, prod.min_stock_level]
      );
    }
    console.log('Sample products seeded successfully.');

  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
    console.log('Database pool connection closed.');
  }
}

run();
