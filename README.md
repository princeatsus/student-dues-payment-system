# 🎓 COMPSSA — Student Dues Payment & Expense Management System
### Department of Computer Science · Ho Technical University (HTU)

A secure, audit-compliant, and fully integrated dues payment portal and project expense transparency system, custom-engineered for the Ho Technical University Computer Science Department.

This project was built for the **COMPSSA Hackathon 2026**.

---

## 🚀 Live Demonstration Links
*   **Live Web Application (Vercel):** [https://student-dues-payment-system.vercel.app](https://student-dues-payment-system.vercel.app)
*   **Live API Server (Render):** [https://student-dues-payment-system.onrender.com](https://student-dues-payment-system.onrender.com)
*   **Database Engine:** PostgreSQL (hosted on Supabase)

---

## 🌟 Key Features

### 1. 🎓 Student Portal (Payer)
*   **Real-time ledger balance:** View current semester dues, historical outstanding balances, and recent payment logs.
*   **Payment gateway:** Generate a unique payment reference (e.g., `HTU-ELE-26-PXBO`) with QR code, then pay via **Paystack** inline checkout.
*   **Clearance slips:** Download a watermarked PDF Clearance Certificate with a verification QR code once the balance is cleared.

### 2. 📢 Course Representative Dashboard
*   **Isolated class roster:** Monitor payment status (Paid vs. Owing) strictly for students in their assigned level group.
*   **Email nudge engine:** Send automated reminder emails containing individual outstanding balances directly to defaulters (via Brevo).
*   **Roster export:** Download the roster as a CSV spreadsheet for offline record keeping.
*   **Expense requisitions:** File project expense requests with item descriptions, justifications, amounts, and quote attachments.

### 3. 🏛️ HOD (Head of Department) Portal
*   **Executive dashboard:** View overall dues collection efficiency (SVG ring) and class budget spend ratio (progress bar).
*   **Academic clearance overrides:** Grant temporary exam clearance on compassionate grounds — gate access is granted, but the financial ledger stays unchanged.
*   **Approvals workflow:** Approve or reject expense requests submitted by Course Reps (on `/expenses` and the HOD Expenses tab).

### 4. 💼 Departmental Accountant Workspace
*   **Dues configurator:** Configure dues amounts per academic year and level.
*   **Reconciliation wizard:** Upload MTN/Telecel Mobile Money statement CSV files to automatically match payment references and clear student dues in bulk.
*   **Manual reconciliation:** Assign unmatched CSV rows to students from the reconciliation wizard.
*   **Audit logging:** Append-only audit records for logins, overrides, payments, and expense actions (stored in the database).

### 5. 📡 Virtual IoT Gate Simulator (`/iot-gate`)
*   Simulates a physical turnstile gate connected to an **ESP8266 NodeMCU** microcontroller.
*   Scan student index numbers to simulate real-world hardware verification.
*   Flashes a **Green LED** and `🔓 GATE OPENED` for cleared students and HOD overrides, or a **Red LED** and `🔒 LOCKED` for defaulters, with real-time serial debug logs.

### 🔍 6. Public Verification Portal (`/verify`)
*   An unauthenticated lookup portal where employers or exams officers can search by **Index Number + Graduation Year** to verify clearance status without exposing exact financial amounts.

### ⚙️ 7. Demo Console (for judges & presentations)
*   Built-in **Demo Console** (bottom-right) lets you switch between **Student**, **Course Rep**, **Accountant**, and **HOD** views from a single Google login — no separate staff accounts required for walkthroughs.

---

## 🛠️ Technology Stack
*   **Frontend:** React (Vite), Tailwind CSS, responsive layout
*   **Backend:** Node.js, Express.js, JWT authentication
*   **Database:** PostgreSQL (Supabase)
*   **Auth:** Google OAuth (`@htu.edu.gh` domain restriction)
*   **Payments:** Paystack (inline checkout + server-side verification)
*   **Email:** Brevo transactional API (console fallback in development)
*   **Security:** AES-256-GCM email encryption at rest, rate limiting, append-only audit logs
*   **PDF:** jsPDF (client-side watermarked certificate generator)
*   **Hosting:** Vercel (frontend), Render (backend)

---

## ⚙️ Local Development Setup

### Prerequisites
*   Node.js (v18+)
*   NPM or Yarn
*   A PostgreSQL database (e.g., Supabase)
*   Google Cloud OAuth Client ID
*   Paystack test keys (optional for local payment testing)

### 1. Backend Setup
1. Open the `/backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file inside the `/backend` folder:
   ```env
   PORT=5000
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret_key
   ENCRYPTION_KEY=your_32_byte_hex_encryption_key
   PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret
   BREVO_API_KEY=your_brevo_api_key
   BREVO_SENDER_EMAIL=your_sender@htu.edu.gh
   ```
4. Initialize the database:
   Execute the SQL in `/backend/config/schema.sql` on your PostgreSQL database (tables, views, seeds). The server also auto-runs the schema on first connect if tables are missing.
5. Start the local server:
   ```bash
   node server.js
   ```

### 2. Frontend Setup
1. Open the `/frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file inside the `/frontend` folder:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
   VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
   VITE_DEMO_MODE=true
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Access the portal locally at `http://localhost:5173`.

---

## 🎬 Demo Walkthrough (quick guide)
1. Sign in with your **HTU Google account** at the login page.
2. Explore the **Student Dashboard** — balance, Paystack payment, PDF certificate.
3. Open **⚙️ Demo Console** → switch to **Accountant** → upload `momo_statement.csv` on `/reconcile`.
4. Switch to **Course Rep** → submit an expense, view class roster, send a reminder.
5. Switch to **HOD** → review defaulters, grant an override, approve expenses.
6. Open **IoT Gate** (`/iot-gate`) → scan cleared vs owing index numbers.
7. Open **Public Verify** (`/verify`) → look up clearance by index + graduation year.
