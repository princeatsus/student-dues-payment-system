const pool = require('../config/db');

// GET /api/student/dashboard - View balance, session, and recent transactions (US-1.1)
const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get active session
    const sessionResult = await pool.query(
      'SELECT * FROM academic_sessions WHERE is_active = TRUE LIMIT 1'
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'No active semester found' });
    }

    const session = sessionResult.rows[0];

    // Get student info
    const studentResult = await pool.query(
      'SELECT * FROM students WHERE id = $1',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    const student = studentResult.rows[0];

    // 1. Current Semester Dues Configuration
    const currentDuesResult = await pool.query(
      'SELECT amount FROM dues_configuration WHERE session_id = $1 AND student_level = $2',
      [session.id, student.current_level]
    );
    const currentDuesAmount = currentDuesResult.rows.length > 0 
      ? parseFloat(currentDuesResult.rows[0].amount) 
      : 0;

    // 2. Current Semester Paid
    const currentPaidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid 
       FROM transactions 
       WHERE student_id = $1 AND session_id = $2 AND status IN ('PAID', 'RECONCILED')`,
      [studentId, session.id]
    );
    const currentPaidAmount = parseFloat(currentPaidResult.rows[0].total_paid);

    // 3. Past Semesters Carryover Balance
    const pastDuesConfigResult = await pool.query(
      `SELECT COALESCE(SUM(dc.amount), 0) as total_past_dues
       FROM dues_configuration dc
       JOIN academic_sessions as2 ON dc.session_id = as2.id
       WHERE dc.session_id != $1 AND dc.student_level <= $2`,
      [session.id, student.current_level]
    );
    const totalPastDues = parseFloat(pastDuesConfigResult.rows[0].total_past_dues);

    const pastPaidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_past_paid 
       FROM transactions 
       WHERE student_id = $1 AND session_id != $2 AND status IN ('PAID', 'RECONCILED')`,
      [studentId, session.id]
    );
    const totalPastPaid = parseFloat(pastPaidResult.rows[0].total_past_paid);

    const carryoverBalance = Math.max(0, totalPastDues - totalPastPaid);
    const currentOutstanding = Math.max(0, currentDuesAmount - currentPaidAmount);
    const totalOutstanding = currentOutstanding + carryoverBalance;
    const totalPaid = currentPaidAmount + totalPastPaid;

    // Check for HOD Override
    const overrideResult = await pool.query(
      'SELECT id, reason FROM exam_clearance_overrides WHERE student_id = $1 AND session_id = $2 AND is_active = TRUE',
      [studentId, session.id]
    );
    const hasOverride = overrideResult.rows.length > 0;
    const overrideReason = hasOverride ? overrideResult.rows[0].reason : null;

    // Get 5 recent transactions
    const recentTxResult = await pool.query(
      `SELECT t.*, as2.academic_year, as2.semester 
       FROM transactions t
       JOIN academic_sessions as2 ON t.session_id = as2.id
       WHERE t.student_id = $1 
       ORDER BY t.created_at DESC LIMIT 5`,
      [studentId]
    );

    res.status(200).json({
      student: {
        id: student.id,
        full_name: student.full_name,
        index_number: student.index_number,
        level: student.current_level,
        class_group: student.class_group
      },
      session: {
        academic_year: session.academic_year,
        semester: session.semester
      },
      balance: {
        current_dues: `₵${currentDuesAmount.toFixed(2)}`,
        current_paid: `₵${currentPaidAmount.toFixed(2)}`,
        current_outstanding: `₵${currentOutstanding.toFixed(2)}`,
        previous_balance: `₵${carryoverBalance.toFixed(2)}`,
        total_outstanding: `₵${totalOutstanding.toFixed(2)}`,
        total_paid: `₵${totalPaid.toFixed(2)}`,
        status: totalOutstanding <= 0 ? 'CLEARED' : 'OWING',
        has_override: hasOverride,
        override_reason: overrideReason
      },
      recent_transactions: recentTxResult.rows
    });
  } catch (error) {
    console.error('Student dashboard error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/student/transactions/history - Paginated statement list with semester/level filter (US-8.2)
const getTransactionsHistory = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { level } = req.query; // optional level filter (100, 200, 300, 400)

    let query = `
      SELECT t.*, as2.academic_year, as2.semester 
      FROM transactions t
      JOIN academic_sessions as2 ON t.session_id = as2.id
      WHERE t.student_id = $1
    `;
    const params = [studentId];

    if (level) {
      // Find session IDs where the student level matches
      query += ` AND t.session_id IN (
        SELECT session_id FROM dues_configuration WHERE student_level = $2
      )`;
      params.push(parseInt(level));
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.status(200).json({ transactions: result.rows });
  } catch (error) {
    console.error('Transactions history error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/student/class-fund/status - Collection vs spending for student's level (US-7.2)
const getClassFundStatus = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get active session
    const sessionResult = await pool.query(
      'SELECT * FROM academic_sessions WHERE is_active = TRUE LIMIT 1'
    );
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'No active semester found' });
    }
    const session = sessionResult.rows[0];

    // Get student details
    const studentResult = await pool.query('SELECT current_level, class_group FROM students WHERE id = $1', [studentId]);
    const student = studentResult.rows[0];

    // 1. Total Collected for this level in active session
    // Sum of PAID/RECONCILED transactions for students of same level
    const collectionsResult = await pool.query(
      `SELECT COALESCE(SUM(t.amount), 0) as total_collected
       FROM transactions t
       JOIN students s ON t.student_id = s.id
       WHERE t.session_id = $1 AND s.current_level = $2 AND t.status IN ('PAID', 'RECONCILED')`,
      [session.id, student.current_level]
    );
    const totalCollected = parseFloat(collectionsResult.rows[0].total_collected);

    // 2. Total Disbursed Expenses for this level in active session
    const expensesResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_spent
       FROM expense_requests
       WHERE session_id = $1 AND target_level = $2 AND status = 'DISBURSED'`,
      [session.id, student.current_level]
    );
    const totalSpent = parseFloat(expensesResult.rows[0].total_spent);

    const currentBalance = totalCollected - totalSpent;

    // 3. List of approved/disbursed expenses for this level (US-7.2.2)
    const expenseListResult = await pool.query(
      `SELECT er.created_at as date, er.item_description as description, er.amount, u.full_name as approved_by
       FROM expense_requests er
       LEFT JOIN students u ON er.hod_approved_by = u.id
       WHERE er.session_id = $1 AND er.target_level = $2 AND er.status = 'DISBURSED'
       ORDER BY er.finance_disbursed_at DESC`,
      [session.id, student.current_level]
    );

    res.status(200).json({
      level: student.current_level,
      total_collected: totalCollected,
      total_spent: totalSpent,
      current_balance: currentBalance,
      recent_expenses: expenseListResult.rows
    });

  } catch (error) {
    console.error('Get class fund status error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getStudentDashboard,
  getTransactionsHistory,
  getClassFundStatus
};
