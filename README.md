# Inventory and Order Management System

This is a small web application to manage products, stock levels, and customer orders. 

## Tech Stack & Architecture

We built this application using the following technologies:
- **Frontend**: React (Vite) for a fast and smooth user experience.
- **Backend**: Express.js (Node.js) to handle API requests.
- **Database**: Neon-hosted PostgreSQL database.
- **Deployment**: Configured to deploy easily on Vercel.

> **Note on Framework Choice**: The prompt instructions originally suggested using Next.js. We chose to build this using a separate React frontend and Express backend. This setup is highly responsive and compiles/deploys cleanly on Vercel using serverless functions.

---

## Database Design and Precision

We chose specific database types to make sure numbers are always accurate:

- **Quantity**: `NUMERIC(20, 4)`
- **Price**: `NUMERIC(20, 4)`
- **Subtotal / Total**: `NUMERIC(20, 4)`

### Why we chose this design:
1. **No Rounding Errors**: Standard database floats (like `REAL` or `DOUBLE PRECISION`) can cause math errors in computers (for example, `0.1 + 0.2` might equal `0.30000000000000004`). Using `NUMERIC` ensures that prices and totals are calculated exactly.
2. **High Precision for Small Units**: Since the app supports units like grams (`g`) and milliliters (`mL`), users need to enter small decimal quantities (like `0.250 kg` of flour). The `NUMERIC(20, 4)` type saves values up to 4 decimal places without losing accuracy.
3. **Automatic Unit Conversion**: When a user creates an order in grams for a product stored in kilograms, the backend does the math (like multiplying by `1000`) and saves the exact converted amount in the database.

---

## Key Features

- **Authentication & Roles**:
  - **Admin**: Can create products, edit descriptions, adjust prices, and see overview stats.
  - **Seller (User)**: Can view products, restock items, and create customer orders.
- **Google Login**: Quick registration and login using your Google account.
- **Quantity Units**: Supports grams (`g`), kilograms (`kg`), liters (`L`), milliliters (`mL`), and individual items (`unit`).
- **INR Currency**: All prices and order totals are displayed in Rupees (`₹`).
- **Dashboard Alerts**: Alerts show up immediately on the dashboard if products run low on stock.
- **Download Receipts**: After submitting an order, you can download a text file receipt of the invoice.

---

## Local Setup

### 1. Install Dependencies
Run this command in the project root to install everything for both the frontend and backend:
```bash
npm run install:all
```

### 2. Set Up Environment Variables
Create a file named `.env` inside the `server` folder and add these lines:
```env
PORT=5005
DATABASE_URL=your_neon_postgresql_url
JWT_SECRET=any_random_string_for_tokens
NODE_ENV=development
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Initialize the Database
Run the seeding script to create the database tables and add initial sample data:
```bash
npm run seed
```
*This will create two default accounts:*
- **Admin**: `admin@inventory.com` (password: `password123`)
- **Seller**: `seller@inventory.com` (password: `password123`)

### 4. Run the App
To start both the frontend and backend development servers together, run:
```bash
npm run dev
```
Open your browser and go to `http://localhost:5173`.
