import express from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run } from '../db/db.js';
import { authenticate, authorize, verifyStudentAccess } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/security.js';

const router = express.Router();

const STANDARD_DOCUMENTS = [
  { type: '10th_marksheet', name: '10th Marksheet & Passing Certificate' },
  { type: '12th_marksheet', name: '12th / Senior Secondary Marksheet' },
  { type: 'aadhaar_card', name: 'Aadhaar Card (Identity Proof)' },
  { type: 'transfer_certificate', name: 'Transfer Certificate (TC)' },
  { type: 'migration_certificate', name: 'Migration Certificate' },
  { type: 'caste_certificate', name: 'Caste / Category Certificate' },
  { type: 'income_certificate', name: 'Income / Scholarship Certificate' },
  { type: 'passport_photo', name: 'Passport Size Photographs' }
];

// Ensure student_documents table exists
run(`
  CREATE TABLE IF NOT EXISTS student_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    doc_type TEXT NOT NULL,
    doc_name TEXT NOT NULL,
    is_submitted INTEGER DEFAULT 0,
    verified_by TEXT DEFAULT '',
    submission_date TEXT,
    file_url TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(student_id, doc_type)
  )
`).catch(err => console.error('Failed to create student_documents table:', err.message));

// =========================================================================
// BULK STUDENT ADMISSION IMPORT VIA EXCEL/CSV
// =========================================================================
router.post('/bulk-import', authenticate, authorize(['admin']), async (req, res) => {
  const { students } = req.body;
  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: 'Array of student objects is required' });
  }

  let count = 0;
  const errors = [];

  try {
    const salt = await bcrypt.genSalt(10);

    for (const s of students) {
      if (!s.email || !s.first_name || !s.last_name || !s.admission_no || !s.roll_no) {
        errors.push(`Skipped ${s.email || 'record'}: missing required fields`);
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(s.password || 'student123', salt);
        
        let userResult;
        try {
          userResult = await run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [s.email, passwordHash, 'student']);
        } catch (e) {
          errors.push(`Skipped ${s.email}: email user already exists`);
          continue;
        }

        const aadhaarEnc = encrypt(s.aadhaar || '123456789012');

        await run(`
          INSERT INTO students (
            user_id, admission_no, roll_no, first_name, last_name, father_name, mother_name,
            dob, gender, category, blood_group, aadhaar_encrypted, mobile, email,
            address_permanent, address_current, photo_url, course_id, section_id, semester,
            academic_session_id, admission_date, previous_qualification
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userResult.id, s.admission_no, s.roll_no, s.first_name, s.last_name, s.father_name || 'N/A', s.mother_name || 'N/A',
          s.dob || '2007-01-01', s.gender || 'Male', s.category || 'General', s.blood_group || 'O+', aadhaarEnc, s.mobile || '9876543210', s.email,
          s.address_permanent || 'College Campus', s.address_current || 'College Campus', s.photo_url || '',
          s.course_id || 1, s.section_id || 1, s.semester || 1, s.academic_session_id || 1,
          new Date().toISOString().split('T')[0], s.previous_qualification || 'High School'
        ]);

        count++;
      } catch (err) {
        errors.push(`Skipped ${s.email}: ${err.message}`);
      }
    }

    await run('INSERT INTO audit_logs (user_id, action, target_table, details) VALUES (?, ?, ?, ?)',
      [req.user.id, 'BULK_ADMISSION', 'students', `Imported ${count} students via bulk file upload.`]);

    res.status(201).json({
      message: `Successfully processed bulk admissions! Admitted ${count} students.`,
      admitted_count: count,
      skipped_errors: errors
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of students (Restricted to Admin/Faculty)
router.get('/', authenticate, authorize(['admin', 'faculty']), async (req, res) => {
  const { course_id, section_id, semester, search } = req.query;
  try {
    let sql = `
      SELECT s.*, c.name as course_name, sec.name as section_name 
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE 1=1
    `;
    const params = [];

    if (course_id) {
      sql += ' AND s.course_id = ?';
      params.push(course_id);
    }
    if (section_id) {
      sql += ' AND s.section_id = ?';
      params.push(section_id);
    }
    if (semester) {
      sql += ' AND s.semester = ?';
      params.push(semester);
    }
    if (search) {
      sql += ' AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_no LIKE ? OR s.roll_no LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY s.first_name ASC, s.last_name ASC';

    const students = await query(sql, params);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Single student
router.get('/:id', authenticate, async (req, res) => {
  const studentId = req.params.id;
  try {
    const isAuthorized = await verifyStudentAccess(req.user, studentId);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this student profile.' });
    }

    const student = await queryOne(`
      SELECT s.*, c.name as course_name, sec.name as section_name, ses.name as session_name, u.email as login_email
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN academic_sessions ses ON s.academic_session_id = ses.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [studentId]);

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Fetch Parent details if linked
    const parent = await queryOne('SELECT * FROM parents WHERE student_id = ?', [studentId]);
    if (parent) {
      student.parent_id = parent.id;
      student.parent_name = parent.name;
      student.parent_mobile = parent.mobile;
      student.parent_email = parent.email;
      student.parent_relation = parent.relation;
    }

    // Fetch or initialize document checklist
    let docs = await query('SELECT * FROM student_documents WHERE student_id = ? ORDER BY id ASC', [studentId]);
    if (!docs || docs.length === 0) {
      for (const stdDoc of STANDARD_DOCUMENTS) {
        // default 10th, 12th, aadhaar, photo to submitted, others to pending
        const defaultSubmitted = ['10th_marksheet', '12th_marksheet', 'aadhaar_card', 'passport_photo'].includes(stdDoc.type) ? 1 : 0;
        await run(`
          INSERT OR IGNORE INTO student_documents (student_id, doc_type, doc_name, is_submitted, verified_by, submission_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [studentId, stdDoc.type, stdDoc.name, defaultSubmitted, defaultSubmitted ? 'Admin' : '', defaultSubmitted ? new Date().toISOString().split('T')[0] : null]);
      }
      docs = await query('SELECT * FROM student_documents WHERE student_id = ? ORDER BY id ASC', [studentId]);
    }
    student.documents = docs;

    student.aadhaar = decrypt(student.aadhaar_encrypted);
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admit Student Single
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  const {
    email, password, admission_no, roll_no, first_name, last_name, father_name, mother_name,
    dob, gender, category, blood_group, aadhaar, mobile, address_permanent, address_current,
    photo_url, course_id, section_id, semester, academic_session_id, admission_date, previous_qualification,
    parent_name, parent_mobile, parent_email, parent_relation, submitted_documents
  } = req.body;

  if (!email || !password || !admission_no || !roll_no || !first_name || !last_name || !father_name || !dob || !gender || !mobile || !aadhaar) {
    return res.status(400).json({ error: 'Missing required student profile fields' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    let userResult;
    try {
      userResult = await run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [email, password_hash, 'student']);
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists as a login user' });
      throw e;
    }

    const aadhaar_encrypted = encrypt(aadhaar);

    const studentResult = await run(`
      INSERT INTO students (
        user_id, admission_no, roll_no, first_name, last_name, father_name, mother_name,
        dob, gender, category, blood_group, aadhaar_encrypted, mobile, email,
        address_permanent, address_current, photo_url, course_id, section_id, semester,
        academic_session_id, admission_date, previous_qualification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userResult.id, admission_no, roll_no, first_name, last_name, father_name, mother_name || '',
      dob, gender, category || 'General', blood_group || 'O+', aadhaar_encrypted, mobile, email,
      address_permanent, address_current || address_permanent, photo_url || '',
      course_id || null, section_id || null, semester || 1, academic_session_id || null,
      admission_date || new Date().toISOString().split('T')[0], previous_qualification || ''
    ]);

    // Create Parent Account if details provided
    if (parent_name && parent_email) {
      try {
        const pSalt = await bcrypt.genSalt(10);
        const pHash = await bcrypt.hash('parent123', pSalt);
        const pUser = await run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [parent_email, pHash, 'parent']);
        await run(`
          INSERT INTO parents (user_id, name, mobile, email, relation, student_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [pUser.id, parent_name, parent_mobile || '9876543210', parent_email, parent_relation || 'Father', studentResult.id]);
      } catch (pErr) {
        console.error('Failed to create parent account:', pErr.message);
      }
    }

    // Save document checklist for new student
    const docSubList = Array.isArray(submitted_documents) ? submitted_documents : ['10th_marksheet', '12th_marksheet', 'aadhaar_card', 'passport_photo'];
    for (const stdDoc of STANDARD_DOCUMENTS) {
      const isSub = docSubList.includes(stdDoc.type) ? 1 : 0;
      await run(`
        INSERT OR IGNORE INTO student_documents (student_id, doc_type, doc_name, is_submitted, verified_by, submission_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [studentResult.id, stdDoc.type, stdDoc.name, isSub, isSub ? 'Admin' : '', isSub ? new Date().toISOString().split('T')[0] : null]);
    }

    await run('INSERT INTO audit_logs (user_id, action, target_table, record_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'ADMIT_STUDENT', 'students', studentResult.id, `Admitted student ${first_name} ${last_name}`]);

    res.status(201).json({ id: studentResult.id, message: 'Student admitted and account created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit Student Profile
router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const {
    roll_no, first_name, last_name, father_name, mother_name, dob, gender, category,
    blood_group, aadhaar, mobile, address_permanent, address_current, photo_url,
    course_id, section_id, semester, academic_session_id, admission_date, previous_qualification, status,
    parent_name, parent_mobile, parent_email, parent_relation, submitted_documents
  } = req.body;

  try {
    const student = await queryOne('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    let aadhaar_encrypted = student.aadhaar_encrypted;
    if (aadhaar) {
      aadhaar_encrypted = encrypt(aadhaar);
    }

    await run(`
      UPDATE students SET 
        roll_no = ?, first_name = ?, last_name = ?, father_name = ?, mother_name = ?,
        dob = ?, gender = ?, category = ?, blood_group = ?, aadhaar_encrypted = ?,
        mobile = ?, address_permanent = ?, address_current = ?, photo_url = ?,
        course_id = ?, section_id = ?, semester = ?, academic_session_id = ?,
        admission_date = ?, previous_qualification = ?, status = ?
      WHERE id = ?
    `, [
      roll_no || student.roll_no, first_name || student.first_name, last_name || student.last_name,
      father_name || student.father_name, mother_name || student.mother_name, dob || student.dob,
      gender || student.gender, category || student.category, blood_group || student.blood_group,
      aadhaar_encrypted, mobile || student.mobile, address_permanent || student.address_permanent,
      address_current || student.address_current, photo_url || student.photo_url,
      course_id !== undefined ? course_id : student.course_id,
      section_id !== undefined ? section_id : student.section_id,
      semester || student.semester,
      academic_session_id !== undefined ? academic_session_id : student.academic_session_id,
      admission_date || student.admission_date,
      previous_qualification || student.previous_qualification,
      status || student.status,
      req.params.id
    ]);

    if (status && status !== student.status) {
      const userStatus = status === 'active' ? 'active' : 'inactive';
      await run('UPDATE users SET status = ? WHERE id = ?', [userStatus, student.user_id]);
    }

    // Update Document Checklist
    if (submitted_documents && Array.isArray(submitted_documents)) {
      for (const stdDoc of STANDARD_DOCUMENTS) {
        const isSub = submitted_documents.includes(stdDoc.type) ? 1 : 0;
        const existing = await queryOne('SELECT * FROM student_documents WHERE student_id = ? AND doc_type = ?', [req.params.id, stdDoc.type]);
        if (existing) {
          await run(`
            UPDATE student_documents SET is_submitted = ?, submission_date = ?, verified_by = ? WHERE id = ?
          `, [isSub, isSub ? (existing.submission_date || new Date().toISOString().split('T')[0]) : null, isSub ? 'Admin' : '', existing.id]);
        } else {
          await run(`
            INSERT INTO student_documents (student_id, doc_type, doc_name, is_submitted, verified_by, submission_date)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [req.params.id, stdDoc.type, stdDoc.name, isSub, isSub ? 'Admin' : '', isSub ? new Date().toISOString().split('T')[0] : null]);
        }
      }
    }

    // Save/Update Parent Information
    if (parent_name || parent_mobile || parent_email) {
      const existingParent = await queryOne('SELECT * FROM parents WHERE student_id = ?', [req.params.id]);
      if (existingParent) {
        await run(`
          UPDATE parents SET name = ?, mobile = ?, email = ?, relation = ? WHERE id = ?
        `, [
          parent_name || existingParent.name,
          parent_mobile || existingParent.mobile,
          parent_email || existingParent.email,
          parent_relation || existingParent.relation || 'Father',
          existingParent.id
        ]);
        if (parent_email && parent_email !== existingParent.email) {
          await run('UPDATE users SET email = ? WHERE id = ?', [parent_email, existingParent.user_id]);
        }
      } else if (parent_name && parent_email) {
        try {
          const salt = await bcrypt.genSalt(10);
          const password_hash = await bcrypt.hash('parent123', salt);
          const pUser = await run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [parent_email, password_hash, 'parent']);
          await run(`
            INSERT INTO parents (user_id, name, mobile, email, relation, student_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [pUser.id, parent_name, parent_mobile || '9876543210', parent_email, parent_relation || 'Father', req.params.id]);
        } catch (e) {
          console.error('Failed to create parent account during update:', e.message);
        }
      }
    }

    await run('INSERT INTO audit_logs (user_id, action, target_table, record_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE_STUDENT', 'students', req.params.id, `Updated student profile for ${first_name || student.first_name}`]);

    res.json({ message: 'Student profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Student
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const student = await queryOne('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await run('DELETE FROM students WHERE id = ?', [req.params.id]);
    if (student.user_id) {
      await run('DELETE FROM users WHERE id = ?', [student.user_id]);
    }

    await run('INSERT INTO audit_logs (user_id, action, target_table, record_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE_STUDENT', 'students', req.params.id, `Deleted student profile & user login: ${student.first_name}`]);

    res.json({ message: 'Student and credentials deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Parents list
router.get('/parents/list', authenticate, authorize(['admin', 'faculty']), async (req, res) => {
  try {
    const parents = await query(`
      SELECT p.*, s.first_name as student_first_name, s.last_name as student_last_name, s.admission_no as student_adm_no
      FROM parents p
      LEFT JOIN students s ON p.student_id = s.id
    `);
    res.json(parents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Parent create
router.post('/parents', authenticate, authorize(['admin']), async (req, res) => {
  const { name, mobile, email, password, relation, student_id } = req.body;
  if (!name || !mobile || !email || !password || !relation || !student_id) {
    return res.status(400).json({ error: 'All parent fields (name, mobile, email, password, relation, student) are required' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    let userResult;
    try {
      userResult = await run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [email, password_hash, 'parent']);
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
      throw e;
    }

    const result = await run(`
      INSERT INTO parents (user_id, name, mobile, email, relation, student_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userResult.id, name, mobile, email, relation, student_id]);

    res.status(201).json({ id: result.id, name, relation, student_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Faculty list
router.get('/faculty/list', authenticate, authorize(['admin', 'faculty']), async (req, res) => {
  const { department_id } = req.query;
  try {
    let sql = `
      SELECT f.*, d.name as department_name 
      FROM faculty f
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (department_id) {
      sql += ' AND f.department_id = ?';
      params.push(department_id);
    }
    sql += ' ORDER BY f.name ASC';

    const faculty = await query(sql, params);
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Faculty create
router.post('/faculty', authenticate, authorize(['admin']), async (req, res) => {
  const { name, employee_id, mobile, email, password, department_id, designation } = req.body;
  if (!name || !employee_id || !mobile || !email || !password || !designation) {
    return res.status(400).json({ error: 'Required fields missing: name, employee_id, mobile, email, password, designation' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    let userResult;
    try {
      userResult = await run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [email, password_hash, 'faculty']);
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
      throw e;
    }

    const result = await run(`
      INSERT INTO faculty (user_id, name, employee_id, mobile, email, department_id, designation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userResult.id, name, employee_id, mobile, email, department_id || null, designation]);

    res.status(201).json({ id: result.id, name, employee_id, designation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Faculty edit
router.put('/faculty/:id', authenticate, authorize(['admin']), async (req, res) => {
  const { name, mobile, department_id, designation, status } = req.body;
  try {
    const fac = await queryOne('SELECT * FROM faculty WHERE id = ?', [req.params.id]);
    if (!fac) return res.status(404).json({ error: 'Faculty not found' });

    await run(`
      UPDATE faculty SET name = ?, mobile = ?, department_id = ?, designation = ?, status = ?
      WHERE id = ?
    `, [
      name || fac.name,
      mobile || fac.mobile,
      department_id !== undefined ? department_id : fac.department_id,
      designation || fac.designation,
      status || fac.status,
      req.params.id
    ]);

    if (status && status !== fac.status) {
      const userStatus = status === 'active' ? 'active' : 'inactive';
      await run('UPDATE users SET status = ? WHERE id = ?', [userStatus, fac.user_id]);
    }

    res.json({ message: 'Faculty profile updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Faculty delete
router.delete('/faculty/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const fac = await queryOne('SELECT * FROM faculty WHERE id = ?', [req.params.id]);
    if (!fac) return res.status(404).json({ error: 'Faculty not found' });

    await run('DELETE FROM faculty WHERE id = ?', [req.params.id]);
    if (fac.user_id) {
      await run('DELETE FROM users WHERE id = ?', [fac.user_id]);
    }

    res.json({ message: 'Faculty deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
