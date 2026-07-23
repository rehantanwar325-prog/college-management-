import express from 'express';
import { query, queryOne, run } from '../db/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// =========================================================================
// ATTENDANCE RECORDING & VIEWING
// =========================================================================

// Bulk Mark Attendance
router.post('/mark', authenticate, authorize(['faculty', 'admin']), async (req, res) => {
  const { date, subject_id, section_id, records } = req.body;
  // records: Array of { student_id, status, remarks }

  if (!date || !section_id || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Date, section, and student records are required.' });
  }

  try {
    for (const rec of records) {
      // Check if attendance already exists for student, date, and subject
      let existing;
      if (subject_id) {
        existing = await queryOne(
          'SELECT id FROM attendance WHERE student_id = ? AND date = ? AND subject_id = ?',
          [rec.student_id, date, subject_id]
        );
      } else {
        existing = await queryOne(
          'SELECT id FROM attendance WHERE student_id = ? AND date = ? AND subject_id IS NULL',
          [rec.student_id, date]
        );
      }

      if (existing) {
        await run(
          'UPDATE attendance SET status = ?, remarks = ?, marked_by = ? WHERE id = ?',
          [rec.status, rec.remarks || '', req.user.id, existing.id]
        );
      } else {
        await run(
          'INSERT INTO attendance (student_id, date, status, remarks, marked_by, subject_id) VALUES (?, ?, ?, ?, ?, ?)',
          [rec.student_id, date, rec.status, rec.remarks || '', req.user.id, subject_id || null]
        );
      }
    }

    res.json({ message: 'Attendance recorded successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Attendance Logs
router.get('/logs', authenticate, async (req, res) => {
  const { section_id, subject_id, student_id, date, start_date, end_date } = req.query;
  try {
    let sql = `
      SELECT att.*, s.first_name, s.last_name, s.roll_no, sub.name as subject_name
      FROM attendance att
      LEFT JOIN students s ON att.student_id = s.id
      LEFT JOIN subjects sub ON att.subject_id = sub.id
      WHERE 1=1
    `;
    const params = [];

    if (student_id) {
      sql += ' AND att.student_id = ?';
      params.push(student_id);
    }
    if (section_id) {
      sql += ' AND s.section_id = ?';
      params.push(section_id);
    }
    if (subject_id) {
      sql += ' AND att.subject_id = ?';
      params.push(subject_id);
    }
    if (date) {
      sql += ' AND att.date = ?';
      params.push(date);
    }
    if (start_date && end_date) {
      sql += ' AND att.date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    sql += ' ORDER BY att.date DESC, s.roll_no ASC';

    const logs = await query(sql, params);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate Attendance Percentages (Section Report)
router.get('/report', authenticate, async (req, res) => {
  const { section_id, subject_id, start_date, end_date } = req.query;
  if (!section_id) {
    return res.status(400).json({ error: 'Section ID is required' });
  }

  try {
    // 1. Fetch all students in section
    const students = await query('SELECT id, first_name, last_name, roll_no FROM students WHERE section_id = ? ORDER BY roll_no ASC', [section_id]);
    
    // 2. Fetch all attendance metrics in date range
    let sql = 'SELECT student_id, status FROM attendance WHERE student_id IN (SELECT id FROM students WHERE section_id = ?)';
    const params = [section_id];

    if (subject_id) {
      sql += ' AND subject_id = ?';
      params.push(subject_id);
    }
    if (start_date && end_date) {
      sql += ' AND date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    const attRecords = await query(sql, params);

    // Group records by student
    const studentStats = students.map(stud => {
      const records = attRecords.filter(r => r.student_id === stud.id);
      const total = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const leave = records.filter(r => r.status === 'leave').length;

      // Attendance %: (Present + Leave) / Total (or just Present / Total. Let's count leaves as excused: Present / (Total - Leave) or count leaves as Present/Absent. Standard formula: Present / Total * 100)
      const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

      return {
        student_id: stud.id,
        name: `${stud.first_name} ${stud.last_name}`,
        roll_no: stud.roll_no,
        total,
        present,
        absent,
        leave,
        percentage
      };
    });

    res.json(studentStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// LEAVE APPLICATIONS
// =========================================================================

// List leaves
router.get('/leaves', authenticate, async (req, res) => {
  const { id, role } = req.user;
  try {
    let sql = `
      SELECT lr.*, u.email as user_email, u.role as user_role,
             COALESCE(s.first_name || ' ' || s.last_name, f.name, 'Admin') as applicant_name
      FROM leave_records lr
      LEFT JOIN users u ON lr.user_id = u.id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN faculty f ON u.id = f.user_id
    `;
    const params = [];

    // Students and Parents only view their own student's leave record
    if (role === 'student') {
      sql += ' WHERE lr.user_id = ?';
      params.push(id);
    } else if (role === 'parent') {
      // Find parent student
      const p = await queryOne('SELECT student_id FROM parents WHERE user_id = ?', [id]);
      if (p) {
        const s = await queryOne('SELECT user_id FROM students WHERE id = ?', [p.student_id]);
        sql += ' WHERE lr.user_id = ?';
        params.push(s ? s.user_id : null);
      } else {
        return res.json([]);
      }
    } else if (role === 'faculty') {
      // Faculty views students' leaves in general
      sql += " WHERE u.role = 'student'";
    }

    sql += ' ORDER BY lr.id DESC';
    const leaves = await query(sql, params);
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apply for leave
router.post('/leaves', authenticate, async (req, res) => {
  const { start_date, end_date, reason } = req.body;
  if (!start_date || !end_date || !reason) {
    return res.status(400).json({ error: 'Start date, end date, and reason are required' });
  }

  try {
    await run(
      'INSERT INTO leave_records (user_id, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, start_date, end_date, reason, 'pending']
    );
    res.status(201).json({ message: 'Leave application submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve/Reject leave
router.put('/leaves/:id', authenticate, authorize(['admin', 'faculty']), async (req, res) => {
  const { status, remarks } = req.body;
  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Valid status (approved/rejected) is required.' });
  }

  try {
    const leave = await queryOne('SELECT * FROM leave_records WHERE id = ?', [req.params.id]);
    if (!leave) return res.status(404).json({ error: 'Leave record not found' });

    await run(
      'UPDATE leave_records SET status = ?, remarks = ?, action_by = ? WHERE id = ?',
      [status, remarks || '', req.user.id, req.params.id]
    );

    res.json({ message: `Leave application status updated to ${status}.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
