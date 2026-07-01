const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { encrypt, decrypt } = require('../utils/encryption');

// Helper function to hash emails
const getEmailHash = (email) => {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
};

// LOGIN / AUTHENTICATE WITH GOOGLE OR MOCK
const login = async (req, res) => {
  try {
    const { credential } = req.body;

    let googleSub = '';
    let email = '';
    let fullName = '';

    // Production Mode: Verify Google ID Token
    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required' });
    }

    try {
      const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`;
      const response = await fetch(verifyUrl);
      
      if (!response.ok) {
        return res.status(401).json({ message: 'Google authentication failed' });
      }

      const payload = await response.json();
      googleSub = payload.sub;
      email = payload.email.toLowerCase().trim();
      fullName = payload.name;
    } catch (err) {
      console.error('Google token verification error:', err.message);
      return res.status(500).json({ message: 'Google Auth Service Unavailable' });
    }

    // 2. Domain Restriction Check (NFR-SEC-04 Compliance)
    const isStudentDomain = email.endsWith('@indexnumber.htu.edu.gh') || email.endsWith('.indexnumber.htu.edu.gh');
    const isMainDomain = email.endsWith('@htu.edu.gh');

    if (!isStudentDomain && !isMainDomain) {
      return res.status(403).json({ 
        message: 'Access Denied. Only htu.edu.gh and indexnumber.htu.edu.gh domains are permitted.' 
      });
    }

    // 3. Extract Index Number or Staff ID & Determine Role
    let indexNumber = '';
    let defaultRole = 'STUDENT';
    let level = 100;
    let classGroup = 'A';

    const emailPrefix = email.split('@')[0];
    const indexMatch = emailPrefix.match(/\d{10}/); // look for 10 consecutive digits

    if (indexMatch) {
      // If the email has a 10-digit number anywhere in the prefix (e.g. 0324080147@htu.edu.gh), it is a Student
      indexNumber = indexMatch[0];
      defaultRole = 'STUDENT';
    } else if (isMainDomain) {
      // Staff email (no 10-digit number in username)
      indexNumber = `STAFF_${emailPrefix.toUpperCase().slice(0, 4)}`; // Unique non-student ID
      
      // Auto-assign staff roles based on email content keywords
      if (emailPrefix.includes('accountant')) {
        defaultRole = 'ACCOUNTANT';
      } else if (emailPrefix.includes('hod')) {
        defaultRole = 'HOD';
      } else if (emailPrefix.includes('admin')) {
        defaultRole = 'ADMIN';
      } else {
        defaultRole = 'ACCOUNTANT'; // default staff fallback
      }
    } else {
      return res.status(400).json({ message: 'Invalid email format. Student index number not found.' });
    }

    const emailHash = getEmailHash(email);
    const encryptedEmail = encrypt(email);

    // 4. Find or Create Student Record
    let studentResult = await pool.query(
      'SELECT * FROM students WHERE google_sub = $1 OR index_number = $2 OR email_hash = $3',
      [googleSub, indexNumber, emailHash]
    );

    let student;
    if (studentResult.rows.length === 0) {
      // Register New Student/Staff
      const insertResult = await pool.query(
        `INSERT INTO students (google_sub, index_number, full_name, email, email_hash, current_level, class_group)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [googleSub, indexNumber, fullName, encryptedEmail, emailHash, level, classGroup]
      );
      student = insertResult.rows[0];

      // Assign Role in student_roles
      const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [defaultRole]);
      const roleId = roleResult.rows[0].id;
      
      await pool.query(
        `INSERT INTO student_roles (student_id, role_id, assigned_class_group, assigned_level)
         VALUES ($1, $2, $3, $4)`,
        [student.id, roleId, classGroup, level]
      );
    } else {
      student = studentResult.rows[0];
      
      // Update Google sub ID if it changed or was empty
      if (student.google_sub !== googleSub) {
        await pool.query('UPDATE students SET google_sub = $1 WHERE id = $2', [googleSub, student.id]);
      }
    }

    // Check if account is active
    if (!student.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Fetch the role for the JWT token
    const userRoleResult = await pool.query(
      `SELECT r.name, sr.assigned_class_group, sr.assigned_level 
       FROM student_roles sr
       JOIN roles r ON sr.role_id = r.id
       WHERE sr.student_id = $1`,
      [student.id]
    );
    
    const role = userRoleResult.rows.length > 0 ? userRoleResult.rows[0].name : defaultRole;
    const assignedClassGroup = userRoleResult.rows.length > 0 ? userRoleResult.rows[0].assigned_class_group : classGroup;
    const assignedLevel = userRoleResult.rows.length > 0 ? userRoleResult.rows[0].assigned_level : level;

    // 5. Create JWT Session Token (Expires in 1 day)
    const token = jwt.sign(
      { 
        id: student.id, 
        role: role,
        index_number: student.index_number,
        assigned_level: assignedLevel,
        assigned_class_group: assignedClassGroup
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Audit log entry
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [student.id, 'USER_LOGIN', 'STUDENT', student.id, JSON.stringify({ email: emailHash, isMock: false })]
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: student.id,
        index_number: student.index_number,
        full_name: student.full_name,
        email: email, // Send plain email back to client
        role: role,
        current_level: student.current_level,
        class_group: student.class_group
      }
    });

  } catch (error) {
    console.error('OAuth Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// REGISTER - Dummy for backwards compatibility
const register = async (req, res) => {
  res.status(400).json({ 
    message: 'Standard registration is disabled. Please Sign in with Google.' 
  });
};

// ROLE SWITCHER FOR DEMO/JUDGES WORKFLOW (FR-AUTH-03)
const switchRole = async (req, res) => {
  try {
    const { targetRole } = req.body;
    const userId = req.user.id;

    const validRoles = ['STUDENT', 'COURSE_REP', 'ACCOUNTANT', 'HOD', 'ADMIN'];
    if (!validRoles.includes(targetRole)) {
      return res.status(400).json({ message: 'Invalid role request' });
    }

    // Load actual student record
    const studentRes = await pool.query('SELECT * FROM students WHERE id = $1', [userId]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ message: 'User record not found' });
    }
    const student = studentRes.rows[0];

    // Determine target classes/levels for Course Rep
    const level = student.current_level || 100;
    const classGroup = student.class_group || 'A';

    // Generate a fresh session token with the new targetRole
    const token = jwt.sign(
      { 
        id: student.id, 
        role: targetRole,
        index_number: student.index_number,
        assigned_level: level,
        assigned_class_group: classGroup
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Audit log this switch
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [student.id, 'ROLE_SWITCHED_DEMO', 'STUDENT', student.id, JSON.stringify({ oldRole: req.user.role, newRole: targetRole })]
    );

    res.status(200).json({
      message: `Switched role view to ${targetRole}`,
      token,
      user: {
        id: student.id,
        index_number: student.index_number,
        full_name: student.full_name,
        email: decrypt(student.email),
        role: targetRole,
        current_level: student.current_level,
        class_group: student.class_group
      }
    });

  } catch (err) {
    console.error('Role switch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login, register, switchRole };