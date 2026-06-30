const pool = require('../config/db');
const { decrypt } = require('../utils/encryption');
const { sendEmail } = require('../utils/mailer');

// Helper to get Course Rep's assignment
const getRepAssignment = async (studentId) => {
  const result = await pool.query(
    `SELECT assigned_level, assigned_class_group 
     FROM student_roles 
     WHERE student_id = $1 AND assigned_level IS NOT NULL`,
    [studentId]
  );
  if (result.rows.length === 0) {
    throw new Error('User is not assigned as a Course Representative');
  }
  return result.rows[0];
};

// GET /api/rep/class-roster - View list of students in rep's class (US-2.1)
const getClassRoster = async (req, res) => {
  try {
    const repId = req.user.id;
    const assignment = await getRepAssignment(repId);
    
    // Get active session
    const sessionResult = await pool.query(
      'SELECT * FROM academic_sessions WHERE is_active = TRUE LIMIT 1'
    );
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'No active academic session found' });
    }
    const session = sessionResult.rows[0];

    // Fetch students of the same level and group
    const result = await pool.query(
      `SELECT 
        s.id, s.full_name, s.index_number, s.current_level, s.class_group, s.email,
        COALESCE(dc.amount, 0) as total_dues,
        COALESCE(SUM(CASE WHEN t.status IN ('PAID', 'RECONCILED') THEN t.amount ELSE 0 END), 0) as total_paid
       FROM students s
       JOIN student_roles sr ON s.id = sr.student_id
       JOIN roles r ON sr.role_id = r.id
       LEFT JOIN dues_configuration dc ON dc.student_level = s.current_level AND dc.session_id = $3
       LEFT JOIN transactions t ON t.student_id = s.id AND t.session_id = $3
       WHERE r.name = 'STUDENT' AND s.current_level = $1 AND s.class_group = $2
       GROUP BY s.id, s.full_name, s.index_number, s.current_level, s.class_group, s.email, dc.amount
       ORDER BY s.full_name`,
      [assignment.assigned_level, assignment.assigned_class_group, session.id]
    );

    // Decrypt emails for student records
    const roster = result.rows.map(row => {
      const outstanding = Math.max(0, parseFloat(row.total_dues) - parseFloat(row.total_paid));
      return {
        id: row.id,
        full_name: row.full_name,
        index_number: row.index_number,
        email: decrypt(row.email),
        total_dues: parseFloat(row.total_dues),
        total_paid: parseFloat(row.total_paid),
        outstanding: outstanding,
        status: outstanding <= 0 ? 'PAID' : 'OWING'
      };
    });

    res.status(200).json({
      level: assignment.assigned_level,
      class_group: assignment.assigned_class_group,
      session: {
        academic_year: session.academic_year,
        semester: session.semester
      },
      roster
    });

  } catch (error) {
    console.error('Get class roster error:', error.message);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// POST /api/rep/remind - Send reminder email to student (US-2.1.4)
const sendReminderEmail = async (req, res) => {
  try {
    const { student_id } = req.body;
    const repId = req.user.id;

    const repAssignment = await getRepAssignment(repId);

    // Get active session
    const sessionResult = await pool.query(
      'SELECT * FROM academic_sessions WHERE is_active = TRUE LIMIT 1'
    );
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'No active academic session found' });
    }
    const session = sessionResult.rows[0];

    // Fetch student info
    const studentResult = await pool.query(
      'SELECT * FROM students WHERE id = $1',
      [student_id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const student = studentResult.rows[0];

    // Calculate outstanding
    const duesResult = await pool.query(
      'SELECT amount FROM dues_configuration WHERE session_id = $1 AND student_level = $2',
      [session.id, student.current_level]
    );
    const duesAmount = duesResult.rows.length > 0 ? parseFloat(duesResult.rows[0].amount) : 0;

    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as paid 
       FROM transactions 
       WHERE student_id = $1 AND session_id = $2 AND status IN ('PAID', 'RECONCILED')`,
      [student.id, session.id]
    );
    const paidAmount = parseFloat(paidResult.rows[0].paid);
    const outstanding = duesAmount - paidAmount;

    if (outstanding <= 0) {
      return res.status(400).json({ message: 'Student has already cleared all dues.' });
    }

    const decryptedEmail = decrypt(student.email);
    const deadlineDate = '3rd July'; // Simulated deadline or dynamic date

    // HTML & Plain-text bodies
    const emailText = `Hi ${student.full_name}, just a reminder that Level ${student.current_level} dues (GHS ${outstanding.toFixed(2)}) are due by ${deadlineDate} to fund the final year project exhibition. Please view your invoice on the COMPSSA portal.`;
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #1a73e8; margin-top: 0;">📢 COMPSSA Dues Reminder</h2>
        <p>Hi <strong>${student.full_name}</strong>,</p>
        <p>This is a friendly reminder from your Course Rep that your outstanding department dues for this semester are <strong>GHS ${outstanding.toFixed(2)}</strong>.</p>
        <p>Dues fund our final year project exhibition and other class-group activities. Please clear your dues by <strong>${deadlineDate}</strong>.</p>
        <div style="margin: 24px 0;">
          <a href="https://student-dues-payment-system.vercel.app" style="background-color: #1a73e8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Your Invoice & Pay</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eaeaea;" />
        <p style="font-size: 12px; color: #64748b;">Ho Technical University · Computer Science Department</p>
      </div>
    `;

    // Send real email via Resend utility
    await sendEmail({
      to: decryptedEmail,
      subject: '📢 COMPSSA Department Dues Payment Reminder',
      text: emailText,
      html: emailHtml
    });

    // Log action in audit logs
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        repId,
        'REMINDER_EMAIL_SENT',
        'STUDENT',
        student.id,
        JSON.stringify({ to: decryptedEmail, body: emailText })
      ]
    );

    res.status(200).json({ 
      message: `Reminder email successfully sent to ${decryptedEmail}`, 
      simulated_body: emailText 
    });

  } catch (error) {
    console.error('Send reminder email error:', error.message);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  getClassRoster,
  sendReminderEmail
};
