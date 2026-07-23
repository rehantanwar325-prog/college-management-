import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { queryOne, run } from '../db/db.js';
import { authenticate } from '../middleware/auth.js';
import { decrypt } from '../utils/security.js';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-college-management-token-key-2026';

// LOGIN ROUTE
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive or suspended. Please contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Parse permissions JSON
    let permissions = [];
    try {
      permissions = JSON.parse(user.permissions || '[]');
    } catch (e) {
      permissions = [];
    }
    if (!permissions || permissions.length === 0) {
      if (user.role === 'admin' || user.role === 'superadmin') {
        permissions = ['overview', 'admissions', 'academics', 'fees', 'library', 'notices', 'backup', 'permissions'];
      } else {
        permissions = ['overview'];
      }
    }

    // Role-specific metadata
    let profileData = {};
    if (user.role === 'student') {
      const student = await queryOne(`
        SELECT s.*, c.name as course_name, c.code as course_code, sec.name as section_name, ses.name as session_name
        FROM students s
        LEFT JOIN courses c ON s.course_id = c.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        LEFT JOIN academic_sessions ses ON s.academic_session_id = ses.id
        WHERE s.user_id = ?
      `, [user.id]);
      if (student) {
        profileData = {
          student_id: student.id,
          admission_no: student.admission_no,
          roll_no: student.roll_no,
          first_name: student.first_name,
          last_name: student.last_name,
          photo_url: student.photo_url,
          course_id: student.course_id,
          course_name: student.course_name,
          course_code: student.course_code,
          section_id: student.section_id,
          section_name: student.section_name,
          semester: student.semester
        };
      }
    } else if (user.role === 'parent') {
      const parent = await queryOne(`
        SELECT p.*, s.first_name as student_first_name, s.last_name as student_last_name, s.admission_no as student_admission_no
        FROM parents p
        LEFT JOIN students s ON p.student_id = s.id
        WHERE p.user_id = ?
      `, [user.id]);
      if (parent) {
        profileData = {
          parent_id: parent.id,
          name: parent.name,
          student_id: parent.student_id,
          student_db_id: parent.student_id,
          student_first_name: parent.student_first_name,
          student_last_name: parent.student_last_name,
          student_admission_no: parent.student_admission_no
        };
      }
    } else if (user.role === 'faculty') {
      const faculty = await queryOne('SELECT * FROM faculty WHERE user_id = ?', [user.id]);
      if (faculty) {
        profileData = {
          faculty_id: faculty.id,
          employee_id: faculty.employee_id,
          name: faculty.name,
          designation: faculty.designation
        };
      }
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions,
      ...profileData
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: payload
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SELF-SERVICE CHANGE PASSWORD
router.post('/change-password', authenticate, async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    return res.status(400).json({ error: 'Both current password and new password are required' });
  }

  try {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User account not found' });

    const isMatch = await bcrypt.compare(old_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password provided is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    await run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);
    await run('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)', [req.user.id, 'CHANGE_PASSWORD', 'User updated account password.']);

    res.json({ message: 'Password updated successfully! Please use your new password for future logins.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET CURRENT AUTHENTICATED USER
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, email, role, status, permissions, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let permissions = [];
    try {
      permissions = JSON.parse(user.permissions || '[]');
    } catch (e) {
      permissions = [];
    }
    if (!permissions || permissions.length === 0) {
      if (user.role === 'admin' || user.role === 'superadmin') {
        permissions = ['overview', 'admissions', 'academics', 'fees', 'library', 'notices', 'backup', 'permissions'];
      } else {
        permissions = ['overview'];
      }
    }

    let profileData = {};
    if (user.role === 'student') {
      const student = await queryOne(`
        SELECT s.*, c.name as course_name, c.code as course_code, sec.name as section_name, ses.name as session_name
        FROM students s
        LEFT JOIN courses c ON s.course_id = c.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        LEFT JOIN academic_sessions ses ON s.academic_session_id = ses.id
        WHERE s.user_id = ?
      `, [user.id]);
      if (student) {
        profileData = { ...student, aadhaar: decrypt(student.aadhaar_encrypted) };
      }
    } else if (user.role === 'parent') {
      profileData = await queryOne('SELECT * FROM parents WHERE user_id = ?', [user.id]);
    } else if (user.role === 'faculty') {
      profileData = await queryOne('SELECT * FROM faculty WHERE user_id = ?', [user.id]);
    }

    res.json({
      user: {
        ...user,
        permissions
      },
      profile: profileData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET PROFILE DETAILS FOR AUTHENTICATED USER
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, email, role, status FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let profileData = { id: user.id, email: user.email, role: user.role };
    if (user.role === 'student') {
      const student = await queryOne(`
        SELECT s.*, c.name as course_name, c.code as course_code, sec.name as section_name, ses.name as session_name
        FROM students s
        LEFT JOIN courses c ON s.course_id = c.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        LEFT JOIN academic_sessions ses ON s.academic_session_id = ses.id
        WHERE s.user_id = ?
      `, [user.id]);
      if (student) {
        profileData = {
          ...student,
          student_id: student.id,
          aadhaar: decrypt(student.aadhaar_encrypted)
        };
      }
    } else if (user.role === 'parent') {
      const parent = await queryOne(`
        SELECT p.*, s.first_name as student_first_name, s.last_name as student_last_name, s.admission_no as student_admission_no, s.section_id as student_section_id
        FROM parents p
        LEFT JOIN students s ON p.student_id = s.id
        WHERE p.user_id = ?
      `, [user.id]);
      if (parent) {
        profileData = {
          ...parent,
          parent_id: parent.id,
          student_id: parent.student_id,
          student_db_id: parent.student_id
        };
      }
    } else if (user.role === 'faculty') {
      const faculty = await queryOne('SELECT * FROM faculty WHERE user_id = ?', [user.id]);
      if (faculty) {
        profileData = {
          ...faculty,
          faculty_id: faculty.id
        };
      }
    }

    res.json(profileData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
