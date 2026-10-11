# 🚀 Render.com Cloud Deployment Guide — Prithvi Fix

This guide explains how to deploy the full-stack **Prithvi Fix Platform** to [Render.com](https://render.com) using either the automated **1-Click Blueprint** or manual configuration.

---

## 🌟 Option A: 1-Click Blueprint Deployment (Recommended)

Render uses the included [`render.yaml`](./render.yaml) file to automatically provision both the **Managed PostgreSQL database** and the **Full-Stack Web Service** in a single click.

### Step 1: Ensure Latest Code on GitHub
Ensure your repository is pushed to your GitHub `main` branch:
```bash
git status
git push -u origin main
```

### Step 2: Deploy on Render
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click the **"New +"** button in the top navigation bar and select **"Blueprint"**.
3. Connect your GitHub repository (`sarathyprasad/hacktoberfest2026`).
4. Render will detect `render.yaml` and display:
   - **Database**: `prithvi-fix-db` (PostgreSQL)
   - **Web Service**: `prithvi-fix-app` (Node.js)
5. Click **"Apply"**.
6. Render will automatically:
   - Provision the PostgreSQL database.
   - Build the frontend React SPA into `dist`.
   - Install backend dependencies.
   - Run migrations and seed data (`npm run seed`).
   - Start the live web application on `https://prithvi-fix-app.onrender.com`.

---

## 🛠️ Option B: Manual Setup on Render Dashboard

If you prefer to configure each component step-by-step:

### Step 1: Create Managed PostgreSQL Database
1. In Render Dashboard, click **"New +"** ➔ **"PostgreSQL"**.
2. Configure parameters:
   - **Name**: `prithvi-fix-db`
   - **Database**: `prithvifix`
   - **User**: `prithvi_user`
   - **Region**: *Singapore* (or nearest to you)
   - **Plan**: *Free*
3. Click **"Create Database"**.
4. Once provisioned, copy the **Internal Database URL** (e.g. `postgres://prithvi_user:password@dpg-xxxx-a:5432/prithvifix`).

---

### Step 2: Create Web Service
1. In Render Dashboard, click **"New +"** ➔ **"Web Service"**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `prithvi-fix-app`
   - **Region**: Same region as your database (*Singapore*)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run seed && npm start`
4. Add **Environment Variables**:

| Variable Key | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `DATABASE_URL` | *Paste your Internal Database URL* | Connects backend to managed PostgreSQL |
| `JWT_SECRET` | *Click "Generate"* or type a secret key | Signs authentication session tokens |
| `CORS_ALLOW_ALL` | `true` | Allows web requests from custom domains |
| `PORT` | `10000` | Port assigned by Render |

5. Click **"Create Web Service"**.

---

## 🔍 Verification & Health Check

Once deployment completes, open your live Render app URL (e.g. `https://prithvi-fix-app.onrender.com`):

1. **Frontend App**: Visit `https://prithvi-fix-app.onrender.com`
2. **API Health Check**: Visit `https://prithvi-fix-app.onrender.com/api/health`
   ```json
   {
     "status": "ok",
     "message": "Prithvi Fix API is running on PostgreSQL",
     "database": "PostgreSQL",
     "environment": "production"
   }
   ```
3. **Database Telemetry**: Visit `https://prithvi-fix-app.onrender.com/api/db/stats` to verify seeded tables and worker profiles.

---

## 🔑 Demo Credentials on Live App

The live application includes 1-click demo login buttons, or enter credentials manually:

* 👤 **Citizen / Customer**: `customer@demo.local` / `password123`
* 👷 **Skilled Artisan**: `ramesh.w@demo.local` / `password123`
* 🏛️ **DCO Khordha**: `dco.khordha@demo.local` / `password123`
* 🏢 **Apex Federation Head**: `fedhead@demo.local` / `password123`
