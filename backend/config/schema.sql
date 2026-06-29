-- ====================================================================
-- HTU COMPSSA HACKATHON 2026 - DATABASE SCHEMA
-- Secured Student Dues Payment & Expense Management System
-- Target Database: PostgreSQL (Supabase / Neon)
-- ====================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for clean deployment migrations)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'users' AND n.nspname = 'public' AND c.relkind = 'v') THEN
        DROP VIEW public.users CASCADE;
    ELSIF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'users' AND n.nspname = 'public' AND c.relkind = 'r') THEN
        DROP TABLE public.users CASCADE;
    END IF;
END $$;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS exam_clearance_overrides CASCADE;
DROP TABLE IF EXISTS expense_requests CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS dues_configuration CASCADE;
DROP TABLE IF EXISTS academic_sessions CASCADE;
DROP TABLE IF EXISTS student_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- 1. Students Table (Users)
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub VARCHAR(255) UNIQUE NOT NULL,                       -- Google OAuth Unique Identifier
    index_number VARCHAR(10) UNIQUE NOT NULL,                     -- Student's 10-digit Index Number
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,                                  -- Encrypted at rest (AES-256)
    email_hash VARCHAR(64) UNIQUE NOT NULL,                       -- SHA-256 Hash of email for fast lookups
    phone_number VARCHAR(255),                                    -- Encrypted at rest (AES-256) (Optional, for MoMo Alerts)
    current_level INT CHECK (current_level BETWEEN 100 AND 400),  -- 100, 200, 300, 400
    class_group VARCHAR(10),                                      -- 'A', 'B', etc.
    is_active BOOLEAN DEFAULT TRUE,                               -- Suspended accounts marked FALSE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles Table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL                              -- STUDENT, COURSE_REP, ACCOUNTANT, HOD, ADMIN
);

-- 3. Student Roles Link Table (Support multi-role, e.g. Student + Course Rep)
CREATE TABLE student_roles (
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    assigned_class_group VARCHAR(10),                             -- For COURSE_REP: which group they manage (e.g. 'A')
    assigned_level INT,                                           -- For COURSE_REP: which level they manage (e.g. 200)
    PRIMARY KEY (student_id, role_id)
);

-- 4. Academic Sessions Table
CREATE TABLE academic_sessions (
    id SERIAL PRIMARY KEY,
    academic_year VARCHAR(9) NOT NULL,                            -- e.g. '2025/2026'
    semester INT CHECK (semester IN (1, 2)),                      -- 1 or 2
    is_active BOOLEAN DEFAULT FALSE,                              -- Only one active session at a time
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(academic_year, semester)
);

-- 5. Dues Configuration Table (Amount set per Level per Semester)
CREATE TABLE dues_configuration (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES academic_sessions(id) ON DELETE CASCADE,
    student_level INT CHECK (student_level BETWEEN 100 AND 400),
    amount DECIMAL(10, 2) NOT NULL,
    UNIQUE(session_id, student_level)
);

-- 6. Transactions Table (Dues Payments)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id INT REFERENCES academic_sessions(id),
    amount DECIMAL(10, 2) NOT NULL,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('PAYMENT', 'REFUND', 'ADJUSTMENT')) DEFAULT 'PAYMENT',
    payment_reference VARCHAR(50) UNIQUE NOT NULL,                -- e.g., HTU-ELE-26-AB12
    status VARCHAR(20) CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'RECONCILED')) DEFAULT 'PENDING',
    payment_method VARCHAR(20) CHECK (payment_method IN ('MOMO_MTN', 'MOMO_VODAFONE', 'CASH', 'BANK_TRANSFER')),
    reconciled_by UUID REFERENCES students(id),                   -- Accountant's student ID
    reconciled_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Expense Requests Table (Digital Requisition & Approval State Machine)
CREATE TABLE expense_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id INT REFERENCES academic_sessions(id),
    requested_by UUID REFERENCES students(id),                    -- Course Rep ID
    target_level INT CHECK (target_level BETWEEN 100 AND 400),    -- Expense targeting specific level
    target_class_group VARCHAR(10),                               -- Class group (A/B), NULL if whole level
    item_description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    vendor_name VARCHAR(255),
    purpose_justification TEXT NOT NULL,
    attachment_url TEXT,                                          -- URL to invoice quote or uploaded receipt image
    status VARCHAR(30) CHECK (status IN ('PENDING_HOD', 'PENDING_FINANCE', 'APPROVED', 'DISBURSED', 'REJECTED')) DEFAULT 'PENDING_HOD',
    hod_approved_by UUID REFERENCES students(id),
    hod_approved_at TIMESTAMP,
    hod_rejection_reason TEXT,
    finance_disbursed_by UUID REFERENCES students(id),
    finance_disbursed_at TIMESTAMP,
    disbursement_proof_url TEXT,                                  -- Accountant upload receipt voucher proof
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Exam Clearance Overrides Table (HOD Administrative Override)
CREATE TABLE exam_clearance_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id INT REFERENCES academic_sessions(id) ON DELETE CASCADE,
    overridden_by UUID REFERENCES students(id),                   -- HOD ID
    reason TEXT NOT NULL,                                         -- Must be >= 10 characters
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, session_id)                                -- One override per student per semester
);

-- 9. Audit Logs Table (Append-Only Transaction Log)
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES students(id),
    action VARCHAR(50) NOT NULL,                                  -- e.g., 'PAYMENT_RECONCILED', 'OVERRIDE_GRANTED'
    target_type VARCHAR(50) NOT NULL,                             -- e.g., 'TRANSACTION', 'STUDENT', 'EXPENSE_REQUEST'
    target_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- SEED DATA & INITIAL SETUP
-- ====================================================================

-- Insert Default Roles
INSERT INTO roles (name) VALUES 
('STUDENT'), 
('COURSE_REP'), 
('ACCOUNTANT'), 
('HOD'), 
('ADMIN')
ON CONFLICT (name) DO NOTHING;

-- Insert Default Academic Session
INSERT INTO academic_sessions (academic_year, semester, is_active) VALUES
('2025/2026', 2, TRUE)
ON CONFLICT (academic_year, semester) DO NOTHING;

-- Insert Default Dues Configuration
DO $$
DECLARE
    sess_id INT;
BEGIN
    SELECT id INTO sess_id FROM academic_sessions WHERE is_active = TRUE LIMIT 1;
    IF sess_id IS NOT NULL THEN
        INSERT INTO dues_configuration (session_id, student_level, amount) VALUES
        (sess_id, 100, 100.00),
        (sess_id, 200, 120.00),
        (sess_id, 300, 150.00),
        (sess_id, 400, 180.00)
        ON CONFLICT (session_id, student_level) DO NOTHING;
    END IF;
END $$;

-- ====================================================================
-- PERFORMANCE INDEXES (NFR-PERF-01, NFR-PERF-02 compliance)
-- ====================================================================
CREATE INDEX idx_transactions_student_id ON transactions(student_id);
CREATE INDEX idx_transactions_reference ON transactions(payment_reference);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_students_index_number ON students(index_number);
CREATE INDEX idx_students_level ON students(current_level);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_expense_requests_level ON expense_requests(target_level);
CREATE INDEX idx_clearance_overrides_student ON exam_clearance_overrides(student_id, session_id);

-- ====================================================================
-- BACKWARD COMPATIBILITY VIEW (users mapping to students/roles)
-- ====================================================================
CREATE OR REPLACE VIEW users AS
SELECT 
    s.id,
    s.google_sub,
    s.index_number,
    s.full_name,
    s.email,
    s.phone_number,
    s.current_level,
    s.class_group,
    s.is_active,
    s.created_at,
    r.name AS role,
    sr.assigned_class_group,
    sr.assigned_level
FROM students s
LEFT JOIN student_roles sr ON s.id = sr.student_id
LEFT JOIN roles r ON sr.role_id = r.id;

-- ====================================================================
-- DATABASE ROW-LEVEL SECURITY (RLS) ACTIVATION
-- ====================================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_clearance_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;


