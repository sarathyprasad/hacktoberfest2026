# 📑 Prithvi Fix Platform — Core Manual Test Cases

This document outlines the detailed manual test cases for the core workflows of the **Prithvi Fix Platform**:
1. **TC-CUST-01**: Citizen End-to-End Service Order Booking with 93-2-5 Escrow Tariff
2. **TC-WRK-01**: Artisan Real-Time Dispatch Receipt, Audio Alert, and Order Acceptance
3. **TC-DCO-01**: District Cooperative Officer (DCO) Statutory Accreditation & Dossier Audit
4. **TC-SEC-01**: Security Verification (RBAC, Anti-IDOR, and DPDP Act PII Protection)

---

## 🔑 Test Environment & Credentials Reference

| Role | Portal URL | Login Email | Password | Pre-configured Persona |
| :--- | :--- | :--- | :--- | :--- |
| **👤 Citizen / Customer** | `/login` | `customer@demo.local` | `password123` | Ananya Patel (Patia, Bhubaneswar) |
| **👷 Skilled Artisan** | `/login?portal=worker` | `ramesh.w@demo.local` | `password123` | Ramesh Kumar (Master Electrician • Skill Certified) |
| **🏛️ DCO Khordha** | `/login?portal=admin` | `dco.khordha@demo.local` | `password123` | Debendra Nayak (District Cooperative Officer) |
| **🏢 Apex Federation Admin** | `/login?portal=admin` | `fedhead@demo.local` | `password123` | Arun Kumar Pattnaik (Statewide Governance) |

---

# 1. 👤 Customer Service Order Flow

### **Test Case ID: TC-CUST-01**
- **Title:** End-to-End Service Order Booking with 93-2-5 Escrow Tariff Transparency
- **Description:** Verify that an authenticated customer can explore standardized trade services, select service parameters, review the itemized cooperative escrow tariff breakdown, and successfully create a service order with generated OTPs.
- **Severity / Priority:** High / P1

#### **Pre-requisites:**
1. Prithvi Fix web application is running (`http://localhost:5173/` or Render URL).
2. Customer account is registered and authenticated (`customer@demo.local` / `password123`).
3. Standard trade services catalog is active in the target district (**Khordha** / Bhubaneswar).

---

#### **Execution Steps:**

| Step # | Action | Input / Test Data | Expected System Response | Validation Point |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Navigate to login page. | URL: `/login`<br>Role: `CUSTOMER` | Login modal renders with Citizen tab active. | Form inputs visible. |
| **2** | Enter customer credentials and submit. | Email: `customer@demo.local`<br>Password: `password123` | Redirects to `/book-service` or `/customer/bookings`. User greeting displays *"Ananya Patel"*. | JWT token stored; user session active. |
| **3** | Navigate to Booking Wizard. | URL: `/book-service` | 4-step interactive booking wizard renders on screen. | Step 1 active. |
| **4** | **Step 1: Select Trade & Service.** | Category: **Electrical**<br>Service: **Ceiling Fan Repair & Capacitor Replacement** | Service card highlights with base tariff **₹249**. Description and included checklist display. | Base price ₹249 populated in summary. |
| **5** | **Step 2: Location & Address Entry.** | District: **Khordha**<br>City: **Bhubaneswar**<br>Address: `Patia, Plot 42, Near KIIT Campus`<br>Pincode: `751024` | District dropdown selects Khordha; address form validates inputs without error. | Geocoding coordinates default to Bhubaneswar (`20.3540, 85.8170`). |
| **6** | **Step 3: Scheduling & Dispatch Mode.** | Schedule Date: Today's date<br>Time Slot: `10:00 AM - 12:00 PM`<br>Emergency Toggle: `OFF` (Standard) | Date and time slot selected; emergency badge remains normal (zero surge). | Zero surge pricing enforced. |
| **7** | **Step 4: Smart Matching & Tariff Review.** | Review Smart Matching list & Escrow Tariff summary. | 1. **Worker Ranking:** Algorithmic list ranks **Ramesh Kumar** (*Master Electrician • Skill Gold • 12 Yrs Exp • 1.2 km away*).<br>2. **93-2-5 Escrow Split:**<br>• *93% Worker Direct Living Wage:* **₹231.57**<br>• *5% PF & Accident Welfare:* **₹12.45**<br>• *2% Platform Maintenance:* **₹4.98**<br>• *Total Regulated Tariff:* **₹249.00** | Escrow transparency verified. Zero hidden booking fees. |
| **8** | Click **"Confirm Booking"**. | Click submission button. | 1. Button shows loading spinner.<br>2. Confirmation banner pops up with newly created **Booking Code** (e.g. `BKG-2026-0013`).<br>3. Redirects to Booking Details screen (`/bookings/:id`). | Booking record created in database with status `REQUESTED`. |
| **9** | Verify Security Credentials on Booking Screen. | View generated booking cards. | Screen displays: <br>• **Arrival OTP (4 Digits):** e.g., `4821`<br>• **Completion OTP (4 Digits):** e.g., `7193`<br>• Booking Status: `REQUESTED` / `PENDING_ACCEPTANCE`. | OTPs securely generated; customer instructed to share Arrival OTP only upon physical arrival. |

---

#### **Post-Conditions & Verification Checklist:**
- [x] Database record created in `bookings` table with status `REQUESTED`.
- [x] Arrival and Completion OTPs exist and are linked to the booking ID.
- [x] Escrow breakdown fields (`amount`, `cooperative_fee`, `platform_fee`, `total_amount`) correctly reflect the 93-2-5 ratio.
- [x] Order appears under Citizen's active bookings list at `/customer/bookings`.

---

# 2. 👷 Worker Job Assignment Flow

### **Test Case ID: TC-WRK-01**
- **Title:** Real-Time Job Dispatch Receipt, Inspection, and Order Acceptance
- **Description:** Verify that a registered cooperative artisan with status `AVAILABLE` receives real-time audio/visual notifications of incoming work requests in their locality, inspects payout and customer details, and accepts the job, updating status across both worker and customer portals.
- **Severity / Priority:** High / P1

#### **Pre-requisites:**
1. Worker account is registered, verified, and authenticated (`ramesh.w@demo.local` / `password123`).
2. Worker duty status is toggled to **`AVAILABLE`**.
3. A service order exists in status `REQUESTED` within the worker's trade specialization (*Electrical*) and district (*Khordha*).

---

#### **Execution Steps:**

| Step # | Action | Input / Test Data | Expected System Response | Validation Point |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Navigate to Worker Login portal. | URL: `/login?portal=worker` | Login page renders with Worker Portal tab highlighted. | Worker portal form active. |
| **2** | Submit worker credentials. | Email: `ramesh.w@demo.local`<br>Password: `password123` | Redirects to Worker Dashboard (`/worker-dashboard`). Worker header shows *"Ramesh Kumar (Master Electrician)"*. | Worker profile loaded; cooperative federation badge visible. |
| **3** | Check and set Duty Availability. | Click availability switch. | Status toggles to **`AVAILABLE (Duty On)`** with pulsating green indicator. | Database `workers.availability` set to `'AVAILABLE'`. |
| **4** | Await incoming dispatch order. | (Keep dashboard open; auto-poll runs every 3 seconds) | 1. **Audio Dispatch Alert:** System speech synthesizer announces aloud: *"New broadcast order in Bhubaneswar. Ceiling Fan Repair."*<br>2. **Incoming Job Card:** Broadcast alert card appears at top of queue. | Real-time dispatch listener triggers within 3 seconds. |
| **5** | Inspect Job Payout & Details. | Review incoming dispatch card. | Displays:<br>• Customer: **Ananya Patel**<br>• Location: **Patia, Bhubaneswar** (~3.9 km)<br>• Service: **Ceiling Fan Repair**<br>• **Guaranteed 93% Net Payout:** **₹231.57** (No agency commissions deducted). | Net wage matches 93% of base tariff. |
| **6** | Click **"✓ Accept Job"**. | Click green acceptance button. | 1. Job card shows *"Accepting..."* state.<br>2. Job disappears from Incoming Queue and moves into **"Active Work Orders"**.<br>3. Order Status changes from `REQUESTED` ➔ **`ACCEPTED`**. | API call `PUT /api/worker-portal/jobs/:id/action` returns `{ status: 'ACCEPTED' }`. |
| **7** | **Validation on Customer Screen:** Switch to Customer window (`/bookings/:id`). | View Customer Booking Detail page. | 1. Status automatically reflects **`ACCEPTED`**.<br>2. Assigned artisan card displays: *"Ramesh Kumar (Master Electrician)"* with phone contact.<br>3. **Live Route Map** initializes showing navigation path from worker's base (Rasulgarh) to customer (Patia). | Real-time status sync confirmed across both users. |
| **8** | Verify Transit Telemetry on Customer Screen. | Inspect navigation telemetry banner. | Displays:<br>• `GPS Status: Live`<br>• `Transit Distance: ~3.9 km`<br>• `Speed: 28 km/h`<br>• `ETA: ~13 Mins`. | Driving telemetry verified without errors. |

---

#### **Post-Conditions & Verification Checklist:**
- [x] Booking `status` in database updated to `'ACCEPTED'`.
- [x] Booking `worker_id` assigned to Ramesh Kumar (Worker ID: 7).
- [x] Job appears in Worker's Active Orders list on `/worker-dashboard`.
- [x] Customer screen displays live route tracking and worker contact.

---

# 3. 🏛️ District Cooperative Officer (DCO) Statutory Flow

### **Test Case ID: TC-DCO-01**
- **Title:** DCO Review, Statutory Dossier Audit, and Primary Society Accreditation
- **Description:** Verify that a District Cooperative Officer can log in to their district console, inspect pending artisan applications and society dossiers, audit trade certifications and statutory bylaws, and approve accreditation strictly within their jurisdiction.
- **Severity / Priority:** High / P1

#### **Pre-requisites:**
1. DCO Khordha account is authenticated (`dco.khordha@demo.local` / `password123`).
2. A society registration exists with status **`PENDING_DCO_APPROVAL`** in Khordha district.

---

#### **Execution Steps:**

| Step # | Action | Input / Test Data | Expected System Response | Validation Point |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Navigate to Admin Login portal. | URL: `/login?portal=admin` | Login modal renders with Cooperative Administration portal selected. | Admin login form active. |
| **2** | Enter DCO credentials. | Email: `dco.khordha@demo.local`<br>Password: `password123` | Redirects to DCO Console (`/dco/dashboard` or `/admin`). Header displays *"Debendra Nayak (DCO Khordha)"*. | Role `COOPERATIVE_ADMIN` authorized. |
| **3** | Inspect Board KPI Ribbon. | Review top statistics summary. | Displays Total Artisans, Pending Accreditations, District Federation Coverage, and Active Gigs. | Real-time registry stats loaded from `/api/admin/dashboard`. |
| **4** | Open **"Artisan Registry & Verification"** tab. | Click registry tab. | Table renders listing registered artisans across Khordha district. | Strict district boundary isolation active. |
| **5** | Filter by Pending Status. | Select filter dropdown: **"Pending Review"**. | Table filters to show pending applicants with amber badge: <br>`[⏳ PENDING]` *Verification Required*. | Status filter operates correctly. |
| **6** | Open Applicant Dossier. | Click **"View Dossier"** button next to applicant. | Full-screen **Artisan Statutory Accreditation Dossier Modal** opens. | Dossier modal renders with 4 audit sections. |
| **7** | **Audit Section 1: Identity & Background.** | Review Personal Details. | Displays: Full Name, Contact Mobile, District, Pincode, Primary Trade, Experience Years, and Police Clearance status. | Verified background details present. |
| **8** | **Audit Section 2: Trade Licenses & Certifications.** | Review Trade Qualifications. | Displays: Skill Certificate Number (e.g., `CERT-BBSR-2014-E1024`), Issuing Organization (*State Skill Council Bhubaneswar*), Issue Date, and NCVT/CESL License. | Trade qualification verified. |
| **9** | **Audit Section 3: Tooling & Safety Compliance.** | Review Tool Inventory. | Displays list of tools owned: *Digital Multimeter, Heavy Hammer Drill, Insulated Hand Tools, Safety Helmet & High-Voltage Gloves*. | Safety compliance verified. |
| **10** | **Audit Section 4: KYC & Direct 93% Banking.** | Review Statutory KYC. | Displays: Masked Aadhaar (`XXXX-XXXX-8821`), PAN Card, Bank Name (*State Bank of India*), Account No (`••••8821`), IFSC Code, and Nominee Contact. | Direct wage payout destination verified. |
| **11** | Click **"✓ Approve & Issue State Accreditation"**. | Click green approval button in modal. | 1. Button shows *"Accrediting..."* state.<br>2. Success toast notification: *"Artisan accredited successfully."*<br>3. Modal closes or updates status. | API call `PUT /api/admin/workers/:id/verify` sent with `{ status: 'VERIFIED' }`. |
| **12** | **Validation in Public Search Directory:** Open `/book-service` or `/find-worker`. | Search for newly approved artisan's name or trade. | 1. The artisan now displays a green **`[✓ SKILL VERIFIED]`** badge.<br>2. Artisan appears in public smart-matching recommendations and is eligible for customer booking dispatches. | Worker activated on public directory. |

---

#### **Post-Conditions & Verification Checklist:**
- [x] Database `workers.verification_status` updated from `'PENDING'` to `'VERIFIED'`.
- [x] `reviewed_by_admin_id` and `reviewed_at` timestamps recorded in database.
- [x] Worker receives eligibility flag to receive incoming booking broadcasts.
- [x] Worker profile displays verified shield icon across platform directories.

---

# 4. 🔒 Security & Data Protection Verification

### **Test Case ID: TC-SEC-01**
- **Title:** Automated RBAC, Anti-IDOR, and DPDP Act PII Sanitization
- **Description:** Verify that unauthenticated requests to administrative endpoints are blocked, cross-district modifications by DCOs are forbidden, customer OTPs are isolated from workers, and sensitive PII is masked in public responses.
- **Severity / Priority:** Critical / P0

#### **Pre-requisites:**
1. Prithvi Fix backend server running on `http://localhost:5000`.

#### **Execution Steps:**
Run the automated security suite:
```bash
cd backend
node test_security.js
node test_all_dcos.js
```

#### **Expected Validation Points:**
- [x] Unauthenticated access to `/api/federation/admin-dashboard` returns `401 Unauthorized`.
- [x] Unauthenticated access to `/api/federation/treasurer-dashboard` returns `401 Unauthorized`.
- [x] Public worker directory masks phone numbers (`+91 98765 XXXXX`).
- [x] Public worker profiles mask Aadhaar and bank accounts (`XXXX-XXXX-...`).
- [x] Logout properly invalidates JWT session token on subsequent calls.
- [x] Worker booking detail endpoint completely redacts `arrival_otp` and `completion_otp`.
- [x] Khordha DCO attempting to modify Cuttack society returns `403 Forbidden`.

---

## 🔁 Complete Cross-Workflow Validation Summary

| Test Stage | Role | Action | System Status Transition |
| :---: | :---: | :--- | :---: |
| **Stage 1** | 🏛️ DCO Khordha | Audits pending artisan dossier and clicks "Approve". | `PENDING` ➔ **`VERIFIED`** |
| **Stage 2** | 👷 Worker | Logs in, confirms status is `AVAILABLE`, and waits on dashboard. | Worker active in dispatch pool |
| **Stage 3** | 👤 Customer | Books Ceiling Fan repair in Khordha district; reviews 93-2-5 tariff. | **`REQUESTED`** (Arrival OTP: `4821`) |
| **Stage 4** | 👷 Worker | Receives instant audio alert; clicks "Accept Job". | `REQUESTED` ➔ **`ACCEPTED`** |
| **Stage 5** | 👤 Customer | Views live route tracking and worker ETA (~13 mins). | Real-time GPS active |
| **Stage 6** | 👷 Worker | Arrives on-site; enters Customer's Arrival OTP (`4821`). | `ACCEPTED` ➔ **`IN_PROGRESS`** |
| **Stage 7** | 👷 Worker | Adds ₹110 Fan Capacitor from locked catalog; enters Completion OTP (`7193`). | `IN_PROGRESS` ➔ **`COMPLETED`** |
| **Stage 8** | 👤 Customer | Pays via UPI; downloads statutory Form IV Tax Invoice; rates artisan. | Paid + 30-Day Warranty Armed |
| **Stage 9** | 👷 Worker | Checks `/worker-portal/welfare`; verifies 5% contribution deposited into Mini-PF. | Social security credited |
