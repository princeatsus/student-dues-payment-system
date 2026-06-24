const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// GET /api/dues/balance - Student views their balance
const getBalance = async (req, res) => {
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
      'SELECT * FROM users WHERE id = $1',
      [studentId]
    );

    const student = studentResult.rows[0];

    // Get dues amount for student's level
    const duesResult = await pool.query(
      'SELECT * FROM dues_configuration WHERE session_id = $1 AND student_level = $2',
      [session.id, student.current_level]
    );

    if (duesResult.rows.length === 0) {
      return res.status(404).json({ message: 'Dues not configured for your level yet' });
    }

    const duesAmount = parseFloat(duesResult.rows[0].amount);

    // Get total amount paid
    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid 
       FROM transactions 
       WHERE student_id = $1 AND session_id = $2 AND status IN ('PAID', 'RECONCILED')`,
      [studentId, session.id]
    );

    const totalPaid = parseFloat(paidResult.rows[0].total_paid);
    const outstanding = duesAmount - totalPaid;

    res.status(200).json({
      student: {
        full_name: student.full_name,
        index_number: student.index_number,
        level: student.current_level
      },
      session: {
        academic_year: session.academic_year,
        semester: session.semester
      },
      balance: {
        total_dues: `₵${duesAmount.toFixed(2)}`,
        total_paid: `₵${totalPaid.toFixed(2)}`,
        outstanding: `₵${outstanding.toFixed(2)}`,
        status: outstanding <= 0 ? 'CLEARED' : 'OWING'
      }
    });

  } catch (error) {
    console.error('Get balance error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/dues/config - View dues configuration
const getDuesConfig = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dc.*, as2.academic_year, as2.semester 
       FROM dues_configuration dc
       JOIN academic_sessions as2 ON dc.session_id = as2.id
       WHERE as2.is_active = TRUE`
    );

    res.status(200).json({ dues: result.rows });

  } catch (error) {
    console.error('Get dues config error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/dues/config - Set dues for a semester
const setDuesConfig = async (req, res) => {
  try {
    const { academic_year, semester, dues } = req.body;
    // dues = [{ level: 100, amount: 100 }, { level: 200, amount: 150 }...]

    // Create or get session
    let sessionResult = await pool.query(
      'SELECT * FROM academic_sessions WHERE academic_year = $1 AND semester = $2',
      [academic_year, semester]
    );

    if (sessionResult.rows.length === 0) {
      sessionResult = await pool.query(
        'INSERT INTO academic_sessions (academic_year, semester, is_active) VALUES ($1, $2, TRUE) RETURNING *',
        [academic_year, semester]
      );
    }

    const sessionId = sessionResult.rows[0].id;

    // Insert dues for each level
    for (const due of dues) {
      await pool.query(
        `INSERT INTO dues_configuration (session_id, student_level, amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (session_id, student_level) DO UPDATE SET amount = $3`,
        [sessionId, due.level, due.amount]
      );
    }

    // Log action
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, new_value)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'DUES_CONFIGURED', 'ACADEMIC_SESSION', JSON.stringify({ academic_year, semester, dues })]
    );

    res.status(201).json({ message: 'Dues configured successfully' });

  } catch (error) {
    console.error('Set dues config error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/dues/pay - Generate payment reference
const generatePaymentReference = async (req, res) => {
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
      'SELECT * FROM users WHERE id = $1',
      [studentId]
    );

    const student = studentResult.rows[0];

    // Get dues amount
    const duesResult = await pool.query(
      'SELECT * FROM dues_configuration WHERE session_id = $1 AND student_level = $2',
      [session.id, student.current_level]
    );

    if (duesResult.rows.length === 0) {
      return res.status(404).json({ message: 'Dues not configured for your level' });
    }

    const amount = duesResult.rows[0].amount;

    // Generate unique reference like HTU-ELE-26-AB12
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const year = new Date().getFullYear().toString().slice(-2);
    const reference = `HTU-ELE-${year}-${randomPart}`;

    // Save as pending transaction
    const transaction = await pool.query(
      `INSERT INTO transactions (student_id, session_id, amount, payment_reference, status, payment_method)
       VALUES ($1, $2, $3, $4, 'PENDING', 'MOMO_MTN') RETURNING *`,
      [studentId, session.id, amount, reference]
    );

    res.status(201).json({
      message: 'Payment reference generated successfully',
      reference,
      amount: `₵${parseFloat(amount).toFixed(2)}`,
      instructions: `Dial *170# → Send Money → Enter reference: ${reference}`,
      transaction: transaction.rows[0]
    });

  } catch (error) {
    console.error('Generate payment reference error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getBalance, getDuesConfig, setDuesConfig, generatePaymentReference };