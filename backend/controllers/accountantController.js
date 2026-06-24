const pool = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// GET /api/accountant/transactions - View all transactions
const getAllTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.full_name, u.index_number, u.current_level,
              as2.academic_year, as2.semester
       FROM transactions t
       JOIN users u ON t.student_id = u.id
       JOIN academic_sessions as2 ON t.session_id = as2.id
       ORDER BY t.created_at DESC`
    );

    res.status(200).json({ transactions: result.rows });

  } catch (error) {
    console.error('Get transactions error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/accountant/transactions/:id/confirm - Confirm a payment
const confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, notes } = req.body;
    const accountantId = req.user.id;

    // Check transaction exists
    const transactionResult = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    if (transaction.status === 'PAID' || transaction.status === 'RECONCILED') {
      return res.status(400).json({ message: 'Transaction already confirmed' });
    }

    // Update transaction status
    const updated = await pool.query(
      `UPDATE transactions 
       SET status = 'RECONCILED', 
           reconciled_by = $1, 
           reconciled_at = NOW(),
           payment_method = $2,
           notes = $3
       WHERE id = $4
       RETURNING *`,
      [accountantId, payment_method || transaction.payment_method, notes, id]
    );

    // Log action in audit logs
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        accountantId,
        'PAYMENT_CONFIRMED',
        'TRANSACTION',
        id,
        JSON.stringify({ status: 'PENDING' }),
        JSON.stringify({ status: 'RECONCILED', confirmed_by: accountantId })
      ]
    );

    res.status(200).json({
      message: 'Payment confirmed successfully',
      transaction: updated.rows[0]
    });

  } catch (error) {
    console.error('Confirm payment error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/accountant/students - View all students with balance
const getAllStudents = async (req, res) => {
  try {
    // Get active session
    const sessionResult = await pool.query(
      'SELECT * FROM academic_sessions WHERE is_active = TRUE LIMIT 1'
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'No active semester found' });
    }

    const session = sessionResult.rows[0];

    const result = await pool.query(
      `SELECT 
        u.id, u.full_name, u.index_number, u.current_level, u.class_group, u.email,
        dc.amount as total_dues,
        COALESCE(SUM(CASE WHEN t.status IN ('PAID', 'RECONCILED') THEN t.amount ELSE 0 END), 0) as total_paid,
        dc.amount - COALESCE(SUM(CASE WHEN t.status IN ('PAID', 'RECONCILED') THEN t.amount ELSE 0 END), 0) as outstanding,
        CASE 
          WHEN dc.amount - COALESCE(SUM(CASE WHEN t.status IN ('PAID', 'RECONCILED') THEN t.amount ELSE 0 END), 0) <= 0 
          THEN 'CLEARED' 
          ELSE 'OWING' 
        END as status
       FROM users u
       LEFT JOIN dues_configuration dc ON dc.student_level = u.current_level AND dc.session_id = $1
       LEFT JOIN transactions t ON t.student_id = u.id AND t.session_id = $1
       WHERE u.role = 'STUDENT'
       GROUP BY u.id, u.full_name, u.index_number, u.current_level, u.class_group, u.email, dc.amount
       ORDER BY u.current_level, u.full_name`,
      [session.id]
    );

    res.status(200).json({
      session: {
        academic_year: session.academic_year,
        semester: session.semester
      },
      students: result.rows
    });

  } catch (error) {
    console.error('Get all students error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllTransactions, confirmPayment, getAllStudents };