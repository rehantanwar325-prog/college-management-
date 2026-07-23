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

async function add5FacultyPerDepartment() {
  console.log('Ensuring 5 Faculty Members for each of the 6 Departments...');

  const depts = await allQ('SELECT id, name, code FROM departments');
  const deptMap = {};
  depts.forEach(d => deptMap[d.code] = d.id);

  const salt = await bcrypt.genSalt(10);
  const facultyPasswordHash = await bcrypt.hash('password123', salt);

  const additionalFaculty = [
    // CSE (+3)
    { name: 'Dr. Vivek Oberoi', empId: 'EMP-013', email: 'vivek.oberoi@college.com', dept: 'CSE', desig: 'Associate Professor' },
    { name: 'Prof. Sonali Bendre', empId: 'EMP-014', email: 'sonali.bendre@college.com', dept: 'CSE', desig: 'Assistant Professor' },
    { name: 'Er. Kunal Kapoor', empId: 'EMP-015', email: 'kunal.kapoor@college.com', dept: 'CSE', desig: 'Lab Instructor' },

    // IT (+3)
    { name: 'Dr. Madhavan Nair', empId: 'EMP-016', email: 'madhavan.nair@college.com', dept: 'IT', desig: 'Associate Professor' },
    { name: 'Prof. Genelia D.', empId: 'EMP-017', email: 'genelia.d@college.com', dept: 'IT', desig: 'Assistant Professor' },
    { name: 'Er. Ritesh Deshmukh', empId: 'EMP-018', email: 'ritesh.d@college.com', dept: 'IT', desig: 'Senior Lecturer' },

    // ECE (+3)
    { name: 'Dr. Arvind Swamy', empId: 'EMP-019', email: 'arvind.swamy@college.com', dept: 'ECE', desig: 'Associate Professor' },
    { name: 'Prof. Trisha Krishnan', empId: 'EMP-020', email: 'trisha.k@college.com', dept: 'ECE', desig: 'Assistant Professor' },
    { name: 'Er. Dhanush K.', empId: 'EMP-021', email: 'dhanush.k@college.com', dept: 'ECE', desig: 'Technical Assistant' },

    // ME (+3)
    { name: 'Dr. Nagarjuna Akkineni', empId: 'EMP-022', email: 'nagarjuna.a@college.com', dept: 'ME', desig: 'Associate Professor' },
    { name: 'Prof. Anushka Shetty', empId: 'EMP-023', email: 'anushka.s@college.com', dept: 'ME', desig: 'Assistant Professor' },
    { name: 'Er. Rana Daggubati', empId: 'EMP-024', email: 'rana.d@college.com', dept: 'ME', desig: 'Workshop Instructor' },

    // CE (+3)
    { name: 'Dr. Kamal Haasan', empId: 'EMP-025', email: 'kamal.haasan@college.com', dept: 'CE', desig: 'Associate Professor' },
    { name: 'Prof. Jyothika Saravanan', empId: 'EMP-026', email: 'jyothika.s@college.com', dept: 'CE', desig: 'Assistant Professor' },
    { name: 'Er. Suriya Sivakumar', empId: 'EMP-027', email: 'suriya.s@college.com', dept: 'CE', desig: 'Structural Lab Engineer' },

    // MGMT (+3)
    { name: 'Dr. Mohanlal Viswanathan', empId: 'EMP-028', email: 'mohanlal.v@college.com', dept: 'MGMT', desig: 'Associate Professor' },
    { name: 'Prof. Sobhita Dhulipala', empId: 'EMP-029', email: 'sobhita.d@college.com', dept: 'MGMT', desig: 'Assistant Professor' },
    { name: 'Er. Dulquer Salmaan', empId: 'EMP-030', email: 'dulquer.s@college.com', dept: 'MGMT', desig: 'Assistant Professor' }
  ];

  for (const f of additionalFaculty) {
    const existing = await allQ('SELECT id FROM faculty WHERE employee_id = ?', [f.empId]);
    if (existing.length === 0) {
      // 1. User login
      const uRes = await runQ('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [f.email, facultyPasswordHash, 'faculty']);
      // 2. Faculty profile
      const fRes = await runQ('INSERT INTO faculty (user_id, name, employee_id, mobile, email, department_id, designation) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uRes.lastID, f.name, f.empId, '9876543' + Math.floor(100 + Math.random() * 900), f.email, deptMap[f.dept], f.desig]);
      
      console.log(`Added Faculty: ${f.name} (${f.dept} - ${f.desig})`);

      // Allocate subject if available
      const sub = await allQ('SELECT s.id, sec.id as section_id FROM subjects s JOIN courses c ON s.course_id = c.id JOIN sections sec ON sec.course_id = c.id WHERE c.department_id = ? LIMIT 1', [deptMap[f.dept]]);
      if (sub.length > 0) {
        try {
          await runQ('INSERT INTO faculty_allocations (faculty_id, subject_id, section_id) VALUES (?, ?, ?)',
            [fRes.lastID, sub[0].id, sub[0].section_id]);
        } catch(e) {}
      }
    }
  }

  // Verification per department
  for (const d of depts) {
    const count = await allQ('SELECT COUNT(*) as c FROM faculty WHERE department_id = ?', [d.id]);
    console.log(`Department: ${d.name} (${d.code}) -> Total Faculty: ${count[0].c}`);
  }

  const totalFac = await allQ('SELECT COUNT(*) as c FROM faculty');
  console.log(`\nDone! Total faculty count in database is now: ${totalFac[0].c}`);
  db.close();
}

add5FacultyPerDepartment().catch(e => { console.error(e); db.close(); });
