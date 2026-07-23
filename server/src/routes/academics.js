import express from 'express';
import { query, queryOne, run } from '../db/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// =========================================================================
// DEPARTMENTS
// =========================================================================
router.get('/departments', authenticate, async (req, res) => {
  try {
    const departments = await query('SELECT * FROM departments ORDER BY name ASC');
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/departments', authenticate, authorize(['admin']), async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Department name and code are required' });
  }

  try {
    const result = await run('INSERT INTO departments (name, code) VALUES (?, ?)', [name, code]);
    res.status(201).json({ id: result.id, name, code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// COURSES
// =========================================================================
router.get('/courses', authenticate, async (req, res) => {
  try {
    const courses = await query(`
      SELECT c.*, d.name as department_name, d.code as department_code 
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      ORDER BY c.name ASC
    `);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/courses', authenticate, authorize(['admin']), async (req, res) => {
  const { name, code, department_id, duration_years } = req.body;
  if (!name || !code || !duration_years) {
    return res.status(400).json({ error: 'Name, code, and duration are required' });
  }

  try {
    const result = await run(
      'INSERT INTO courses (name, code, department_id, duration_years) VALUES (?, ?, ?, ?)',
      [name, code, department_id || null, duration_years]
    );
    res.status(201).json({ id: result.id, name, code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// SECTIONS
// =========================================================================
router.get('/sections', authenticate, async (req, res) => {
  const { course_id, semester } = req.query;
  try {
    let sql = `
      SELECT s.*, c.name as course_name, c.code as course_code 
      FROM sections s
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (course_id) {
      sql += ' AND s.course_id = ?';
      params.push(course_id);
    }
    if (semester) {
      sql += ' AND s.semester = ?';
      params.push(semester);
    }
    sql += ' ORDER BY s.semester ASC, s.name ASC';

    const sections = await query(sql, params);
    res.json(sections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sections', authenticate, authorize(['admin']), async (req, res) => {
  const { name, course_id, semester } = req.body;
  if (!name || !course_id || !semester) {
    return res.status(400).json({ error: 'Name, course ID, and semester are required' });
  }

  try {
    const result = await run(
      'INSERT INTO sections (name, course_id, semester) VALUES (?, ?, ?)',
      [name, course_id, semester]
    );
    res.status(201).json({ id: result.id, name, semester });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// BATCH STUDENT SEMESTER PROMOTION TOOL
// =========================================================================
router.post('/promote', authenticate, authorize(['admin']), async (req, res) => {
  const { course_id, current_semester, target_section_id } = req.body;
  if (!course_id || !current_semester || !target_section_id) {
    return res.status(400).json({ error: 'Course, current semester, and target section are required' });
  }

  try {
    const targetSection = await queryOne('SELECT * FROM sections WHERE id = ?', [target_section_id]);
    if (!targetSection) return res.status(404).json({ error: 'Target section not found' });

    const studentsToPromote = await query(
      'SELECT id, first_name, last_name FROM students WHERE course_id = ? AND semester = ? AND status = "active"',
      [course_id, current_semester]
    );

    if (studentsToPromote.length === 0) {
      return res.status(400).json({ error: 'No active students found in the specified course and semester.' });
    }

    const nextSemester = parseInt(current_semester) + 1;

    await run(`
      UPDATE students 
      SET semester = ?, section_id = ?
      WHERE course_id = ? AND semester = ? AND status = "active"
    `, [nextSemester, target_section_id, course_id, current_semester]);

    await run('INSERT INTO audit_logs (user_id, action, target_table, details) VALUES (?, ?, ?, ?)',
      [req.user.id, 'BATCH_PROMOTION', 'students', `Promoted ${studentsToPromote.length} students from Semester ${current_semester} to Semester ${nextSemester} in Section ${targetSection.name}`]);

    res.json({
      message: `Successfully promoted ${studentsToPromote.length} students to Semester ${nextSemester}!`,
      promoted_count: studentsToPromote.length,
      next_semester: nextSemester,
      target_section: targetSection.name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// SUBJECTS
// =========================================================================

const DEFAULT_CURRICULUM_SUBJECTS = [
  // B.Tech CSE (Course ID 1)
  { name: 'Engineering Mathematics - I', code: 'MATH101', course_id: 1, semester: 1, type: 'theory' },
  { name: 'Programming for Problem Solving (C Language)', code: 'CS101', course_id: 1, semester: 1, type: 'theory' },
  { name: 'Digital Logic & Circuit Design', code: 'CS102', course_id: 1, semester: 1, type: 'theory' },
  { name: 'Environmental Science & Ethics', code: 'EVS101', course_id: 1, semester: 1, type: 'theory' },
  { name: 'C Programming Laboratory', code: 'CS101P', course_id: 1, semester: 1, type: 'practical' },

  { name: 'Engineering Mathematics - II', code: 'MATH201', course_id: 1, semester: 2, type: 'theory' },
  { name: 'Object Oriented Programming (C++ / Java)', code: 'CS201', course_id: 1, semester: 2, type: 'theory' },
  { name: 'Data Structures & Algorithms', code: 'CS202', course_id: 1, semester: 2, type: 'theory' },
  { name: 'Basic Electrical Engineering', code: 'EE201', course_id: 1, semester: 2, type: 'theory' },
  { name: 'Data Structures Laboratory', code: 'CS202P', course_id: 1, semester: 2, type: 'practical' },

  { name: 'Discrete Mathematical Structures', code: 'CS301', course_id: 1, semester: 3, type: 'theory' },
  { name: 'Database Management Systems (DBMS)', code: 'CS302', course_id: 1, semester: 3, type: 'theory' },
  { name: 'Computer Organization & Architecture', code: 'CS303', course_id: 1, semester: 3, type: 'theory' },
  { name: 'Software Engineering Principles', code: 'CS304', course_id: 1, semester: 3, type: 'theory' },
  { name: 'DBMS & SQL Laboratory', code: 'CS302P', course_id: 1, semester: 3, type: 'practical' },

  { name: 'Operating Systems Design', code: 'CS401', course_id: 1, semester: 4, type: 'theory' },
  { name: 'Computer Networks & Data Communication', code: 'CS402', course_id: 1, semester: 4, type: 'theory' },
  { name: 'Theory of Computation & Automata', code: 'CS403', course_id: 1, semester: 4, type: 'theory' },
  { name: 'Design & Analysis of Algorithms', code: 'CS404', course_id: 1, semester: 4, type: 'theory' },
  { name: 'Linux System & OS Laboratory', code: 'CS401P', course_id: 1, semester: 4, type: 'practical' },

  { name: 'Compiler Design & Language Processors', code: 'CS501', course_id: 1, semester: 5, type: 'theory' },
  { name: 'Artificial Intelligence & Expert Systems', code: 'CS502', course_id: 1, semester: 5, type: 'theory' },
  { name: 'Full-Stack Web Development & Technologies', code: 'CS503', course_id: 1, semester: 5, type: 'theory' },
  { name: 'Software Testing & Quality Assurance', code: 'CS504', course_id: 1, semester: 5, type: 'theory' },
  { name: 'Web Development & Node.js Lab', code: 'CS503P', course_id: 1, semester: 5, type: 'practical' },

  { name: 'Machine Learning & Pattern Recognition', code: 'CS601', course_id: 1, semester: 6, type: 'theory' },
  { name: 'Cloud Computing & Distributed Systems', code: 'CS602', course_id: 1, semester: 6, type: 'theory' },
  { name: 'Information & Cyber Security', code: 'CS603', course_id: 1, semester: 6, type: 'theory' },
  { name: 'Mobile Application Development (Android/iOS)', code: 'CS604', course_id: 1, semester: 6, type: 'theory' },
  { name: 'Machine Learning & Python Lab', code: 'CS601P', course_id: 1, semester: 6, type: 'practical' },

  { name: 'Big Data Analytics & Data Engineering', code: 'CS701', course_id: 1, semester: 7, type: 'theory' },
  { name: 'Internet of Things (IoT) Systems', code: 'CS702', course_id: 1, semester: 7, type: 'theory' },
  { name: 'Deep Learning & Neural Networks', code: 'CS703', course_id: 1, semester: 7, type: 'theory' },
  { name: 'Capstone Major Project - Phase I', code: 'CS704P', course_id: 1, semester: 7, type: 'practical' },

  { name: 'Blockchain Technology & Smart Contracts', code: 'CS801', course_id: 1, semester: 8, type: 'theory' },
  { name: 'Industrial Internship & Corporate Training', code: 'CS802P', course_id: 1, semester: 8, type: 'practical' },
  { name: 'Capstone Major Project - Phase II & Viva', code: 'CS803P', course_id: 1, semester: 8, type: 'practical' },

  // BCA (Course ID 2)
  { name: 'Fundamentals of IT & Computers', code: 'BCA101', course_id: 2, semester: 1, type: 'theory' },
  { name: 'Programming Concepts in C', code: 'BCA102', course_id: 2, semester: 1, type: 'theory' },
  { name: 'PC Software & Office Tools Lab', code: 'BCA101P', course_id: 2, semester: 1, type: 'practical' },

  { name: 'Data Structures using C', code: 'BCA201', course_id: 2, semester: 2, type: 'theory' },
  { name: 'Database Management Systems', code: 'BCA202', course_id: 2, semester: 2, type: 'theory' },
  { name: 'Data Structures Lab', code: 'BCA201P', course_id: 2, semester: 2, type: 'practical' },

  { name: 'Object Oriented Programming with Java', code: 'BCA301', course_id: 2, semester: 3, type: 'theory' },
  { name: 'Web Designing & HTML/CSS/JS', code: 'BCA302', course_id: 2, semester: 3, type: 'theory' },
  { name: 'Java Programming Lab', code: 'BCA301P', course_id: 2, semester: 3, type: 'practical' },

  { name: 'Python Programming & Scripting', code: 'BCA401', course_id: 2, semester: 4, type: 'theory' },
  { name: 'Software Engineering Concepts', code: 'BCA402', course_id: 2, semester: 4, type: 'theory' },
  { name: 'Python Programming Lab', code: 'BCA401P', course_id: 2, semester: 4, type: 'practical' },

  { name: 'PHP & Web Backend Engineering', code: 'BCA501', course_id: 2, semester: 5, type: 'theory' },
  { name: 'Computer Networks & Internet Security', code: 'BCA502', course_id: 2, semester: 5, type: 'theory' },
  { name: 'Web Backend Lab', code: 'BCA501P', course_id: 2, semester: 5, type: 'practical' },

  { name: 'Cloud Computing & Cyber Security', code: 'BCA601', course_id: 2, semester: 6, type: 'theory' },
  { name: 'BCA Major Project & Viva', code: 'BCA602P', course_id: 2, semester: 6, type: 'practical' }
];

router.get('/subjects', authenticate, async (req, res) => {
  const { course_id, semester } = req.query;
  try {
    // Check if initial seeding is needed
    const countRow = await queryOne('SELECT COUNT(*) as count FROM subjects');
    if (!countRow || countRow.count < 10) {
      for (const sub of DEFAULT_CURRICULUM_SUBJECTS) {
        await run(`
          INSERT OR IGNORE INTO subjects (name, code, course_id, semester, type)
          VALUES (?, ?, ?, ?, ?)
        `, [sub.name, sub.code, sub.course_id, sub.semester, sub.type]);
      }
    }

    let sql = `
      SELECT sub.*, c.name as course_name, c.code as course_code 
      FROM subjects sub
      LEFT JOIN courses c ON sub.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (course_id) {
      sql += ' AND sub.course_id = ?';
      params.push(course_id);
    }
    if (semester) {
      sql += ' AND sub.semester = ?';
      params.push(semester);
    }
    sql += ' ORDER BY sub.semester ASC, sub.name ASC';

    const subjects = await query(sql, params);
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/subjects', authenticate, authorize(['admin']), async (req, res) => {
  const { name, code, course_id, semester, type } = req.body;
  if (!name || !code || !course_id || !semester) {
    return res.status(400).json({ error: 'Name, code, course, and semester are required' });
  }

  try {
    const result = await run(
      'INSERT INTO subjects (name, code, course_id, semester, type) VALUES (?, ?, ?, ?, ?)',
      [name, code, course_id, semester, type || 'theory']
    );
    res.status(201).json({ id: result.id, name, code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// FACULTY ALLOCATIONS
// =========================================================================
router.get('/allocations', authenticate, async (req, res) => {
  try {
    const allocations = await query(`
      SELECT fa.id, f.name as faculty_name, f.employee_id, 
             sub.name as subject_name, sub.code as subject_code,
             sec.name as section_name, c.code as course_code
      FROM faculty_allocations fa
      LEFT JOIN faculty f ON fa.faculty_id = f.id
      LEFT JOIN subjects sub ON fa.subject_id = sub.id
      LEFT JOIN sections sec ON fa.section_id = sec.id
      LEFT JOIN courses c ON sec.course_id = c.id
    `);
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/allocations', authenticate, authorize(['admin']), async (req, res) => {
  const { faculty_id, subject_id, section_id } = req.body;
  if (!faculty_id || !subject_id || !section_id) {
    return res.status(400).json({ error: 'Faculty ID, Subject ID, and Section ID are required' });
  }

  try {
    const result = await run(
      'INSERT INTO faculty_allocations (faculty_id, subject_id, section_id) VALUES (?, ?, ?)',
      [faculty_id, subject_id, section_id]
    );
    res.status(201).json({ id: result.id, message: 'Faculty allocated to section successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// TIMETABLE
// =========================================================================
router.get('/timetable', authenticate, async (req, res) => {
  const { section_id, faculty_id } = req.query;
  try {
    let sql = `
      SELECT t.*, sub.name as subject_name, sub.code as subject_code, 
             sec.name as section_name, f.name as faculty_name
      FROM timetables t
      LEFT JOIN subjects sub ON t.subject_id = sub.id
      LEFT JOIN sections sec ON t.section_id = sec.id
      LEFT JOIN faculty f ON t.faculty_id = f.id
      WHERE 1=1
    `;
    const params = [];

    if (section_id) {
      sql += ' AND t.section_id = ?';
      params.push(section_id);
    }
    if (faculty_id) {
      sql += ' AND t.faculty_id = ?';
      params.push(faculty_id);
    }

    sql += ' ORDER BY CASE t.day_of_week WHEN "Monday" THEN 1 WHEN "Tuesday" THEN 2 WHEN "Wednesday" THEN 3 WHEN "Thursday" THEN 4 WHEN "Friday" THEN 5 WHEN "Saturday" THEN 6 END, t.start_time ASC';

    const tt = await query(sql, params);
    res.json(tt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/timetable', authenticate, authorize(['admin']), async (req, res) => {
  const { section_id, subject_id, faculty_id, day_of_week, start_time, end_time, room_no } = req.body;

  if (!section_id || !subject_id || !faculty_id || !day_of_week || !start_time || !end_time) {
    return res.status(400).json({ error: 'Section, Subject, Faculty, Day, Start time, and End time are required' });
  }

  try {
    // Conflict validation for Faculty schedule
    const facultyConflict = await queryOne(`
      SELECT id FROM timetables 
      WHERE faculty_id = ? AND day_of_week = ? 
      AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
    `, [faculty_id, day_of_week, start_time, start_time, end_time, end_time]);

    if (facultyConflict) {
      return res.status(400).json({ error: 'Faculty timetable conflict: Teacher is already scheduled for another class in this time slot.' });
    }

    const result = await run(`
      INSERT INTO timetables (section_id, subject_id, faculty_id, day_of_week, start_time, end_time, room_no)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [section_id, subject_id, faculty_id, day_of_week, start_time, end_time, room_no || 'LHC-101']);

    res.status(201).json({ id: result.id, message: 'Timetable slot created with zero scheduling conflicts.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
