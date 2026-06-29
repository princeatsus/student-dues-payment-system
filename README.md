# 🎓 COMPSSA — Student Dues Payment & Expense Management System
### Department of Computer Science · Ho Technical University (HTU)

A secure, audit-compliant, and fully integrated dues payment portal and project expense transparency system, custom-engineered for the Ho Technical University Computer Science Department. 

This project was built for the **COMPSSA Hackathon 2026**.

---

## 🚀 Live Demonstration Links
*   **Live Web Application (Vercel):** `https://student-dues-payment-system.vercel.app` *(Note: If Vercel assigned a suffix, replace this with your actual URL)*
*   **Live API Server (Render):** [https://student-dues-payment-system.onrender.com](https://student-dues-payment-system.onrender.com)
*   **Database Engine:** PostgreSQL (Hosted on Supabase with Row-Level Security active)

---

## 🌟 Key Features

### 1. 🎓 Student Portal (Payer)
*   **Real-time Ledger balance:** View current semester dues, historical outstanding balances, and recent payment logs.
*   **Simulated Momo Gateway:** Generate a unique 12-character alphanumeric payment reference (e.g., `HTU-ELE-26-PXBO`), scan a generated QR code, or trigger a simulated MTN/Telecel mobile money prompt.
*   **Clearance Slips:** Generate and download a watermarked PDF Clearance Certificate containing student details and a secure verification QR code once the balance is cleared.

### 2. 📢 Course Representative Dashboard
*   **Isolated Class Roster:** Monitor payment status (Paid vs. Owing) strictly for students in their assigned level group.
*   **Email Nudge Engine:** Send automated reminder emails containing individual outstanding balances directly to defaulters.
*   **Roster Export:** Download the roster database as a spreadsheet for offline record keeping.
*   **Expense Requisitions:** File project expense requests to draw from class project funds, specifying item descriptions, justifications, amounts, and quotes.

### 3. 🏛️ HOD (Head of Department) Portal
*   **Executive Dashboard:** View visual metrics like overall dues collection efficiency (SVG ring) and class budget spend ratio (linear progress bar).
*   **Academic Clearance Overrides:** Grant temporary clearance to students with financial hardships on compassionate grounds. This logs a reason, bypasses the exam hall gate, but leaves their financial ledger intact.
*   **Approvals Workflow:** Approve or reject expense requests submitted by Course Reps.

### 4. 💼 Departmental Accountant Workspace
*   **Dues Configurator:** Configure dues amounts per academic year and level.
*   **Reconciliation Wizard:** Drag and drop MTN/Telecel Mobile Money statement CSV files to automatically match references and auto-clear student dues in bulk.
*   **Manual Entry & Audit Logs:** Log cash payments manually. An append-only audit trail logs every system action (logins, overrides, manual payments) with timestamps and actor details.

### 5. 📡 Virtual IoT Gate Simulator (`/iot-gate`)
*   Simulates a physical turnstile gate connected to an **ESP8266 NodeMCU** microcontroller.
*   Scan student index numbers to simulate real-world hardware verification.
*   The virtual controller flashes a **Green LED** and rotates to `🔓 GATE OPENED` for cleared students and HOD overrides, or flashes a **Red LED** and keeps the gate `🔒 LOCKED` for defaulters, printing debug logs in real-time.

### 🔍 6. Public Verification Portal (`/verify`)
*   An unauthenticated lookup portal where third-party employers or exams officers can search by **Index Number + Graduation Year** to verify a student's clearance status without exposing their exact financial details.

---

## 🛠️ Technology Stack
*   **Frontend:** React (Vite), Vanilla CSS (glassmorphic styling, responsive layout).
*   **Backend:** Node.js, Express.js.
*   **Database:** PostgreSQL (Supabase cloud database with RLS policies).
*   **PDF Engine:** jsPDF (Client-side watermarked generator).
*   **Hosting:** Vercel (Frontend), Render (Backend).

---

## ⚙️ Local Development Setup

### Prerequisites
*   Node.js (v18+)
*   NPM or Yarn
*   A PostgreSQL Database (e.g., Supabase)

### 1. Backend Setup
1. Open the `/backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file inside the `/backend` folder and add:
   ```env
   PORT=5000
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```
4. Seed the database schemas:
   Execute the SQL statements in `/backend/config/schema.sql` on your PostgreSQL database to set up tables, views, RLS policies, and academic session seeds.
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
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the portal locally at `http://localhost:5173`.