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

async function addStudents() {
  console.log('Checking current student count...');

  const currentCount = await allQ('SELECT COUNT(*) as c FROM students');
  console.log(`Current student count: ${currentCount[0].c}`);

  const targetCount = 20;
  const needed = targetCount - currentCount[0].c;

  if (needed <= 0) {
    console.log('Target of 20 students already reached or exceeded!');
    db.close();
    return;
  }

  console.log(`Adding ${needed} new students...`);
  const salt = await bcrypt.genSalt(10);
  const studentPasswordHash = await bcrypt.hash('student123', salt);

  const studentData = [
    { first: 'Rohan', last: 'Sharma', father: 'Sanjay Sharma', mother: 'Sunita Sharma', gender: 'Male', category: 'General', blood: 'O+', mobile: '9812345671', email: 'rohan.sharma@college.com', course: 1, section: 1, sem: 1, photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150' },
    { first: 'Priya', last: 'Verma', father: 'Rakesh Verma', mother: 'Anita Verma', gender: 'Female', category: 'OBC', blood: 'A+', mobile: '9812345672', email: 'priya.verma@college.com', course: 1, section: 1, sem: 1, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    { first: 'Amit', last: 'Kumar', father: 'Mahesh Kumar', mother: 'Geeta Kumar', gender: 'Male', category: 'SC', blood: 'B+', mobile: '9812345673', email: 'amit.kumar@college.com', course: 1, section: 2, sem: 1, photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    { first: 'Sneha', last: 'Gupta', father: 'Anil Gupta', mother: 'Rekha Gupta', gender: 'Female', category: 'General', blood: 'AB+', mobile: '9812345674', email: 'sneha.gupta@college.com', course: 2, section: 3, sem: 1, photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
    { first: 'Vikas', last: 'Singh', father: 'Vikram Singh', mother: 'Kavita Singh', gender: 'Male', category: 'General', blood: 'O-', mobile: '9812345675', email: 'vikas.singh@college.com', course: 1, section: 1, sem: 1, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    { first: 'Ananya', last: 'Roy', father: 'Debashish Roy', mother: 'Mitali Roy', gender: 'Female', category: 'General', blood: 'B-', mobile: '9812345676', email: 'ananya.roy@college.com', course: 1, section: 2, sem: 1, photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
    { first: 'Karan', last: 'Mehta', father: 'Harish Mehta', mother: 'Pooja Mehta', gender: 'Male', category: 'OBC', blood: 'A-', mobile: '9812345677', email: 'karan.mehta@college.com', course: 2, section: 3, sem: 1, photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' },
    { first: 'Neha', last: 'Yadav', father: 'Rajesh Yadav', mother: 'Saroj Yadav', gender: 'Female', category: 'OBC', blood: 'O+', mobile: '9812345678', email: 'neha.yadav@college.com', course: 1, section: 1, sem: 1, photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
    { first: 'Rahul', last: 'Nair', father: 'Suresh Nair', mother: 'Latha Nair', gender: 'Male', category: 'General', blood: 'B+', mobile: '9812345679', email: 'rahul.nair@college.com', course: 1, section: 2, sem: 1, photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150' },
    { first: 'Divya', last: 'Patel', father: 'Kirit Patel', mother: 'Shilpa Patel', gender: 'Female', category: 'General', blood: 'AB-', mobile: '9812345680', email: 'divya.patel@college.com', course: 2, section: 3, sem: 1, photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150' },
    { first: 'Aditya', last: 'Joshi', father: 'Prakash Joshi', mother: 'Sudha Joshi', gender: 'Male', category: 'General', blood: 'A+', mobile: '9812345681', email: 'aditya.joshi@college.com', course: 1, section: 1, sem: 1, photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
    { first: 'Pooja', last: 'Choudhary', father: 'Babulal Choudhary', mother: 'Kamla Choudhary', gender: 'Female', category: 'ST', blood: 'O+', mobile: '9812345682', email: 'pooja.choudhary@college.com', course: 1, section: 2, sem: 1, photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { first: 'Siddharth', last: 'Malhotra', father: 'Vijay Malhotra', mother: 'Meena Malhotra', gender: 'Male', category: 'General', blood: 'B+', mobile: '9812345683', email: 'siddharth.malhotra@college.com', course: 2, section: 3, sem: 1, photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150' },
    { first: 'Kriti', last: 'Sanon', father: 'Rahul Sanon', mother: 'Geeta Sanon', gender: 'Female', category: 'General', blood: 'O-', mobile: '9812345684', email: 'kriti.sanon@college.com', course: 1, section: 1, sem: 1, photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150' },
    { first: 'Varun', last: 'Dhawan', father: 'David Dhawan', mother: 'Karuna Dhawan', gender: 'Male', category: 'General', blood: 'A+', mobile: '9812345685', email: 'varun.dhawan@college.com', course: 1, section: 2, sem: 1, photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
    { first: 'Kiara', last: 'Advani', father: 'Jagdeep Advani', mother: 'Genevieve Advani', gender: 'Female', category: 'General', blood: 'AB+', mobile: '9812345686', email: 'kiara.advani@college.com', course: 2, section: 3, sem: 1, photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
    { first: 'Ayushmann', last: 'Khurrana', father: 'P. Khurrana', mother: 'Poonam Khurrana', gender: 'Male', category: 'OBC', blood: 'B+', mobile: '9812345687', email: 'ayushmann.k@college.com', course: 1, section: 1, sem: 1, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    { first: 'Taapsee', last: 'Pannu', father: 'Dilmohan Pannu', mother: 'Nirmaljeet Pannu', gender: 'Female', category: 'General', blood: 'O+', mobile: '9812345688', email: 'taapsee.p@college.com', course: 1, section: 2, sem: 1, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' }
  ];

  let startRoll = currentCount[0].c + 101;
  let startAdm = currentCount[0].c + 1;

  for (let i = 0; i < needed; i++) {
    const s = studentData[i];
    const rollNo = (startRoll + i).toString();
    const admNo = `ADM-2026-${String(startAdm + i).padStart(3, '0')}`;
    const aadhaar = `AADH-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    // 1. Create User account for student
    const userRes = await runQ('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [s.email, studentPasswordHash, 'student']);
    const userId = userRes.lastID;

    // 2. Insert Student record
    const studRes = await runQ(`
      INSERT INTO students (
        user_id, admission_no, roll_no, first_name, last_name, father_name, mother_name,
        dob, gender, category, blood_group, aadhaar_encrypted, mobile, email,
        address_permanent, address_current, photo_url, course_id, section_id, semester,
        academic_session_id, admission_date, previous_qualification, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `, [
      userId, admNo, rollNo, s.first, s.last, s.father, s.mother,
      '2004-05-15', s.gender, s.category, s.blood, aadhaar, s.mobile, s.email,
      'House No. 12, Tech Park Colony, City', 'Hostel Block-B, Campus', s.photo,
      s.course, s.section, s.sem, 1, '2026-07-01', '12th Standard Science'
    ]);
    const studentId = studRes.lastID;

    // 3. Issue Library Card for student
    const cardNo = `LIB-2026-${String(studentId).padStart(4, '0')}`;
    await runQ('INSERT INTO library_cards (student_id, card_number, status, issued_at) VALUES (?, ?, ?, ?)',
      [studentId, cardNo, 'active', '2026-07-01']);

    console.log(`[${i+1}/${needed}] Added Student: ${s.first} ${s.last} (Roll: ${rollNo}, Adm: ${admNo}, Email: ${s.email})`);
  }

  const finalCount = await allQ('SELECT COUNT(*) as c FROM students');
  console.log(`\nDone! Total student count in database is now: ${finalCount[0].c}`);
  db.close();
}

addStudents().catch(e => { console.error(e); db.close(); });
