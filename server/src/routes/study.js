import express from 'express';
import { query, queryOne, run } from '../db/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// =========================================================================
// REAL MULTIPART FILE UPLOADS
// =========================================================================
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const relativePath = req.file.fieldname === 'submission'
    ? `/uploads/submissions/${req.file.filename}`
    : `/uploads/${req.file.filename}`;

  res.json({
    message: 'File uploaded successfully',
    file_path: relativePath,
    filename: req.file.originalname
  });
});

// =========================================================================
// STUDY MATERIALS
// =========================================================================
router.get('/materials', authenticate, async (req, res) => {
  const { subject_id, section_id } = req.query;
  try {
    let sql = `
      SELECT sm.*, sub.name as subject_name, sub.code as subject_code, sec.name as section_name, f.name as faculty_name
      FROM study_materials sm
      LEFT JOIN subjects sub ON sm.subject_id = sub.id
      LEFT JOIN sections sec ON sm.section_id = sec.id
      LEFT JOIN users u ON sm.uploaded_by = u.id
      LEFT JOIN faculty f ON u.id = f.user_id
      WHERE 1=1
    `;
    const params = [];

    if (subject_id) {
      sql += ' AND sm.subject_id = ?';
      params.push(subject_id);
    }
    if (section_id) {
      sql += ' AND sm.section_id = ?';
      params.push(section_id);
    }

    sql += ' ORDER BY sm.created_at DESC';
    const materials = await query(sql, params);
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/materials', authenticate, authorize(['faculty', 'admin']), async (req, res) => {
  const { title, description, subject_id, section_id, file_path, file_type } = req.body;
  if (!title || !subject_id || !section_id || !file_path) {
    return res.status(400).json({ error: 'Title, Subject, Section, and File path/link are required' });
  }

  try {
    const result = await run(`
      INSERT INTO study_materials (title, description, subject_id, section_id, file_path, file_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, description || '', subject_id, section_id, file_path, file_type || 'pdf', req.user.id]);

    res.status(201).json({ id: result.id, title, file_path });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/materials/:id', authenticate, authorize(['faculty', 'admin']), async (req, res) => {
  try {
    await run('DELETE FROM study_materials WHERE id = ?', [req.params.id]);
    res.json({ message: 'Study material deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// ASSIGNMENTS
// =========================================================================
router.get('/assignments', authenticate, async (req, res) => {
  const { subject_id, section_id } = req.query;
  try {
    let sql = `
      SELECT a.*, sub.name as subject_name, sub.code as subject_code, sec.name as section_name
      FROM assignments a
      LEFT JOIN subjects sub ON a.subject_id = sub.id
      LEFT JOIN sections sec ON a.section_id = sec.id
      WHERE 1=1
    `;
    const params = [];

    if (subject_id) {
      sql += ' AND a.subject_id = ?';
      params.push(subject_id);
    }
    if (section_id) {
      sql += ' AND a.section_id = ?';
      params.push(section_id);
    }

    sql += ' ORDER BY a.due_date ASC';
    const assignments = await query(sql, params);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/assignments', authenticate, authorize(['faculty', 'admin']), async (req, res) => {
  const { title, description, subject_id, section_id, file_path, due_date, max_marks } = req.body;
  if (!title || !subject_id || !section_id || !due_date || !max_marks) {
    return res.status(400).json({ error: 'Title, Subject, Section, Due date, and Max marks are required' });
  }

  try {
    const result = await run(`
      INSERT INTO assignments (title, description, subject_id, section_id, file_path, due_date, max_marks)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, description || '', subject_id, section_id, file_path || '', due_date, max_marks]);

    res.status(201).json({ id: result.id, title, due_date, max_marks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// SUBMISSIONS
// =========================================================================
router.get('/submissions', authenticate, async (req, res) => {
  const { assignment_id, student_id } = req.query;
  const { id, role } = req.user;

  try {
    let sql = `
      SELECT asub.*, s.first_name, s.last_name, s.roll_no, a.title as assignment_title, a.max_marks
      FROM assignment_submissions asub
      LEFT JOIN students s ON asub.student_id = s.id
      LEFT JOIN assignments a ON asub.assignment_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (assignment_id) {
      sql += ' AND asub.assignment_id = ?';
      params.push(assignment_id);
    }

    if (role === 'student') {
      const student = await queryOne('SELECT id FROM students WHERE user_id = ?', [id]);
      sql += ' AND asub.student_id = ?';
      params.push(student ? student.id : null);
    } else if (role === 'parent') {
      const parent = await queryOne('SELECT student_id FROM parents WHERE user_id = ?', [id]);
      sql += ' AND asub.student_id = ?';
      params.push(parent ? parent.student_id : null);
    } else if (student_id) {
      sql += ' AND asub.student_id = ?';
      params.push(student_id);
    }

    const submissions = await query(sql, params);
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/submissions', authenticate, authorize(['student']), async (req, res) => {
  const { assignment_id, file_path } = req.body;
  if (!assignment_id || !file_path) {
    return res.status(400).json({ error: 'Assignment ID and File path/link are required' });
  }

  try {
    const student = await queryOne('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (!student) return res.status(403).json({ error: 'Only student accounts can upload submissions' });

    const existing = await queryOne('SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?', [assignment_id, student.id]);
    if (existing) {
      await run(`
        UPDATE assignment_submissions 
        SET file_path = ?, submission_date = CURRENT_TIMESTAMP, marks_obtained = NULL, remarks = NULL, graded_by = NULL
        WHERE id = ?
      `, [file_path, existing.id]);
      return res.json({ message: 'Submission updated successfully' });
    }

    await run(`
      INSERT INTO assignment_submissions (assignment_id, student_id, file_path)
      VALUES (?, ?, ?)
    `, [assignment_id, student.id, file_path]);

    res.status(201).json({ message: 'Assignment submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/submissions/:id/grade', authenticate, authorize(['faculty', 'admin']), async (req, res) => {
  const { marks_obtained, remarks } = req.body;
  if (marks_obtained === undefined) {
    return res.status(400).json({ error: 'Marks obtained is required' });
  }

  try {
    await run(`
      UPDATE assignment_submissions
      SET marks_obtained = ?, remarks = ?, graded_by = ?
      WHERE id = ?
    `, [marks_obtained, remarks || '', req.user.id, req.params.id]);

    res.json({ message: 'Grading complete.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
