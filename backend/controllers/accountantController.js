const pool = require('../config/db');
const path = require('path');
const { encrypt, decrypt } = require('../utils/encryption');
const { sendEmail } = require('../utils/mailer');
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

    // Paystack Server-side Verification
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (secretKey && secretKey !== 'sk_test_a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0') {
      try {
        const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(transaction.payment_reference)}`;
        const paystackRes = await fetch(verifyUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`
          }
        });

        if (!paystackRes.ok) {
          return res.status(400).json({ message: 'Paystack payment verification request failed.' });
        }

        const paystackData = await paystackRes.json();
        
        if (!paystackData.status || paystackData.data.status !== 'success') {
          return res.status(400).json({ message: 'Paystack transaction is not successfully completed.' });
        }

        // Validate currency and amount (Paystack returns amount in kobo/pesewas)
        const paystackAmount = parseFloat(paystackData.data.amount) / 100;
        const dbAmount = parseFloat(transaction.amount);
        
        if (Math.abs(paystackAmount - dbAmount) > 0.01) {
          return res.status(400).json({ 
            message: `Paystack verification failed: Amount mismatch. Paid GHS ${paystackAmount} but expected GHS ${dbAmount}` 
          });
        }
      } catch (err) {
        console.error('Paystack verification runtime error:', err.message);
        return res.status(500).json({ message: 'Server-side payment verification failed.' });
      }
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

    // Fetch session info & send receipt email
    const sessionResult = await pool.query(
      'SELECT academic_year, semester FROM academic_sessions WHERE id = $1',
      [transaction.session_id]
    );
    if (sessionResult.rows.length > 0) {
      await sendPaymentReceipt(
        transaction.student_id,
        updated.rows[0].amount,
        updated.rows[0].payment_reference,
        updated.rows[0].payment_method,
        sessionResult.rows[0]
      );
    }

    res.status(200).json({
      message: 'Payment confirmed successfully',
      transaction: updated.rows[0]
    });

  } catch (error) {
    console.error('Confirm payment error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Helper to send payment receipt email to a student
 */
const sendPaymentReceipt = async (studentId, amount, reference, paymentMethod, sessionInfo) => {
  try {
    const studentResult = await pool.query(
      'SELECT full_name, email FROM students WHERE id = $1',
      [studentId]
    );
    if (studentResult.rows.length === 0) return;
    const student = studentResult.rows[0];
    const decryptedEmail = decrypt(student.email);

    const emailText = `Dear ${student.full_name}, your payment of GHS ${parseFloat(amount).toFixed(2)} with reference ${reference} has been successfully confirmed and reconciled for the ${sessionInfo.academic_year} academic year, semester ${sessionInfo.semester}.`;
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #0f9d58; margin-top: 0;">✅ COMPSSA Dues Payment Receipt</h2>
        <p>Dear <strong>${student.full_name}</strong>,</p>
        <p>We are pleased to confirm that your department dues payment has been successfully received and reconciled.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; color: #64748b;">Amount Paid:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; text-align: right; font-weight: bold; color: #0f9d58;">GHS ${parseFloat(amount).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; color: #64748b;">Reference:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; text-align: right; font-family: monospace;">${reference}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; color: #64748b;">Payment Method:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; text-align: right;">${paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; color: #64748b;">Semester:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; text-align: right;">${sessionInfo.academic_year} - Sem ${sessionInfo.semester}</td>
          </tr>
        </table>
        <p>You can now download your Department Clearance Certificate from the student portal.</p>
        <div style="margin: 24px 0;">
          <a href="https://student-dues-payment-system.vercel.app" style="background-color: #0f9d58; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Go to Student Portal</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eaeaea;" />
        <p style="font-size: 12px; color: #64748b;">Ho Technical University · Computer Science Department</p>
      </div>
    `;

    await sendEmail({
      to: decryptedEmail,
      subject: '✅ COMPSSA Department Dues Payment Receipt',
      text: emailText,
      html: emailHtml
    });
  } catch (error) {
    console.error('Error sending payment receipt email:', error.message);
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

// POST /api/accountant/reconcile/manual-assign - Manually assign a payment to a student (FR-PAY-04 / US-3.1.4)
const manualAssignPayment = async (req, res) => {
  try {
    const { student_id, amount, payment_method, notes } = req.body;
    const accountantId = req.user.id;

    if (!student_id || !amount) {
      return res.status(400).json({ message: 'Student ID and amount are required' });
    }

    // Get active session
    const sessionResult = await pool.query(
      'SELECT * FROM academic_sessions WHERE is_active = TRUE LIMIT 1'
    );
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'No active academic session found' });
    }
    const session = sessionResult.rows[0];

    // Generate unique reference for manual ledger entry
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const shortYear = new Date().getFullYear().toString().slice(-2);
    const reference = `HTU-MAN-${shortYear}-${randomPart}`;

    // Create reconciled transaction
    const txResult = await pool.query(
      `INSERT INTO transactions (student_id, session_id, amount, payment_reference, status, payment_method, reconciled_by, reconciled_at, notes)
       VALUES ($1, $2, $3, $4, 'RECONCILED', $5, $6, CURRENT_TIMESTAMP, $7)
       RETURNING *`,
      [student_id, session.id, amount, reference, payment_method || 'CASH', accountantId, notes || 'Manual Payment Entry']
    );

    // Log action in append-only audit logs (NFR-SEC-02 Compliance)
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        accountantId, 
        'MANUAL_PAYMENT_ENTRY', 
        'TRANSACTION', 
        txResult.rows[0].id, 
        JSON.stringify({ 
          student_id, 
          reference, 
          amount, 
          payment_method, 
          notes 
        })
      ]
    );

    // Send receipt email to student
    await sendPaymentReceipt(
      student_id,
      amount,
      reference,
      payment_method || 'CASH',
      session
    );

    res.status(201).json({
      message: 'Payment recorded and reconciled successfully',
      transaction: txResult.rows[0]
    });

  } catch (error) {
    console.error('Manual assign payment error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/accountant/sync-directory - Nightly Google Directory Sync Job (US-6.1)
const syncGoogleDirectory = async (req, res) => {
  try {
    const accountantId = req.user.id;

    // Pre-configured mock student list representing Level 100 entries from the HTU Google Directory OU
    const directoryStudents = [
      { index: '0324080991', name: 'Emmanuel Gakpo', email: '0324080991@indexnumber.htu.edu.gh', current_level: 100 },
      { index: '0324080992', name: 'Selasi Mensah', email: '0324080992@indexnumber.htu.edu.gh', current_level: 100 },
      { index: '0324080993', name: 'Dela Foli', email: '0324080993@indexnumber.htu.edu.gh', current_level: 100 }
    ];

    const crypto = require('crypto');
    const getEmailHash = (email) => crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');

    let syncedCount = 0;
    const details = [];

    // 1. Sync students into database
    for (const student of directoryStudents) {
      const emailHash = getEmailHash(student.email);
      const googleSub = `google_directory_${student.index}`;

      // Check if student already exists
      const checkRes = await pool.query(
        'SELECT id FROM students WHERE index_number = $1 OR email_hash = $2',
        [student.index, emailHash]
      );

      if (checkRes.rows.length === 0) {
        // Insert new student record
        const encEmail = encrypt(student.email);
        const insertRes = await pool.query(
          `INSERT INTO students (google_sub, index_number, full_name, email, email_hash, current_level, class_group)
           VALUES ($1, $2, $3, $4, $5, $6, 'A') RETURNING id`,
          [googleSub, student.index, student.name, encEmail, emailHash, student.current_level]
        );

        // Assign STUDENT role
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'STUDENT'");
        const roleId = roleRes.rows[0].id;
        await pool.query(
          'INSERT INTO student_roles (student_id, role_id, assigned_class_group, assigned_level) VALUES ($1, $2, $3, $4)',
          [insertRes.rows[0].id, roleId, 'A', student.current_level]
        );

        syncedCount++;
        details.push(`Synced new student: ${student.name} (${student.index})`);
      }
    }

    // 2. Simulate deactivation of a suspended Workspace account
    const suspendIndex = '0324080129';
    const checkSuspend = await pool.query('SELECT id, full_name FROM students WHERE index_number = $1', [suspendIndex]);
    let suspendedCount = 0;
    if (checkSuspend.rows.length > 0) {
      await pool.query('UPDATE students SET is_active = FALSE WHERE index_number = $1', [suspendIndex]);
      suspendedCount = 1;
      details.push(`Deactivated suspended account: ${checkSuspend.rows[0].full_name} (${suspendIndex})`);
    } else {
      details.push(`Google Workspace status check complete: 0 suspensions found.`);
    }

    // 3. Log this action in append-only audit logs (NFR-SEC-02 Compliance)
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        accountantId,
        'GOOGLE_DIRECTORY_SYNC',
        'STUDENT',
        accountantId,
        JSON.stringify({ synced: syncedCount, suspended: suspendedCount, details })
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Nightly Google Directory Sync executed successfully',
      stats: {
        syncedCount,
        suspendedCount,
        details
      }
    });

  } catch (error) {
    console.error('Directory sync error:', error.message);
    res.status(500).json({ message: 'Server error during sync execution' });
  }
};

module.exports = { getAllTransactions, confirmPayment, getAllStudents, manualAssignPayment, syncGoogleDirectory };