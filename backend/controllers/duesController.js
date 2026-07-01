const pool = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// GET /api/dues/balance - Student views their balance (includes carryover calculations)
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
      'SELECT * FROM students WHERE id = $1',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    const student = studentResult.rows[0];

    // 1. Current Semester Dues Configuration
    const currentDuesResult = await pool.query(
      'SELECT * FROM dues_configuration WHERE session_id = $1 AND student_level = $2',
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
    // Sum of dues configured for past semesters/levels where this student was enrolled
    const pastDuesConfigResult = await pool.query(
      `SELECT COALESCE(SUM(dc.amount), 0) as total_past_dues
       FROM dues_configuration dc
       JOIN academic_sessions as2 ON dc.session_id = as2.id
       WHERE dc.session_id != $1 AND dc.student_level <= $2`,
      [session.id, student.current_level]
    );
    const totalPastDues = parseFloat(pastDuesConfigResult.rows[0].total_past_dues);

    // Sum of payments in past semesters
    const pastPaidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_past_paid 
       FROM transactions 
       WHERE student_id = $1 AND session_id != $2 AND status IN ('PAID', 'RECONCILED')`,
      [studentId, session.id]
    );
    const totalPastPaid = parseFloat(pastPaidResult.rows[0].total_past_paid);

    // Calculate carryover (unpaid previous balance)
    const carryoverBalance = Math.max(0, totalPastDues - totalPastPaid);

    // 4. Totals calculations
    const currentOutstanding = Math.max(0, currentDuesAmount - currentPaidAmount);
    const totalOutstanding = currentOutstanding + carryoverBalance;
    const totalPaid = currentPaidAmount + totalPastPaid;

    // Check if HOD Exam Clearance Override is active for this semester (NFR-REP-03 / AC 1.2.4)
    const overrideResult = await pool.query(
      'SELECT id, reason FROM exam_clearance_overrides WHERE student_id = $1 AND session_id = $2 AND is_active = TRUE',
      [studentId, session.id]
    );
    const hasOverride = overrideResult.rows.length > 0;
    const overrideReason = hasOverride ? overrideResult.rows[0].reason : null;

    res.status(200).json({
      student: {
        id: student.id,
        full_name: student.full_name,
        index_number: student.index_number,
        level: student.current_level,
        class_group: student.class_group
      },
      session: {
        id: session.id,
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

    // Deactivate other sessions if we are creating/activating a new one
    await pool.query('UPDATE academic_sessions SET is_active = FALSE');

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
    } else {
      await pool.query(
        'UPDATE academic_sessions SET is_active = TRUE WHERE id = $1',
        [sessionResult.rows[0].id]
      );
    }

    const sessionId = sessionResult.rows[0].id;

    // Insert/update dues for each level
    for (const due of dues) {
      await pool.query(
        `INSERT INTO dues_configuration (session_id, student_level, amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (session_id, student_level) DO UPDATE SET amount = $3`,
        [sessionId, due.level, due.amount]
      );
    }

    // Log action in append-only log
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id, 
        'DUES_CONFIGURED', 
        'ACADEMIC_SESSION', 
        null,
        JSON.stringify({ academic_year, semester, dues })
      ]
    );

    res.status(201).json({ message: 'Dues configured successfully' });

  } catch (error) {
    console.error('Set dues config error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/dues/pay - Generate 12-character unique Momo reference (AC 1.1.2)
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
      'SELECT * FROM students WHERE id = $1',
      [studentId]
    );

    const student = studentResult.rows[0];

    // Calculate outstanding balance
    const currentDuesResult = await pool.query(
      'SELECT amount FROM dues_configuration WHERE session_id = $1 AND student_level = $2',
      [session.id, student.current_level]
    );
    const currentDuesAmount = currentDuesResult.rows.length > 0 
      ? parseFloat(currentDuesResult.rows[0].amount) 
      : 0;

    const currentPaidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid 
       FROM transactions 
       WHERE student_id = $1 AND session_id = $2 AND status IN ('PAID', 'RECONCILED')`,
      [studentId, session.id]
    );
    const currentPaidAmount = parseFloat(currentPaidResult.rows[0].total_paid);

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

    if (totalOutstanding <= 0) {
      return res.status(400).json({ message: 'You have no outstanding dues to pay' });
    }

    // Determine custom or full outstanding amount
    let amount = totalOutstanding;
    if (req.body.amount) {
      const parsed = parseFloat(req.body.amount);
      if (!isNaN(parsed) && parsed > 0) {
        amount = Math.min(totalOutstanding, parsed);
      } else {
        return res.status(400).json({ message: 'Invalid payment amount' });
      }
    }

    // Check if there is already a PENDING transaction for this student this semester
    const pendingTxResult = await pool.query(
      `SELECT * FROM transactions 
       WHERE student_id = $1 AND session_id = $2 AND status = 'PENDING' 
       ORDER BY created_at DESC LIMIT 1`,
      [studentId, session.id]
    );

    if (pendingTxResult.rows.length > 0) {
      const existingTx = pendingTxResult.rows[0];
      // Update amount of this pending transaction to match our target payment amount
      const updatedTx = await pool.query(
        'UPDATE transactions SET amount = $1 WHERE id = $2 RETURNING *',
        [amount, existingTx.id]
      );
      
      return res.status(200).json({
        message: 'Active payment reference updated',
        reference: existingTx.payment_reference,
        amount: `₵${parseFloat(amount).toFixed(2)}`,
        instructions: `Dial *170# → Send Money → Enter reference: ${existingTx.payment_reference}`,
        transaction: updatedTx.rows[0]
      });
    }

    // Generate unique 12-character alphanumeric reference code
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const shortYear = new Date().getFullYear().toString().slice(-2);
    const reference = `HTU-ELE-${shortYear}-${randomPart}`;

    // Save as pending transaction
    const transaction = await pool.query(
      `INSERT INTO transactions (student_id, session_id, amount, payment_reference, status, payment_method)
       VALUES ($1, $2, $3, $4, 'PENDING', 'MOMO_MTN') RETURNING *`,
      [studentId, session.id, amount, reference]
    );

    // Log action
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        studentId, 
        'PAYMENT_REF_GENERATED', 
        'TRANSACTION', 
        transaction.rows[0].id, 
        JSON.stringify({ reference, amount })
      ]
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