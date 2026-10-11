# 🐘 PostgreSQL, pgAdmin & ngrok Live Hosting Guide — Prithvi Fix

This guide covers local database setup, pgAdmin 4 inspection, running the local development servers, and sharing the application publicly via **ngrok**.

---

## 📌 Prerequisites Check
Ensure you have the following installed:
1. **Node.js** v18+ (`node -v`)
2. **PostgreSQL** & **pgAdmin 4** (`psql -V` or check PostgreSQL service on port `5432`)
3. **ngrok** (`ngrok version` or download from [ngrok.com](https://ngrok.com))

---

## 🛠️ Step 1: Configure PostgreSQL Credentials

Open [`backend/.env`](./backend/.env) (or copy from `backend/.env.example`) and set your credentials:

```env
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_actual_postgres_password
PGDATABASE=prithvifix
```

*(If you installed PostgreSQL with default password `postgres` or `admin`, set `PGPASSWORD=postgres` or whatever password was chosen during PostgreSQL setup).*

---

## 🐘 Step 2: Database Initialization & Seeding (Auto-Setup)

You do **not** need to manually create tables or queries in pgAdmin. The built-in migration script will automatically create the database `prithvifix`, all 12 relational tables, statutory indexes, and realistic demo data.

Run this command in the backend folder:

```bash
cd backend
npm run seed
```

### ✅ Expected Output:
```
🔨 Target database "prithvifix" not found. Creating it now...
✅ Database "prithvifix" created successfully.
✅ PostgreSQL migration complete — all 12 tables and indexes verified.
🧹 Clearing existing tables...
🌱 Populating demo data...
🌱 PostgreSQL Database Seed Complete!

   Records created:
   cooperatives: 3
   users: 25
   workers: 18
   skills: 25
   services: 15
   bookings: 25
   payments: 18
   reviews: 17
   certifications: 14
   worker_welfare: 12
```

---

## 🖥️ Step 3: View & Manage in pgAdmin 4

1. Open **pgAdmin 4**.
2. Expand **Servers** ➔ **PostgreSQL 15 / 16** (Enter your master password).
3. Under **Databases**, you will see **`prithvifix`**.
4. Expand **`prithvifix`** ➔ **Schemas** ➔ **public** ➔ **Tables**.
5. Right-click on any table (e.g. `bookings`, `workers`, `societies`, `users`) and choose **View/Edit Data** ➔ **All Rows**.

---

## 💻 Step 4: Run Application Locally

### Terminal 1 (Backend Server):
```bash
cd backend
npm run dev
# Starts Express REST API on http://localhost:5000
```

### Terminal 2 (Frontend Server):
```bash
cd frontend
npm run dev
# Starts Vite React UI on http://localhost:5173
```

Open your browser at **`http://localhost:5173`**.

---

## 🌐 Step 5: Make it Live on the Internet via ngrok

With ngrok, you can share your working application with anyone on mobile devices or remote evaluators.

### Method A: Single-Tunnel Fast Share (Recommended)
Because Vite proxies `/api` requests directly to backend port 5000, you only need to tunnel the frontend:

```bash
ngrok http 5173
```

ngrok will output a public HTTPS URL:
```
Forwarding                    https://a1b2-c3d4.ngrok-free.app -> http://localhost:5173
```
Anyone opening `https://a1b2-c3d4.ngrok-free.app` will be able to access the full platform, create bookings, test DCO approvals, and view Form IV invoices!

---

### Method B: Separate Frontend & Backend Tunnels

If you prefer exposing both servers on separate tunnels:

**1. Tunnel Backend (Port 5000):**
```bash
ngrok http 5000
# Example: https://backend-api.ngrok-free.app
```

**2. Update `frontend/.env`:**
```env
VITE_API_URL=https://backend-api.ngrok-free.app/api
```

**3. Tunnel Frontend (Port 5173):**
```bash
ngrok http 5173
# Example: https://frontend-portal.ngrok-free.app
```

---

## 🔑 Pre-Configured Demo Credentials

The login page includes 1-click quick-login buttons, or use these credentials:

| Role | Email | Password | Access & Features |
| :--- | :--- | :--- | :--- |
| 👤 **Customer** | `customer@demo.local` | `password123` | Bookings, Smart Matching Wizard, UPI Payments, Form IV Invoices, Reviews |
| 👷 **Artisan** | `ramesh.w@demo.local` | `password123` | Duty Toggle, Job Dispatch Inbox, Earnings, Social Security Welfare Centre |
| 🏛️ **DCO Khordha** | `dco.khordha@demo.local` | `password123` | District Worker Verification, Society Accreditation, Statutory Inquiries |
| 🏢 **Apex Admin** | `fedhead@demo.local` | `password123` | Multi-District Oversight, AI Demand Forecasting, Mutual Aid Dispatch |

---

## 🔍 Diagnostic & Health Endpoints

- **API Health:** [`http://localhost:5000/api/health`](http://localhost:5000/api/health)
- **Database Stats & Row Counts:** [`http://localhost:5000/api/db/stats`](http://localhost:5000/api/db/stats)
