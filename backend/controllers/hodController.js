const pool = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// GET /api/hod/defaulters - View students who haven't paid
const getDefaulters = async (req, res) => {
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
        CASE WHEN eco.id IS NOT NULL THEN TRUE ELSE FALSE END as has_override
       FROM users u
       LEFT JOIN dues_configuration dc ON dc.student_level = u.current_level AND dc.session_id = $1
       LEFT JOIN transactions t ON t.student_id = u.id AND t.session_id = $1
       LEFT JOIN exam_clearance_overrides eco ON eco.student_id = u.id AND eco.session_id = $1 AND eco.is_active = TRUE
       WHERE u.role IN ('STUDENT', 'COURSE_REP')
       GROUP BY u.id, u.full_name, u.index_number, u.current_level, u.class_group, u.email, dc.amount, eco.id
       HAVING dc.amount - COALESCE(SUM(CASE WHEN t.status IN ('PAID', 'RECONCILED') THEN t.amount ELSE 0 END), 0) > 0
       AND (eco.id IS NULL)
       ORDER BY u.current_level, outstanding DESC`,
      [session.id]
    );

    res.status(200).json({
      session: {
        academic_year: session.academic_year,
        semester: session.semester
      },
      total_defaulters: result.rows.length,
      defaulters: result.rows
    });

  } catch (error) {
    console.error('Get defaulters error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/hod/override - Grant exam clearance exception
const grantOverride = async (req, res) => {
  try {
    const { student_id, reason } = req.body;
    const hodId = req.user.id;

    if (!reason || reason.length < 10) {
      return res.status(400).json({ 
        message: 'Reason is required and must be at least 10 characters' 
      });
    }

    // Get active session
    const sessionResult = await pool.query(
      'SELECT * FROM academic_sessions WHERE is_active = TRUE LIMIT 1'
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'No active semester found' });
    }

    const session = sessionResult.rows[0];

    // Check if student exists
    const studentResult = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [student_id, 'STUDENT']
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const student = studentResult.rows[0];

    // Check if override already exists
    const existingOverride = await pool.query(
      'SELECT * FROM exam_clearance_overrides WHERE student_id = $1 AND session_id = $2',
      [student_id, session.id]
    );

    if (existingOverride.rows.length > 0) {
      return res.status(400).json({ message: 'Override already granted for this student this semester' });
    }

    // Create override
    const override = await pool.query(
      `INSERT INTO exam_clearance_overrides (student_id, session_id, overridden_by, reason)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, session.id, hodId, reason]
    );

    // Log action in audit logs
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        hodId,
        'OVERRIDE_GRANTED',
        'STUDENT',
        student_id,
        JSON.stringify({ 
          reason, 
          student_name: student.full_name,
          index_number: student.index_number,
          session: session.academic_year
        })
      ]
    );

    res.status(201).json({
      message: `Exam clearance granted for ${student.full_name}`,
      note: 'Financial balance remains unchanged. Only exam clearance flag is lifted.',
      override: override.rows[0]
    });

  } catch (error) {
    console.error('Grant override error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/hod/overrides - View all active overrides
const getAllOverrides = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT eco.*, 
              u.full_name as student_name, u.index_number, u.current_level,
              h.full_name as overridden_by_name,
              as2.academic_year, as2.semester
       FROM exam_clearance_overrides eco
       JOIN users u ON eco.student_id = u.id
       JOIN users h ON eco.overridden_by = h.id
       JOIN academic_sessions as2 ON eco.session_id = as2.id
       WHERE eco.is_active = TRUE
       ORDER BY eco.created_at DESC`
    );

    res.status(200).json({
      total_overrides: result.rows.length,
      overrides: result.rows
    });

  } catch (error) {
    console.error('Get overrides error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/hod/stats - Executive dashboard metrics (US-4.1 / NFR-REP-03)
const getHODStats = async (req, res) => {
  try {
    const sessionResult = await pool.query(
      'SELECT * FROM academic_sessions WHERE is_active = TRUE LIMIT 1'
    );
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'No active semester found' });
    }
    const session = sessionResult.rows[0];

    const totalStudentsResult = await pool.query("SELECT COUNT(*) as count FROM students");
    const totalStudents = parseInt(totalStudentsResult.rows[0].count) || 0;

    const paidStudentsResult = await pool.query(`
      WITH student_status AS (
        SELECT 
          s.id,
          COALESCE(dc.amount, 0) as dues,
          COALESCE(SUM(CASE WHEN t.status IN ('PAID', 'RECONCILED') THEN t.amount ELSE 0 END), 0) as paid
        FROM students s
        LEFT JOIN dues_configuration dc ON dc.student_level = s.current_level AND dc.session_id = $1
        LEFT JOIN transactions t ON t.student_id = s.id AND t.session_id = $1
        GROUP BY s.id, dc.amount
      )
      SELECT COUNT(*) as count FROM student_status WHERE dues - paid <= 0
    `, [session.id]);
    const paidStudents = parseInt(paidStudentsResult.rows[0].count) || 0;
    const owingStudents = Math.max(0, totalStudents - paidStudents);
    const collectionEfficiency = totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 100) : 0;

    const financialTotalsResult = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_collected 
      FROM transactions 
      WHERE session_id = $1 AND status IN ('PAID', 'RECONCILED')
    `, [session.id]);
    const totalCollected = parseFloat(financialTotalsResult.rows[0].total_collected) || 0;

    const expensesResult = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'DISBURSED' THEN amount ELSE 0 END), 0) as total_disbursed,
        COALESCE(SUM(CASE WHEN status IN ('PENDING_HOD', 'PENDING_FINANCE', 'APPROVED') THEN amount ELSE 0 END), 0) as total_pending
      FROM expense_requests
      WHERE session_id = $1
    `, [session.id]);
    const totalDisbursed = parseFloat(expensesResult.rows[0].total_disbursed) || 0;
    const totalPending = parseFloat(expensesResult.rows[0].total_pending) || 0;

    const remainingBudget = Math.max(0, totalCollected - totalDisbursed);
    const spendRatio = totalCollected > 0 ? Math.round((totalDisbursed / totalCollected) * 100) : 0;

    res.status(200).json({
      session: {
        academic_year: session.academic_year,
        semester: session.semester
      },
      stats: {
        total_students: totalStudents,
        paid_students: paidStudents,
        owing_students: owingStudents,
        collection_efficiency: collectionEfficiency,
        total_collected: totalCollected,
        total_disbursed: totalDisbursed,
        total_pending: totalPending,
        remaining_budget: remainingBudget,
        spend_ratio: spendRatio
      }
    });

  } catch (error) {
    console.error('Get HOD stats error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getDefaulters, grantOverride, getAllOverrides, getHODStats };