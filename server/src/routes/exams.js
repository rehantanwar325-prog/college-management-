import express from 'express';
import { query, queryOne, run } from '../db/db.js';
import { authenticate, authorize, verifyStudentAccess } from '../middleware/auth.js';

const router = express.Router();

// Get list of exams with optional filters
router.get('/', authenticate, async (req, res) => {
  const { type, section_id, subject_id } = req.query;
  try {
    let sql = `
      SELECT e.*, s.name as session_name, sub.name as subject_name, sub.code as subject_code, sec.name as section_name
      FROM exams e
      LEFT JOIN academic_sessions s ON e.academic_session_id = s.id
      LEFT JOIN subjects sub ON e.subject_id = sub.id
      LEFT JOIN sections sec ON e.section_id = sec.id
      WHERE 1=1
    `;
    const params = [];

    if (type) { sql += ' AND e.type = ?'; params.push(type); }
    if (section_id) { sql += ' AND e.section_id = ?'; params.push(section_id); }
    if (subject_id) { sql += ' AND e.subject_id = ?'; params.push(subject_id); }

    sql += ' ORDER BY e.date DESC';
    const exams = await query(sql, params);
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create exam (Admin & Faculty)
router.post('/', authenticate, authorize(['admin', 'faculty']), async (req, res) => {
  const { name, type, academic_session_id, date, max_marks, subject_id, section_id } = req.body;
  if (!name || !type || !date) {
    return res.status(400).json({ error: 'Name, type, and date are required' });
  }

  try {
    const result = await run(
      'INSERT INTO exams (name, type, academic_session_id, date, max_marks, subject_id, section_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, type, academic_session_id || null, date, parseInt(max_marks, 10) || 100, subject_id || null, section_id || null]
    );
    res.status(201).json({ id: result.id, name, type, date, max_marks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    await run('DELETE FROM exams WHERE id = ?', [req.params.id]);
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Enter Marks
router.post('/marks', authenticate, authorize(['faculty', 'admin']), async (req, res) => {
  const { exam_id, subject_id, marks } = req.body;

  if (!exam_id || !subject_id || !marks || !Array.isArray(marks)) {
    return res.status(400).json({ error: 'Exam ID, Subject ID and marks list are required' });
  }

  try {
    for (const record of marks) {
      const existing = await queryOne(
        'SELECT id FROM exam_marks WHERE exam_id = ? AND student_id = ? AND subject_id = ?',
        [exam_id, record.student_id, subject_id]
      );

      if (existing) {
        await run(`
          UPDATE exam_marks 
          SET theory_marks = ?, practical_marks = ?, marked_by = ?
          WHERE id = ?
        `, [record.theory_marks || 0, record.practical_marks || 0, req.user.id, existing.id]);
      } else {
        await run(`
          INSERT INTO exam_marks (exam_id, student_id, subject_id, theory_marks, practical_marks, marked_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [exam_id, record.student_id, subject_id, record.theory_marks || 0, record.practical_marks || 0, req.user.id]);
      }
    }

    res.json({ message: 'Exam marks saved successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Exam Marks for editing or viewing
router.get('/marks', authenticate, async (req, res) => {
  const { exam_id, subject_id, section_id } = req.query;
  if (!exam_id || !subject_id) {
    return res.status(400).json({ error: 'Exam ID and Subject ID are required' });
  }

  try {
    let sql = `
      SELECT s.id as student_id, s.first_name, s.last_name, s.roll_no,
             em.theory_marks, em.practical_marks, em.id as mark_id
      FROM students s
      LEFT JOIN exam_marks em ON s.id = em.student_id AND em.exam_id = ? AND em.subject_id = ?
      WHERE 1=1
    `;
    const params = [exam_id, subject_id];

    if (section_id) {
      sql += ' AND s.section_id = ?';
      params.push(section_id);
    }
    sql += ' ORDER BY s.roll_no ASC';

    const list = await query(sql, params);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function getGrade(scorePercentage) {
  if (scorePercentage >= 90) return 'A+';
  if (scorePercentage >= 80) return 'A';
  if (scorePercentage >= 70) return 'B';
  if (scorePercentage >= 60) return 'C';
  if (scorePercentage >= 50) return 'D';
  if (scorePercentage >= 40) return 'E';
  return 'F';
}

// Compile Marksheet for student (Protected with Ownership Check)
router.get('/marksheet/:student_id', authenticate, async (req, res) => {
  const { exam_id } = req.query;
  const student_id = req.params.student_id;

  try {
    const isAuthorized = await verifyStudentAccess(req.user, student_id);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this marksheet.' });
    }

    const student = await queryOne(`
      SELECT s.*, c.name as course_name, sec.name as section_name, ses.name as session_name
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN academic_sessions ses ON s.academic_session_id = ses.id
      WHERE s.id = ?
    `, [student_id]);

    if (!student) return res.status(404).json({ error: 'Student not found' });

    let sql = `
      SELECT em.*, sub.name as subject_name, sub.code as subject_code, sub.type as subject_type, e.name as exam_name
      FROM exam_marks em
      LEFT JOIN subjects sub ON em.subject_id = sub.id
      LEFT JOIN exams e ON em.exam_id = e.id
      WHERE em.student_id = ?
    `;
    const params = [student_id];
    if (exam_id) {
      sql += ' AND em.exam_id = ?';
      params.push(exam_id);
    }

    const marksRecords = await query(sql, params);

    const compiled = marksRecords.map(m => {
      const maxMarks = m.subject_type === 'practical' ? 50 : 100;
      const obtained = (m.theory_marks || 0) + (m.practical_marks || 0);
      const pct = (obtained / maxMarks) * 100;
      const grade = getGrade(pct);

      return {
        subject_id: m.subject_id,
        subject_name: m.subject_name,
        subject_code: m.subject_code,
        subject_type: m.subject_type,
        theory_marks: m.theory_marks,
        practical_marks: m.practical_marks,
        total_obtained: obtained,
        max_marks: maxMarks,
        percentage: pct,
        grade,
        exam_name: m.exam_name
      };
    });

    const overallTotal = compiled.reduce((sum, item) => sum + item.total_obtained, 0);
    const overallMax = compiled.reduce((sum, item) => sum + item.max_marks, 0);
    const overallPercentage = overallMax > 0 ? Math.round((overallTotal / overallMax) * 100) : 0;
    const overallGrade = getGrade(overallPercentage);

    res.json({
      student,
      results: compiled,
      summary: {
        total_obtained: overallTotal,
        max_marks: overallMax,
        percentage: overallPercentage,
        grade: overallGrade,
        pass_status: overallPercentage >= 40 ? 'PASS' : 'FAIL'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Result analysis for admin dashboard / reports
router.get('/analysis', authenticate, authorize(['admin', 'faculty']), async (req, res) => {
  const { exam_id, section_id } = req.query;
  if (!exam_id || !section_id) {
    return res.status(400).json({ error: 'Exam ID and Section ID are required' });
  }

  try {
    const students = await query('SELECT id, first_name, last_name, roll_no FROM students WHERE section_id = ?', [section_id]);
    if (students.length === 0) {
      return res.json({ toppers: [], averages: [], pass_percentage: 0 });
    }

    const studentMarks = await query(`
      SELECT em.student_id, em.theory_marks, em.practical_marks, sub.name as subject_name, sub.id as subject_id, sub.type as subject_type
      FROM exam_marks em
      LEFT JOIN subjects sub ON em.subject_id = sub.id
      WHERE em.exam_id = ? AND em.student_id IN (SELECT id FROM students WHERE section_id = ?)
    `, [exam_id, section_id]);

    const studentScores = students.map(s => {
      const records = studentMarks.filter(m => m.student_id === s.id);
      const total = records.reduce((sum, r) => sum + (r.theory_marks || 0) + (r.practical_marks || 0), 0);
      const max = records.reduce((sum, r) => sum + (r.subject_type === 'practical' ? 50 : 100), 0);
      const pct = max > 0 ? (total / max) * 100 : 0;

      return {
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        roll_no: s.roll_no,
        total_obtained: total,
        max_marks: max,
        percentage: pct,
        pass: pct >= 40
      };
    }).filter(s => s.max_marks > 0);

    if (studentScores.length === 0) {
      return res.json({ toppers: [], averages: [], pass_percentage: 0 });
    }

    const toppers = [...studentScores].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
    const passCount = studentScores.filter(s => s.pass).length;
    const passPercentage = Math.round((passCount / studentScores.length) * 100);

    const subjects = [...new Set(studentMarks.map(m => m.subject_name))];
    const averages = subjects.map(subName => {
      const marks = studentMarks.filter(m => m.subject_name === subName);
      const sum = marks.reduce((acc, m) => acc + (m.theory_marks || 0) + (m.practical_marks || 0), 0);
      const avg = marks.length > 0 ? Math.round((sum / marks.length) * 10) / 10 : 0;
      return { subject: subName, average: avg };
    });

    res.json({ toppers, averages, pass_percentage: passPercentage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
