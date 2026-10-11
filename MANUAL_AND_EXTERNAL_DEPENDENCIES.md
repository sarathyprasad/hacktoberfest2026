# 📦 Manual and External Dependencies — Prithvi Fix

This document lists all libraries, drivers, runtime dependencies, and confirms the **zero external paid third-party API dependency guarantee** for the **Prithvi Fix Platform**.

---

## 1. 🛡️ Zero External Paid API Dependency Guarantee

The Prithvi Fix Platform is **100% self-contained and operates with zero external paid third-party dependencies**:

- **💳 Payment Processing**: Multi-channel simulated payment gateway (UPI QR / VPA, RuPay / Debit Card, Net Banking) with instant cryptographic transaction ID generation (`TXN-DEMO-2026-XXXXXX`) and statutory Form IV tax invoice generation.
- **📱 SMS & OTP Delivery**: Secure dual 4-digit OTP engine (Arrival OTP & Completion OTP) stored directly in the relational PostgreSQL booking ledger without third-party SMS vendor costs.
- **🗺️ Geocoding & Distance Calculation**: Mathematical Haversine formula calculating proximity between micro-coordinates across Khordha, Cuttack, and Puri districts. Leaflet maps render with open public tile layers.
- **🤖 Smart AI Demand Forecasting & Diagnostics**: Built-in predictive seasonal regression algorithms and diagnostic chat engine based on historical booking telemetry, weather directives, and standardized symptom taxonomies.

---

## 2. ⚙️ Backend Runtime Dependencies (`backend/package.json`)

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `express` | `^5.2.1` | Next-generation REST API web framework |
| `pg` | `^8.23.0` | High-performance PostgreSQL client with connection pooling and SSL |
| `jsonwebtoken` | `^9.0.3` | Cryptographic JWT token issuance and verification for stateless sessions |
| `bcryptjs` | `^3.0.3` | Password hashing with cryptographic salts (rounds: 10) |
| `cors` | `^2.8.6` | Cross-Origin Resource Sharing control and origin whitelisting |
| `helmet` | `^8.3.0` | HTTP security headers (CSP, HSTS, X-Frame-Options) |
| `morgan` | `^1.11.0` | HTTP request logging |
| `compression` | `^1.8.2` | Gzip response compression for high-throughput responses |
| `express-rate-limit` | `^8.7.0` | IP-based request rate limiting for brute-force and DDoS protection |
| `dotenv` | `^17.4.2` | Multi-environment configuration variable loader |
| `nodemon` *(dev)* | `^3.1.14` | Hot-reloading development server |

---

## 3. 🎨 Frontend Runtime Dependencies (`frontend/package.json`)

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `react` | `^19.2.8` | Core component library |
| `react-dom` | `^19.2.8` | React DOM renderer |
| `react-router-dom` | `^7.18.2` | Client-side routing with role-based route guards and SPA navigation |
| `leaflet` | `^1.9.4` | Interactive mobile-friendly GIS mapping for live route tracking |
| `lucide-react` | `^1.34.0` | Comprehensive modern SVG icon library |
| `tailwindcss` | `^3.4.19` | Utility-first CSS styling with official government design tokens |
| `postcss` *(dev)* | `^8.5.26` | CSS transformation engine |
| `autoprefixer` *(dev)* | `^10.5.4` | Vendor prefix post-processor |
| `vite` *(dev)* | `^8.2.2` | Next-generation frontend build tool and hot-module replacement server |
| `@vitejs/plugin-react` *(dev)* | `^6.1.0` | Fast Refresh plugin for React |

---

## 4. 💻 System & Runtime Requirements

| Component | Minimum Version | Recommended Version |
| :--- | :--- | :--- |
| **Node.js** | v18.0.0 LTS | v20.x or v22.x LTS |
| **npm** | v9.0.0 | v10.x |
| **PostgreSQL** | v14.0 | v15.x / v16.x |
| **Operating System** | Ubuntu 20.04+, Debian 11+, Windows 10/11, macOS 12+ | Ubuntu 22.04 LTS / Debian 12 |
| **Browser Support** | Chromium 90+, Firefox 90+, Safari 15+, Edge 90+ | Latest modern evergreen browser |
