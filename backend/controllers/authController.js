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
    const { credential, isMock, mockEmail, mockName, mockRole, mockLevel, mockClassGroup } = req.body;

    let googleSub = '';
    let email = '';
    let fullName = '';

    // 1. Check if Mock Auth or Real Google OAuth
    if (isMock) {
      // Developer Mode: Mock Login
      if (!mockEmail) {
        return res.status(400).json({ message: 'Mock email is required' });
      }
      email = mockEmail.toLowerCase().trim();
      fullName = mockName || 'Mock Developer';
      googleSub = `mock_sub_${getEmailHash(email)}`;
    } else {
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
    }

    // 2. Domain Restriction Check (NFR-SEC-04 Compliance)
    const isStudentEmail = email.endsWith('@indexnumber.htu.edu.gh') || email.endsWith('.indexnumber.htu.edu.gh');
    const isStaffEmail = email.endsWith('@htu.edu.gh');

    if (!isStudentEmail && !isStaffEmail) {
      return res.status(403).json({ 
        message: 'Access Denied. Only htu.edu.gh and indexnumber.htu.edu.gh domains are permitted.' 
      });
    }

    // 3. Extract Index Number or Staff ID
    let indexNumber = '';
    let defaultRole = 'STUDENT';
    let level = mockLevel || 100;
    let classGroup = mockClassGroup || 'A';

    if (isStudentEmail) {
      // Extract the digits (e.g. 0123456789) from indexnumber@indexnumber.htu.edu.gh
      const emailName = email.split('@')[0];
      const match = emailName.match(/\d{10}/); // look for 10 consecutive digits
      
      if (!match) {
        return res.status(400).json({ message: 'Invalid student email format. 10-digit index number not found.' });
      }
      indexNumber = match[0];
      defaultRole = 'STUDENT';
    } else {
      // Staff email
      const staffUsername = email.split('@')[0];
      indexNumber = `STAFF_${staffUsername.toUpperCase().slice(0, 4)}`; // Unique non-student ID
      
      // Auto-assign staff roles based on email content for easy testing/pitching
      if (email.includes('accountant') || (isMock && mockRole === 'ACCOUNTANT')) {
        defaultRole = 'ACCOUNTANT';
      } else if (email.includes('hod') || (isMock && mockRole === 'HOD')) {
        defaultRole = 'HOD';
      } else if (email.includes('admin') || (isMock && mockRole === 'ADMIN')) {
        defaultRole = 'ADMIN';
      } else {
        defaultRole = 'ACCOUNTANT'; // default staff fallback
      }
    }

    // Override role if explicitly selected in Mock Mode
    if (isMock && mockRole) {
      defaultRole = mockRole;
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
      [student.id, 'USER_LOGIN', 'STUDENT', student.id, JSON.stringify({ email: emailHash, isMock })]
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

module.exports = { login, register };