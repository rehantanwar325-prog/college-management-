import express from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, queryOne, run } from '../db/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../', process.env.DB_FILE || 'database.sqlite');
const backupPath = dbPath + '.backup';

// =========================================================================
// DASHBOARD METRICS
// =========================================================================
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const studentCount = await queryOne("SELECT COUNT(*) as count FROM students WHERE status = 'active'");
    const facultyCount = await queryOne("SELECT COUNT(*) as count FROM faculty WHERE status = 'active'");
    const bookCount = await queryOne("SELECT COUNT(*) as count FROM library_books");
    const noticeCount = await queryOne("SELECT COUNT(*) as count FROM notices");

    const totalDuesRow = await queryOne('SELECT SUM(total_amount) as total FROM fee_structures');
    const totalPaidRow = await queryOne('SELECT SUM(amount_paid) as paid FROM fee_collections');
    const totalSchRow = await queryOne('SELECT SUM(amount) as sch FROM scholarships WHERE adjusted = 1');

    const totalDues = totalDuesRow.total || 0;
    const totalPaid = totalPaidRow.paid || 0;
    const totalSch = totalSchRow.sch || 0;
    
    const outstandingDues = Math.max(0, totalDues - totalPaid - totalSch);
    const collectionPercentage = totalDues > 0 ? Math.round((totalPaid / (totalDues - totalSch)) * 100) : 100;

    const attRow = await queryOne("SELECT COUNT(*) as total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present FROM attendance");
    const avgAttendance = attRow.total > 0 ? Math.round((attRow.present / attRow.total) * 100) : 100;

    const notices = await query('SELECT * FROM notices ORDER BY created_at DESC LIMIT 5');

    res.json({
      metrics: {
        total_students: studentCount.count,
        total_faculty: facultyCount.count,
        total_books: bookCount.count,
        total_notices: noticeCount.count,
        total_fees_collected: totalPaid,
        outstanding_dues: outstandingDues,
        fee_collection_percentage: collectionPercentage,
        average_attendance: avgAttendance
      },
      recent_notices: notices
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// USER & PERMISSION MANAGEMENT (CUSTOM DASHBOARDS)
// =========================================================================

// List all system users with their permissions
router.get('/users', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const users = await query('SELECT id, email, role, status, permissions, created_at FROM users ORDER BY id DESC');
    const parsedUsers = users.map(u => {
      let perms = [];
      try {
        perms = JSON.parse(u.permissions || '[]');
      } catch (e) {
        perms = [];
      }
      if (!perms || perms.length === 0) {
        if (u.role === 'admin' || u.role === 'superadmin') {
          perms = ['overview', 'admissions', 'academics', 'fees', 'library', 'notices', 'backup', 'permissions'];
        } else {
          perms = ['overview'];
        }
      }
      return {
        ...u,
        permissions: perms
      };
    });
    res.json(parsedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Custom User / Sub-Admin Account with specific dashboard permissions
router.post('/users/create', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  const { email, password, role, permissions } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }

  try {
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const permsJson = JSON.stringify(permissions || ['overview']);

    const result = await run('INSERT INTO users (email, password_hash, role, permissions) VALUES (?, ?, ?, ?)', [
      email, hash, role, permsJson
    ]);

    await run('INSERT INTO audit_logs (user_id, action, target_table, details) VALUES (?, ?, ?, ?)', [
      req.user.id,
      'CREATE_CUSTOM_USER',
      'users',
      `Created custom dashboard user: ${email} (Role: ${role}, Permissions: ${permsJson})`
    ]);

    res.json({
      message: 'Custom user account created successfully with assigned permissions!',
      user_id: result.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update User Role, Status & Granted Permissions
router.put('/users/:id/permissions', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  const { id } = req.params;
  const { role, status, permissions, new_password } = req.body;

  try {
    const permsJson = JSON.stringify(permissions || []);

    if (new_password && new_password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(new_password.trim(), salt);
      await run('UPDATE users SET role = ?, status = ?, permissions = ?, password_hash = ? WHERE id = ?', [
        role, status || 'active', permsJson, hash, id
      ]);
    } else {
      await run('UPDATE users SET role = ?, status = ?, permissions = ? WHERE id = ?', [
        role, status || 'active', permsJson, id
      ]);
    }

    await run('INSERT INTO audit_logs (user_id, action, target_table, details) VALUES (?, ?, ?, ?)', [
      req.user.id,
      'UPDATE_USER_PERMISSIONS',
      'users',
      `Updated user ID ${id} permissions & password`
    ]);

    res.json({ message: 'User role, status, password & permissions updated successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete User Account
router.delete('/users/:id', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  const { id } = req.params;
  try {
    await run('DELETE FROM users WHERE id = ?', [id]);
    await run('INSERT INTO audit_logs (user_id, action, target_table, details) VALUES (?, ?, ?, ?)', [
      req.user.id,
      'DELETE_USER',
      'users',
      `Deleted user account ID ${id}`
    ]);
    res.json({ message: 'User account removed.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// AUDIT LOGS
// =========================================================================
router.get('/audit-logs', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const logs = await query(`
      SELECT al.*, u.email as user_email, u.role as user_role 
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
      LIMIT 100
    `);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// DATABASE BACKUP & RESTORE
// =========================================================================
router.post('/backup', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    await fs.promises.copyFile(dbPath, backupPath);

    await run('INSERT INTO audit_logs (user_id, action, target_table, details) VALUES (?, ?, ?, ?)', [
      req.user.id,
      'DATABASE_BACKUP',
      'users',
      `Manual database backup created successfully at: ${backupPath}`
    ]);

    res.json({ 
      message: 'Database backup completed successfully.', 
      backup_file: backupPath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Failed to create database backup: ' + error.message });
  }
});

router.post('/restore', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    if (!fs.existsSync(backupPath)) {
      return res.status(400).json({ error: 'No database backup file found to restore.' });
    }

    await fs.promises.copyFile(backupPath, dbPath);

    console.log('[SYSTEM] Database restored from backup.');
    
    await run('INSERT INTO audit_logs (user_id, action, target_table, details) VALUES (?, ?, ?, ?)', [
      req.user.id,
      'DATABASE_RESTORE',
      'users',
      `Manual database restored successfully from file: ${backupPath}`
    ]);

    res.json({ message: 'Database restored successfully. Connections refreshed.' });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Failed to restore database: ' + error.message });
  }
});

export default router;
