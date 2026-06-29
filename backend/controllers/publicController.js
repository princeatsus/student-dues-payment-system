const pool = require('../config/db');

// GET /api/public/verify - Public verification for alumni/employers (US-5.1 / AC 5.1)
const verifyAlumni = async (req, res) => {
  try {
    const { index_number, graduation_year } = req.query;

    if (!index_number || !graduation_year) {
      return res.status(400).json({ message: 'Index number and graduation year are required.' });
    }

    // Find student matching index number
    const studentResult = await pool.query(
      'SELECT id, full_name, index_number, is_active FROM students WHERE index_number = $1',
      [index_number]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ 
        cleared: false, 
        message: 'Status: NOT FOUND. Index number not recognized.' 
      });
    }

    const student = studentResult.rows[0];

    // Calculate total outstanding dues for this student historically
    const duesResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_dues FROM dues_configuration`
    );
    const totalDues = parseFloat(duesResult.rows[0].total_dues);

    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid 
       FROM transactions 
       WHERE student_id = $1 AND status IN ('PAID', 'RECONCILED')`,
      [student.id]
    );
    const totalPaid = parseFloat(paidResult.rows[0].total_paid);

    const outstanding = Math.max(0, totalDues - totalPaid);

    if (outstanding <= 0) {
      // Return success with watermark message, HIDING exact amounts to protect financial privacy (US-5.1.3)
      return res.status(200).json({
        cleared: true,
        full_name: student.full_name,
        index_number: student.index_number,
        graduation_year: graduation_year,
        message: `Status: VERIFIED - CLEARED. This student was in good financial standing with the Electrical Department for the ${parseInt(graduation_year) - 1}/${graduation_year} Academic Year.`,
        watermark: 'VERIFIED - PAID IN FULL - HTU ELECTRICAL DEPT.'
      });
    } else {
      return res.status(200).json({
        cleared: false,
        full_name: student.full_name,
        index_number: student.index_number,
        message: `Clearance Not Available. Outstanding departmental balance exists. Please contact the finance desk.`
      });
    }

  } catch (error) {
    console.error('Public verify error:', error.message);
    res.status(500).json({ message: 'Server error during verification' });
  }
};

// GET /api/public/gate-verify/:index_number - Check exam entrance (IoT turnstile simulation)
const gateVerify = async (req, res) => {
  try {
    const { index_number } = req.params;

    if (!index_number) {
      return res.status(400).json({ message: 'Index number is required.' });
    }

    const studentResult = await pool.query(
      'SELECT id, full_name, index_number, current_level, is_active FROM students WHERE index_number = $1',
      [index_number]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ 
        allowed: false, 
        reason: 'INDEX_NOT_FOUND',
        message: 'Status: NOT FOUND. Index number not recognized.' 
      });
    }

    const student = studentResult.rows[0];

    if (!student.is_active) {
      return res.status(403).json({
        allowed: false,
        reason: 'ACCOUNT_SUSPENDED',
        message: 'Access Denied. Account is deactivated.'
      });
    }

    const sessionResult = await pool.query(
      'SELECT id FROM academic_sessions WHERE is_active = TRUE LIMIT 1'
    );
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'No active semester found' });
    }
    const sessionId = sessionResult.rows[0].id;

    const duesResult = await pool.query(
      'SELECT amount FROM dues_configuration WHERE session_id = $1 AND student_level = $2',
      [sessionId, student.current_level]
    );
    const duesAmount = duesResult.rows.length > 0 ? parseFloat(duesResult.rows[0].amount) : 0;

    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid 
       FROM transactions 
       WHERE student_id = $1 AND session_id = $2 AND status IN ('PAID', 'RECONCILED')`,
      [student.id, sessionId]
    );
    const paidAmount = parseFloat(paidResult.rows[0].total_paid);

    const outstanding = Math.max(0, duesAmount - paidAmount);

    const overrideResult = await pool.query(
      'SELECT id, reason FROM exam_clearance_overrides WHERE student_id = $1 AND session_id = $2 AND is_active = TRUE',
      [student.id, sessionId]
    );
    const hasOverride = overrideResult.rows.length > 0;
    const overrideReason = hasOverride ? overrideResult.rows[0].reason : null;

    if (outstanding <= 0) {
      return res.status(200).json({
        allowed: true,
        reason: 'PAID',
        student: {
          full_name: student.full_name,
          index_number: student.index_number,
          level: student.current_level
        },
        message: 'Dues Paid. Access Granted.'
      });
    } else if (hasOverride) {
      return res.status(200).json({
        allowed: true,
        reason: 'HOD_OVERRIDE',
        student: {
          full_name: student.full_name,
          index_number: student.index_number,
          level: student.current_level
        },
        override_reason: overrideReason,
        message: 'Financial Hold Active. HOD Academic Override Detected. Access Granted.'
      });
    } else {
      return res.status(200).json({
        allowed: false,
        reason: 'OWES_DUES',
        student: {
          full_name: student.full_name,
          index_number: student.index_number,
          level: student.current_level
        },
        outstanding_amount: outstanding,
        message: `Access Denied. Outstanding balance of ₵${outstanding.toFixed(2)} exists. Gate Locked.`
      });
    }

  } catch (error) {
    console.error('Gate verify error:', error.message);
    res.status(500).json({ message: 'Server error during gate verification' });
  }
};

module.exports = {
  verifyAlumni,
  gateVerify
};
