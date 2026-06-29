const pool = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Helper to check base64 file size limit (2MB)
// Base64 has ~33% overhead, so a 2MB binary file equates to roughly 2,720,000 characters.
const validateBase64Size = (base64Str) => {
  if (!base64Str) return true;
  return base64Str.length <= 2.7 * 1024 * 1024;
};

// POST /api/expenses - Submit expense request (US-7.1.1)
const submitExpenseRequest = async (req, res) => {
  try {
    const { 
      item_description, 
      amount, 
      vendor_name, 
      purpose_justification, 
      target_level, 
      target_class_group, 
      attachment_url 
    } = req.body;
    const requestedBy = req.user.id;

    // Get active session
    const sessionResult = await pool.query(
      'SELECT * FROM academic_sessions WHERE is_active = TRUE LIMIT 1'
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'No active semester found' });
    }

    const session = sessionResult.rows[0];

    // Validate required fields
    if (!item_description || !amount || !purpose_justification || !target_level) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    // Enforce 2MB size limit on attachments (NFR-PERF-03)
    if (attachment_url && !validateBase64Size(attachment_url)) {
      return res.status(400).json({ message: 'Supporting document exceeds the maximum 2MB size limit.' });
    }

    // Create expense request
    const result = await pool.query(
      `INSERT INTO expense_requests 
       (session_id, requested_by, target_level, target_class_group, item_description, amount, vendor_name, purpose_justification, attachment_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING_HOD')
       RETURNING *`,
      [session.id, requestedBy, target_level, target_class_group, item_description, amount, vendor_name, purpose_justification, attachment_url]
    );

    // Log action
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [requestedBy, 'EXPENSE_REQUESTED', 'EXPENSE_REQUEST', result.rows[0].id, JSON.stringify({ item_description, amount })]
    );

    res.status(201).json({
      message: 'Expense request submitted successfully. Awaiting HOD approval.',
      expense: result.rows[0]
    });

  } catch (error) {
    console.error('Submit expense error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/expenses - View expense requests (filtered by role)
const getExpenseRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT er.*, 
              u.full_name as requested_by_name,
              h.full_name as hod_approved_by_name,
              f.full_name as finance_disbursed_by_name,
              as2.academic_year, as2.semester
       FROM expense_requests er
       LEFT JOIN students u ON er.requested_by = u.id
       LEFT JOIN students h ON er.hod_approved_by = h.id
       LEFT JOIN students f ON er.finance_disbursed_by = f.id
       JOIN academic_sessions as2 ON er.session_id = as2.id
       ORDER BY er.created_at DESC`
    );

    res.status(200).json({ expenses: result.rows });

  } catch (error) {
    console.error('Get expenses error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/expenses/:id/approve - HOD approves
const approveExpenseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const hodId = req.user.id;

    const result = await pool.query(
      `UPDATE expense_requests
       SET status = 'PENDING_FINANCE', hod_approved_by = $1, hod_approved_at = NOW()
       WHERE id = $2 AND status = 'PENDING_HOD'
       RETURNING *`,
      [hodId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense request not found or already processed' });
    }

    // Log action
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [hodId, 'EXPENSE_APPROVED', 'EXPENSE_REQUEST', id, JSON.stringify({ status: 'PENDING_FINANCE' })]
    );

    res.status(200).json({
      message: 'Expense request approved. Sent to accountant for disbursement.',
      expense: result.rows[0]
    });

  } catch (error) {
    console.error('Approve expense error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/expenses/:id/reject - HOD rejects (US-7.1.4)
const rejectExpenseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const hodId = req.user.id;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const result = await pool.query(
      `UPDATE expense_requests
       SET status = 'REJECTED', hod_approved_by = $1, hod_approved_at = NOW(), hod_rejection_reason = $2
       WHERE id = $3 AND status = 'PENDING_HOD'
       RETURNING *`,
      [hodId, reason, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense request not found or already processed' });
    }

    // Log action
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [hodId, 'EXPENSE_REJECTED', 'EXPENSE_REQUEST', id, JSON.stringify({ reason })]
    );

    res.status(200).json({
      message: 'Expense request rejected.',
      expense: result.rows[0]
    });

  } catch (error) {
    console.error('Reject expense error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/expenses/:id/disburse - Accountant disburses and uploads Signed Receipt Voucher (US-7.1.5)
const disburseExpenseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { disbursement_proof_url } = req.body; // Signed Receipt Voucher base64
    const accountantId = req.user.id;

    // Enforce 2MB size limit on receipt upload (NFR-PERF-03)
    if (disbursement_proof_url && !validateBase64Size(disbursement_proof_url)) {
      return res.status(400).json({ message: 'Signed receipt voucher exceeds the maximum 2MB size limit.' });
    }

    const result = await pool.query(
      `UPDATE expense_requests
       SET status = 'DISBURSED', 
           finance_disbursed_by = $1, 
           finance_disbursed_at = NOW(),
           disbursement_proof_url = $2
       WHERE id = $3 AND status = 'PENDING_FINANCE'
       RETURNING *`,
      [accountantId, disbursement_proof_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense request not found or not yet approved by HOD' });
    }

    // Log action
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [accountantId, 'EXPENSE_DISBURSED', 'EXPENSE_REQUEST', id, JSON.stringify({ status: 'DISBURSED' })]
    );

    res.status(200).json({
      message: 'Payment disbursed and receipt voucher logged successfully.',
      expense: result.rows[0]
    });

  } catch (error) {
    console.error('Disburse expense error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { 
  submitExpenseRequest, 
  getExpenseRequests, 
  approveExpenseRequest, 
  rejectExpenseRequest, 
  disburseExpenseRequest 
};