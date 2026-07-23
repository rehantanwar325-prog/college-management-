import sqlite3Pkg from 'sqlite3';
const sqlite3 = sqlite3Pkg.verbose();
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

const runQ = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { if (err) reject(err); else resolve(this); });
});
const allQ = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
});

async function setupCoursesAndDistribute() {
  console.log('Setting up 6 Departments, 8 Courses, Sections, Subjects, Fee Structures & Distributing 20 Students...');

  // 1. Departments / Branches
  const departmentsData = [
    ['Computer Science & Engineering', 'CSE'],
    ['Information Technology', 'IT'],
    ['Electronics & Communication Engineering', 'ECE'],
    ['Mechanical Engineering', 'ME'],
    ['Civil Engineering', 'CE'],
    ['Management & Business Studies', 'MGMT']
  ];

  const deptMap = {};
  for (const [name, code] of departmentsData) {
    const existing = await allQ('SELECT id FROM departments WHERE code = ?', [code]);
    if (existing.length > 0) {
      deptMap[code] = existing[0].id;
    } else {
      const res = await runQ('INSERT INTO departments (name, code) VALUES (?, ?)', [name, code]);
      deptMap[code] = res.lastID;
    }
  }
  console.log('Departments set up:', Object.keys(deptMap));

  // 2. 8 Courses
  const coursesData = [
    { name: 'B.Tech Computer Science', code: 'BTECH-CSE', dept: 'CSE', duration: 4, fee: 85000 },
    { name: 'B.Tech Information Technology', code: 'BTECH-IT', dept: 'IT', duration: 4, fee: 80000 },
    { name: 'B.Tech Electronics & Comm.', code: 'BTECH-ECE', dept: 'ECE', duration: 4, fee: 75000 },
    { name: 'B.Tech Mechanical Engg.', code: 'BTECH-ME', dept: 'ME', duration: 4, fee: 70000 },
    { name: 'B.Tech Civil Engineering', code: 'BTECH-CE', dept: 'CE', duration: 4, fee: 70000 },
    { name: 'Bachelor of Computer Applications', code: 'BCA', dept: 'CSE', duration: 3, fee: 45000 },
    { name: 'Master of Computer Applications', code: 'MCA', dept: 'CSE', duration: 2, fee: 60000 },
    { name: 'Bachelor of Business Admin', code: 'BBA', dept: 'MGMT', duration: 3, fee: 50000 }
  ];

  const courseList = [];
  for (const c of coursesData) {
    let courseId;
    const existing = await allQ('SELECT id FROM courses WHERE code = ?', [c.code]);
    if (existing.length > 0) {
      courseId = existing[0].id;
      await runQ('UPDATE courses SET name = ?, department_id = ?, duration_years = ? WHERE id = ?', [c.name, deptMap[c.dept], c.duration, courseId]);
    } else {
      const res = await runQ('INSERT INTO courses (name, code, department_id, duration_years) VALUES (?, ?, ?, ?)', [c.name, c.code, deptMap[c.dept], c.duration]);
      courseId = res.lastID;
    }

    // Ensure Section for Sem 1
    let sectionId;
    const secExisting = await allQ('SELECT id FROM sections WHERE course_id = ? AND semester = 1', [courseId]);
    if (secExisting.length > 0) {
      sectionId = secExisting[0].id;
    } else {
      const secRes = await runQ('INSERT INTO sections (name, course_id, semester) VALUES (?, ?, ?)', [`${c.code}-Sec A`, courseId, 1]);
      sectionId = secRes.lastID;
    }

    // Ensure Fee Structure
    const feeExisting = await allQ('SELECT id FROM fee_structures WHERE course_id = ? AND semester = 1', [courseId]);
    if (feeExisting.length === 0) {
      const breakdown = {
        tuition_fee: Math.round(c.fee * 0.7),
        lab_fee: Math.round(c.fee * 0.15),
        library_fee: Math.round(c.fee * 0.05),
        exam_fee: Math.round(c.fee * 0.1)
      };
      await runQ('INSERT INTO fee_structures (name, course_id, semester, total_amount, break_down_json) VALUES (?, ?, 1, ?, ?)',
        [`${c.name} - Semester 1 Fee`, courseId, c.fee, JSON.stringify(breakdown)]);
    }

    courseList.push({ id: courseId, code: c.code, name: c.name, section_id: sectionId });
  }
  console.log(`Configured ${courseList.length} courses with sections & fee structures.`);

  // 3. Ensure Core Subjects for each Course
  const subjectsData = [
    { code: 'CS101', name: 'Data Structures & Algorithms', course: 'BTECH-CSE', sem: 1, type: 'theory' },
    { code: 'CS102', name: 'Database Management Systems', course: 'BTECH-CSE', sem: 1, type: 'theory' },
    { code: 'IT101', name: 'Web Programming & Technologies', course: 'BTECH-IT', sem: 1, type: 'theory' },
    { code: 'IT102', name: 'Operating System Fundamentals', course: 'BTECH-IT', sem: 1, type: 'theory' },
    { code: 'EC101', name: 'Digital Electronics & Logic Design', course: 'BTECH-ECE', sem: 1, type: 'theory' },
    { code: 'EC102', name: 'Signals & Systems', course: 'BTECH-ECE', sem: 1, type: 'theory' },
    { code: 'ME101', name: 'Thermodynamics & Engineering Mechanics', course: 'BTECH-ME', sem: 1, type: 'theory' },
    { code: 'ME102', name: 'Fluid Mechanics', course: 'BTECH-ME', sem: 1, type: 'theory' },
    { code: 'CE101', name: 'Structural Analysis & Statics', course: 'BTECH-CE', sem: 1, type: 'theory' },
    { code: 'CE102', name: 'Surveying & Building Materials', course: 'BTECH-CE', sem: 1, type: 'theory' },
    { code: 'BCA101', name: 'C Programming & Logic', course: 'BCA', sem: 1, type: 'theory' },
    { code: 'BCA102', name: 'Computer Fundamentals', course: 'BCA', sem: 1, type: 'theory' },
    { code: 'MCA101', name: 'Advanced Java Programming', course: 'MCA', sem: 1, type: 'theory' },
    { code: 'MCA102', name: 'Cloud Computing & DevOps', course: 'MCA', sem: 1, type: 'theory' },
    { code: 'BBA101', name: 'Principles of Management', course: 'BBA', sem: 1, type: 'theory' },
    { code: 'BBA102', name: 'Financial Accounting', course: 'BBA', sem: 1, type: 'theory' }
  ];

  for (const s of subjectsData) {
    const crs = courseList.find(c => c.code === s.course);
    if (crs) {
      const existing = await allQ('SELECT id FROM subjects WHERE code = ?', [s.code]);
      if (existing.length === 0) {
        await runQ('INSERT INTO subjects (name, code, course_id, semester, type) VALUES (?, ?, ?, ?, ?)',
          [s.name, s.code, crs.id, s.sem, s.type]);
      }
    }
  }
  console.log('Subjects for all 8 courses configured.');

  // 4. Distribute all 20 Students evenly across the 8 courses
  const students = await allQ('SELECT id, first_name, last_name FROM students ORDER BY id ASC');
  console.log(`Distributing ${students.length} students across 8 courses...`);

  for (let i = 0; i < students.length; i++) {
    const st = students[i];
    const targetCourse = courseList[i % courseList.length];
    await runQ('UPDATE students SET course_id = ?, section_id = ?, semester = 1 WHERE id = ?',
      [targetCourse.id, targetCourse.section_id, st.id]);
    console.log(`Student [${st.id}] ${st.first_name} ${st.last_name} -> Assigned to ${targetCourse.name} (${targetCourse.code})`);
  }

  console.log('\nSUCCESS! 8 Courses, Branches, Subjects & Student Distribution Complete!');
  db.close();
}

setupCoursesAndDistribute().catch(e => { console.error(e); db.close(); });
