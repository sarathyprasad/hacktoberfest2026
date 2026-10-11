# 🏛️ Production Deployment Guide — Prithvi Fix

This guide outlines deployment procedures for hosting **Prithvi Fix** on state government infrastructure (NIC / State Data Centre / Cloud VM / Ubuntu 22.04+).

---

## 1. System Architecture Overview

```
                      Internet / Public Access
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │   Nginx Reverse Proxy │ (Port 80/443 SSL)
                     └───────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
    ┌────────────────────────┐      ┌────────────────────────┐
    │  Frontend Static SPA   │      │  Node.js API Cluster   │
    │  /var/www/prithvifix/  │      │  PM2 Process Manager   │
    │  frontend/dist         │      │  Port 5000             │
    └────────────────────────┘      └───────────┬────────────┘
                                                │
                                                ▼
                                    ┌────────────────────────┐
                                    │  PostgreSQL Database   │
                                    │  Port 5432 / Pooler    │
                                    └────────────────────────┘
```

---

## 2. Server Prerequisites & Package Installation

```bash
# Update Ubuntu package catalog
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS & Build Tools
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential nginx certbot python3-certbot-nginx

# Install PostgreSQL 15+ (if hosting database locally on server)
sudo apt install -y postgresql postgresql-contrib

# Install PM2 Process Manager globally
sudo npm install -g pm2
```

---

## 3. Database Setup & Initialization

### A. Configure PostgreSQL
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE prithvifix;
CREATE USER prithvi_admin WITH ENCRYPTED PASSWORD 'Your_Super_Strong_Password_2026!';
GRANT ALL PRIVILEGES ON DATABASE prithvifix TO prithvi_admin;
\c prithvifix
GRANT ALL ON SCHEMA public TO prithvi_admin;
\q
```

---

## 4. Environment Configuration

### A. Backend `.env` (`/var/www/prithvifix/backend/.env`)
```ini
NODE_ENV=production
PORT=5000

# PostgreSQL Connection Credentials
PGHOST=localhost
PGPORT=5432
PGUSER=prithvi_admin
PGPASSWORD=Your_Super_Strong_Password_2026!
PGDATABASE=prithvifix

# Or Managed Database URI (Supabase / Render / Neon):
# DATABASE_URL=postgresql://prithvi_admin:password@host:5432/prithvifix?sslmode=require

# JWT Authentication
JWT_SECRET=super_secret_cryptographic_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d

# CORS & Security
CORS_ORIGIN=https://prithvifix.gov.in
CORS_ALLOW_ALL=false
```

### B. Frontend `.env.production` (`/var/www/prithvifix/frontend/.env.production`)
```ini
VITE_API_URL=/api
```

---

## 5. Build & Process Management

### Step 1: Clone and Install
```bash
cd /var/www
sudo git clone https://github.com/sarathyprasad/hacktoberfest2026.git prithvifix
cd prithvifix

# Install dependencies
npm --prefix backend install --production=false
npm --prefix frontend install
```

### Step 2: Migrate and Seed Database
```bash
cd /var/www/prithvifix/backend
npm run seed
```

### Step 3: Build Frontend Production Artifacts
```bash
cd /var/www/prithvifix/frontend
npm run build
# Production files generated in /var/www/prithvifix/frontend/dist
```

### Step 4: Launch Backend with PM2
```bash
cd /var/www/prithvifix/backend
pm2 start src/index.js --name "prithvi-fix-api" -i max --max-memory-restart 500M
pm2 save
pm2 startup
```

---

## 6. Nginx Web Server & Reverse Proxy Configuration

Create `/etc/nginx/sites-available/prithvifix`:

```nginx
server {
    listen 80;
    server_name prithvifix.gov.in www.prithvifix.gov.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name prithvifix.gov.in www.prithvifix.gov.in;

    # SSL Certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/prithvifix.gov.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prithvifix.gov.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend Single Page Application
    root /var/www/prithvifix/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    # Static Assets Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/prithvifix /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Issue Free SSL Certificate
sudo certbot --nginx -d prithvifix.gov.in -d www.prithvifix.gov.in
```

---

## 7. Automated Database Backup Cron

Create `/etc/cron.daily/prithvifix-backup`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PGPASSWORD="Your_Super_Strong_Password_2026!" pg_dump -U prithvi_admin -h localhost prithvifix | gzip > "$BACKUP_DIR/prithvifix_$TIMESTAMP.sql.gz"

# Retain backups for 14 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +14 -delete
```
```bash
sudo chmod +x /etc/cron.daily/prithvifix-backup
```

---

## 8. Verification & Health Monitoring

```bash
# 1. Check API Health
curl -I https://prithvifix.gov.in/api/health

# 2. Check PM2 Status
pm2 status
pm2 logs prithvi-fix-api

# 3. Check Nginx Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```
