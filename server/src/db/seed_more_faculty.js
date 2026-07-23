import sqlite3Pkg from 'sqlite3';
const sqlite3 = sqlite3Pkg.verbose();
import bcrypt from 'bcryptjs';
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

async function addFacultyForAllDepts() {
  console.log('Adding faculty members for all 6 departments...');

  const depts = await allQ('SELECT id, name, code FROM departments');
  const deptMap = {};
  depts.forEach(d => deptMap[d.code] = d.id);

  const salt = await bcrypt.genSalt(10);
  const facultyPasswordHash = await bcrypt.hash('password123', salt);

  const facultyData = [
    { name: 'Dr. Rajesh Kumar', empId: 'EMP-003', email: 'rajesh.kumar@college.com', dept: 'IT', desig: 'Professor & HOD' },
    { name: 'Prof. Meenakshi S.', empId: 'EMP-004', email: 'meenakshi.s@college.com', dept: 'IT', desig: 'Assistant Professor' },
    { name: 'Dr. Vikramaditya Rao', empId: 'EMP-005', email: 'v.rao@college.com', dept: 'ECE', desig: 'Professor & HOD' },
    { name: 'Prof. Swati Sharma', empId: 'EMP-006', email: 'swati.sharma@college.com', dept: 'ECE', desig: 'Associate Professor' },
    { name: 'Dr. Ramesh Chandra', empId: 'EMP-007', email: 'ramesh.chandra@college.com', dept: 'ME', desig: 'Professor & HOD' },
    { name: 'Prof. Alok Verma', empId: 'EMP-008', email: 'alok.verma@college.com', dept: 'ME', desig: 'Assistant Professor' },
    { name: 'Dr. Suresh Gupta', empId: 'EMP-009', email: 'suresh.gupta@college.com', dept: 'CE', desig: 'Professor & HOD' },
    { name: 'Prof. Ankit Tiwari', empId: 'EMP-010', email: 'ankit.tiwari@college.com', dept: 'CE', desig: 'Assistant Professor' },
    { name: 'Dr. Radhika Agarwal', empId: 'EMP-011', email: 'radhika.a@college.com', dept: 'MGMT', desig: 'Professor & HOD' },
    { name: 'Prof. Deepak Malhotra', empId: 'EMP-012', email: 'deepak.m@college.com', dept: 'MGMT', desig: 'Associate Professor' }
  ];

  for (const f of facultyData) {
    const existing = await allQ('SELECT id FROM faculty WHERE employee_id = ?', [f.empId]);
    if (existing.length === 0) {
      // 1. Create User
      const uRes = await runQ('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [f.email, facultyPasswordHash, 'faculty']);
      // 2. Create Faculty
      const fRes = await runQ('INSERT INTO faculty (user_id, name, employee_id, mobile, email, department_id, designation) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uRes.lastID, f.name, f.empId, '9876543' + Math.floor(100 + Math.random() * 900), f.email, deptMap[f.dept], f.desig]);
      console.log(`Added Faculty: ${f.name} (${f.dept} - ${f.desig})`);

      // Allocate to first subject of department if available
      const sub = await allQ('SELECT s.id, sec.id as section_id FROM subjects s JOIN courses c ON s.course_id = c.id JOIN sections sec ON sec.course_id = c.id WHERE c.department_id = ? LIMIT 1', [deptMap[f.dept]]);
      if (sub.length > 0) {
        await runQ('INSERT INTO faculty_allocations (faculty_id, subject_id, section_id) VALUES (?, ?, ?)',
          [fRes.lastID, sub[0].id, sub[0].section_id]);
      }
    }
  }

  console.log('All faculty members added successfully!');
  db.close();
}

addFacultyForAllDepts().catch(e => { console.error(e); db.close(); });
