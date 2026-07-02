const pool = require('../config/db');

// GET /api/verify/:indexNumber
const verifyStudent = async (req, res) => {
  try {
    const { indexNumber } = req.params;

    if (!indexNumber || indexNumber.length < 5) {
      return res.status(400).json({ 
        message: 'Invalid index number. Please enter a valid index number.' 
      });
    }

    // Get active session
    const sessionResult = await pool.query(
      'SELECT * FROM academic_sessions WHERE is_active = TRUE LIMIT 1'
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ 
        message: 'No active semester found in the system.' 
      });
    }

    const session = sessionResult.rows[0];

    // Find student by index number
    const studentResult = await pool.query(
      "SELECT id, full_name, index_number, current_level, email FROM users WHERE index_number = $1 AND role IN ('STUDENT', 'COURSE_REP')",
      [indexNumber]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ 
        message: 'No student found with that index number.' 
      });
    }

    const student = studentResult.rows[0];

    // Get dues configuration for student's level
    const duesResult = await pool.query(
      'SELECT amount FROM dues_configuration WHERE session_id = $1 AND student_level = $2',
      [session.id, student.current_level]
    );

    if (duesResult.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Dues not configured for this level yet.' 
      });
    }

    const totalDues = parseFloat(duesResult.rows[0].amount);

    // Get total paid
    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid 
       FROM transactions 
       WHERE student_id = $1 AND session_id = $2 AND status IN ('PAID', 'RECONCILED')`,
      [student.id, session.id]
    );

    const totalPaid = parseFloat(paidResult.rows[0].total_paid);
    const outstanding = totalDues - totalPaid;
    const isCleared = outstanding <= 0;

    // Check if student has an active HOD override
    let hasOverride = false;
    let overrideReason = null;
    if (!isCleared) {
      const overrideResult = await pool.query(
        'SELECT * FROM exam_clearance_overrides WHERE student_id = $1 AND session_id = $2 AND is_active = TRUE',
        [student.id, session.id]
      );
      if (overrideResult.rows.length > 0) {
        hasOverride = true;
        overrideReason = overrideResult.rows[0].reason;
      }
    }

    // Determine final status
    let status = 'NOT CLEARED';
    let statusMessage = 'This student has outstanding dues and has not been cleared.';
    if (isCleared) {
      status = 'CLEARED';
      statusMessage = 'This student has cleared all departmental dues and has no financial holds.';
    } else if (hasOverride) {
      status = 'CLEARED BY EXCEPTION';
      statusMessage = `This student has been cleared by HOD exception: ${overrideReason}`;
    }

    res.status(200).json({
      student: {
        full_name: student.full_name,
        index_number: student.index_number,
        current_level: student.current_level,
        email: student.email,
      },
      session: {
        academic_year: session.academic_year,
        semester: session.semester,
      },
      financial: {
        total_dues: totalDues.toFixed(2),
        total_paid: totalPaid.toFixed(2),
        outstanding: outstanding.toFixed(2),
      },
      clearance: {
        status: status,
        message: statusMessage,
        verified_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Verification error:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

module.exports = { verifyStudent };