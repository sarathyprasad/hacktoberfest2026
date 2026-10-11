# 📡 Prithvi Fix — REST API Documentation

Base URL: `http://localhost:5000/api`  
Production Base URL: `/api` (or custom host URL)

All authenticated endpoints require the standard Bearer authentication header:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 📑 API Modules Overview

1. [Authentication & Session (`/api/auth`)](#1-authentication--session-apiauth)
2. [Citizen Profile & Addresses (`/api/profile`)](#2-citizen-profile--addresses-apiprofile)
3. [Services & Rate Card Catalog (`/api/services`)](#3-services--rate-card-catalog-apiservices)
4. [Public Worker Directory (`/api/workers`)](#4-public-worker-directory-apiworkers)
5. [Smart Matching Engine (`/api/matching`)](#5-smart-matching-engine-apimatching)
6. [Bookings & OTP Lifecycle (`/api/bookings`)](#6-bookings--otp-lifecycle-apibookings)
7. [Worker Member Portal & Welfare (`/api/worker-portal`)](#7-worker-member-portal--welfare-apiworker-portal)
8. [Cooperative Societies & DCO Governance (`/api/societies`)](#8-cooperative-societies--dco-governance-apisocieties)
9. [Apex Federation & Tenders (`/api/federation`)](#9-apex-federation--tenders-apifederation)
10. [Payments & Form IV Invoicing (`/api/payments`)](#10-payments--form-iv-invoicing-apipayments)
11. [Ratings & Reviews (`/api/reviews`)](#11-ratings--reviews-apireviews)
12. [Smart AI Features & Demand Forecasting (`/api/smart-features`)](#12-smart-ai-features--demand-forecasting-apismart-features)
13. [Multi-Lingual Localization (`/api/localization`)](#13-multi-lingual-localization-apilocalization)
14. [Governance, Safety & Appliance Lineage (`/api/governance`)](#14-governance-safety--appliance-lineage-apigovernance)

---

## 1. Authentication & Session (`/api/auth`)

### `POST /api/auth/register`
Register a new customer citizen or artisan worker member.
- **Request Body**:
  ```json
  {
    "name": "Ananya Patel",
    "email": "ananya@example.com",
    "phone": "+91 98765 43210",
    "password": "password123",
    "role": "CUSTOMER",
    "district": "Khordha",
    "city": "Bhubaneswar",
    "address": "Plot 42, Patia",
    "pincode": "751024"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "User registered successfully",
    "token": "eyJhbGciOi...",
    "user": { "id": 14, "name": "Ananya Patel", "role": "CUSTOMER", "email": "ananya@example.com" }
  }
  ```

### `POST /api/auth/login`
Authenticate existing user and retrieve session token.
- **Request Body**:
  ```json
  { "email": "customer@demo.local", "password": "password123" }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": 4,
      "name": "Ananya Patel",
      "role": "CUSTOMER",
      "email": "customer@demo.local",
      "district": "Khordha"
    }
  }
  ```

### `GET /api/auth/me`
Retrieve currently authenticated user session.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Current user profile with affiliated worker and cooperative metadata.

### `POST /api/auth/logout`
Revoke active session token.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: `{ "message": "Logged out successfully" }`

---

## 2. Citizen Profile & Addresses (`/api/profile`)

### `PUT /api/profile`
Update user profile information (phone, address, avatar).

### `GET /api/profile/addresses`
List all saved delivery/service addresses for the authenticated customer.

### `POST /api/profile/addresses`
Create a new saved location bookmark (Home, Office, Parents, etc.) with coordinates.

### `PUT /api/profile/addresses/:id` & `DELETE /api/profile/addresses/:id`
Modify or delete an existing saved address.

---

## 3. Services & Rate Card Catalog (`/api/services`)

### `GET /api/services`
Retrieve government-regulated public trade services.
- **Query Parameters**:
  - `category` *(optional)*: Filter by trade category (e.g. `Electrical`, `Plumbing`)
  - `district` *(optional)*: Filter by administrative district (`Khordha`, `Cuttack`, `Puri`)
  - `search` *(optional)*: Search query string
- **Response `200 OK`**:
  ```json
  {
    "services": [
      {
        "id": 1,
        "name": "Ceiling Fan Repair & Capacitor Replacement",
        "category": "Electrical",
        "base_rate": 249,
        "duration_minutes": 45,
        "district": "Khordha",
        "available_workers": 6
      }
    ]
  }
  ```

### `GET /api/services/rate-card`
Retrieve the complete regulated cooperative tariff rate card across all trades with standardized labour rates and parts pricing.

### `GET /api/services/categories`
List all 12 active trade classifications and worker counts.

### `GET /api/services/:id`
Retrieve detailed service specifications, included/excluded checklists, and equipment requirements.

---

## 4. Public Worker Directory (`/api/workers`)

### `GET /api/workers`
Browse verified artisan directory with DPDP Act-compliant PII masking.
- **Query Parameters**: `trade`, `district`, `verified` (`true`/`false`), `search`
- **Response `200 OK`**:
  ```json
  {
    "workers": [
      {
        "id": 7,
        "name": "Ramesh Kumar",
        "primary_trade": "Electrical",
        "experience_years": 12,
        "rating": 4.9,
        "review_count": 38,
        "verification_status": "VERIFIED",
        "district": "Khordha",
        "phone": "+91 98765 XXXXX"
      }
    ]
  }
  ```

### `GET /api/workers/:id`
Retrieve full public artisan dossier, including verified skill badges, trade certifications, completed jobs count, and customer reviews.

---

## 5. Smart Matching Engine (`/api/matching`)

### `POST /api/matching/recommend`
Calculate composite weighted recommendation ranking for available artisans.
- **Request Body**:
  ```json
  {
    "serviceId": 1,
    "district": "Khordha",
    "city": "Bhubaneswar",
    "isEmergency": false
  }
  ```
- **Algorithm**:
  $$\text{Composite Score} = (\text{Skill Match} \times 0.50) + (\text{Proximity} \times 0.30) + (\text{Availability} \times 0.20)$$
- **Response `200 OK`**: Ranked list of verified artisans with score breakdown and distance estimates.

---

## 6. Bookings & OTP Lifecycle (`/api/bookings`)

### `POST /api/bookings`
Place a new service booking order.
- **Headers**: `Authorization: Bearer <token>` (Customer)
- **Request Body**:
  ```json
  {
    "serviceId": 1,
    "workerId": 7,
    "scheduledDate": "2026-10-15",
    "scheduledTime": "10:00 AM",
    "locationAddress": "Plot 42, Patia, Near KIIT",
    "locationCity": "Bhubaneswar",
    "locationDistrict": "Khordha",
    "locationPincode": "751024",
    "notes": "Fan humming loudly and wobbling",
    "isEmergency": false
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "booking": {
      "id": 13,
      "booking_code": "BKG-2026-0013",
      "status": "REQUESTED",
      "amount": 231.57,
      "cooperative_fee": 12.45,
      "platform_fee": 4.98,
      "total_amount": 249.00,
      "arrival_otp": "4821",
      "completion_otp": "7193"
    }
  }
  ```

### `GET /api/bookings`
List active and past bookings for the authenticated customer or worker.

### `GET /api/bookings/:id`
Retrieve detailed booking telemetry, assigned artisan details, itemized parts, and payment invoice status. *(Arrival and Completion OTPs are strictly redacted from artisan responses).*

### `POST /api/bookings/:id/verify-arrival-otp`
Artisan submits the 4-digit Arrival OTP upon reaching the customer doorstep.
- **Request Body**: `{ "otp": "4821" }`
- **Result**: Booking status transitions from `ACCEPTED` ➔ `IN_PROGRESS`.

### `POST /api/bookings/:id/verify-completion-otp`
Artisan submits the 4-digit Completion OTP after the customer inspects the repair.
- **Request Body**: `{ "otp": "7193" }`
- **Result**: Booking status transitions from `IN_PROGRESS` ➔ `COMPLETED`. Triggers 93% wage credit and 5% Mini-PF deposit.

### `POST /api/bookings/:id/add-parts`
Add standardized replacement parts from the locked cooperative catalog to the job bill.

---

## 7. Worker Member Portal & Welfare (`/api/worker-portal`)

### `GET /api/worker-portal/dashboard`
Retrieve artisan dashboard telemetry (gross earnings, net wage balance, completed jobs, rating, and incoming dispatch queue).

### `PUT /api/worker-portal/availability`
Update duty availability status.
- **Request Body**: `{ "availability": "AVAILABLE" }` (`AVAILABLE`, `BUSY`, `OFFLINE`)

### `PUT /api/worker-portal/jobs/:id/action`
Execute job dispatch action:
- **Request Body**: `{ "action": "ACCEPT" }` (`ACCEPT`, `DECLINE`, `START`, `COMPLETE`)

### `GET /api/worker-portal/welfare`
Retrieve social security welfare ledger (Mini-PF balance, ESIC policy, BOCW Cess contributions, and enrolled NSDC skill programs).

### `POST /api/worker-portal/welfare/enroll`
Simulate 1-click enrollment into a state-sponsored upskilling workshop or insurance benefit.

---

## 8. Cooperative Societies & DCO Governance (`/api/societies`)

### `POST /api/societies/register`
Submit digital registration for a new primary cooperative society with 10+ artisan promoters.

### `GET /api/societies/pending/dco`
Retrieve pending society registrations, approved societies, and inquiry dockets strictly within the authenticated DCO's district jurisdiction (`Khordha`, `Cuttack`, `Puri`).
- **Headers**: `Authorization: Bearer <DCO_TOKEN>`

### `POST /api/societies/:id/dco-review`
DCO approves or rejects a society registration application.
- **Request Body**:
  ```json
  {
    "status": "APPROVED",
    "dco_order_number": "DCO-KHD-2026-REG-0089",
    "audit_notes": "All 12 artisan promoters verified. Bylaws fully comply with 93-2-5 escrow model."
  }
  ```

### `PATCH /api/societies/:id/audit`
Update annual audit rating (Grade A/B/C) and verify statutory reserve fund balance.

### `POST /api/societies/inquiries`
Create or update a quasi-judicial inquiry docket under Section 68 of the Cooperative Societies Act.

---

## 9. Apex Federation & Tenders (`/api/federation`)

### `GET /api/federation/admin-dashboard`
Retrieve statewide executive telemetry, cross-district booking volume, and mutual aid proposals.

### `GET /api/federation/tenders`
List available institutional bulk facility management tenders from universities, hospitals, and government housing complexes.

### `POST /api/federation/disputes/:id/resolve`
Resolve escalated member or consumer dispute tickets.

---

## 10. Payments & Form IV Invoicing (`/api/payments`)

### `POST /api/payments/process`
Process simulated payment via UPI, RuPay / Debit Card, or Net Banking.
- **Request Body**:
  ```json
  {
    "bookingId": 13,
    "paymentMethod": "UPI_QR",
    "amount": 249.00
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "transactionId": "TXN-DEMO-2026-981245",
    "paymentStatus": "PAID"
  }
  ```

### `GET /api/payments/invoice/:bookingId`
Retrieve the official **Form IV Tax Invoice** with itemized breakdown of the 93-2-5 escrow split, customer/artisan particulars, and digital verification seal.

---

## 11. Ratings & Reviews (`/api/reviews`)

### `POST /api/reviews`
Submit citizen feedback, 1–5 star rating, and workmanship tags for completed jobs.
- **Request Body**:
  ```json
  {
    "bookingId": 13,
    "workerId": 7,
    "rating": 5,
    "comment": "Punctual, polite, and skilled. Completely fixed the ceiling fan issue without hassle.",
    "tags": ["Punctual", "Cooperative Certified", "Clean Work"]
  }
  ```

### `GET /api/reviews/worker/:workerId`
Retrieve all customer reviews and ratings for a specific artisan.

---

## 12. Smart AI Features & Demand Forecasting (`/api/smart-features`)

### `POST /api/smart-features/ai-chat`
AI-powered diagnostic chatbot helping citizens troubleshoot appliance problems and recommending appropriate services.

### `GET /api/smart-features/forecast`
Retrieve 4-week predictive demand forecasts across districts based on weather patterns and seasonal data.

### `GET /api/smart-features/allocation`
Retrieve regional supply-versus-demand gap matrix and mutual aid recommendations.

### `POST /api/smart-features/mutual-aid/:id/approve`
Authorize inter-cooperative temporary workforce deployment.

---

## 13. Multi-Lingual Localization (`/api/localization`)

### `GET /api/localization/languages`
List supported regional languages: `EN` (English), `HI` (Hindi), `OR` (Odia), `BN` (Bengali), and `TE` (Telugu).

### `GET /api/localization/:lang`
Retrieve the complete dictionary of terms for the specified language code.

### `GET /api/localization/translate?key=portalTitle&lang=or`
Dynamically translate specific phrases into any supported regional language.

---

## 14. Governance, Safety & Appliance Lineage (`/api/governance`)

### `POST /api/governance/sos`
Trigger emergency panic alert from an on-duty artisan or citizen. Transmits live coordinates to the federation emergency squad.

### `GET /api/governance/live-map`
Live spatial map of all active dispatches across Khordha, Cuttack, and Puri.

### `GET /api/governance/appliance-lineage`
Retrieve digital service passport and repair lineage history for household appliances.
