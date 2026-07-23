import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { queryOne } from '../db/db.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-college-management-token-key-2026';

export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
}

export function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }
    
    const { role } = req.user;
    
    // Super admins always have complete access
    if (role === 'superadmin' || allowedRoles.includes(role)) {
      return next();
    }
    
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions for this role' });
  };
}

// Ownership Verification Helper to prevent IDOR leaks
export async function verifyStudentAccess(reqUser, targetStudentId) {
  if (!reqUser || !targetStudentId) return false;
  const { id, role } = reqUser;

  // Admins, Superadmins, and Faculty have legitimate operational access
  if (role === 'superadmin' || role === 'admin' || role === 'faculty') {
    return true;
  }

  if (role === 'student') {
    const student = await queryOne('SELECT id FROM students WHERE user_id = ?', [id]);
    return student && student.id === parseInt(targetStudentId);
  }

  if (role === 'parent') {
    const parent = await queryOne('SELECT student_id FROM parents WHERE user_id = ?', [id]);
    return parent && parent.student_id === parseInt(targetStudentId);
  }

  return false;
}
