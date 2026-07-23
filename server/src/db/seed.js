import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../', process.env.DB_FILE || 'database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log('Starting Database Initialization & Seeding...');

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const execQuery = (sql) => {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

async function seed() {
  try {
    // 1. Drop existing tables if they exist to start fresh
    console.log('Dropping old tables...');
    await execQuery('PRAGMA foreign_keys = OFF;');
    const dropTables = [
      'audit_logs', 'notices', 'library_issues', 'library_books', 'library_cards',
      'scholarships', 'fee_collections', 'fee_structures', 'exam_marks', 'exams',
      'timetables', 'assignment_submissions', 'assignments', 'study_materials',
      'leave_records', 'attendance', 'group_members', 'groups', 'faculty_allocations',
      'faculty', 'parents', 'students', 'academic_sessions', 'subjects', 'sections',
      'courses', 'departments', 'users'
    ];
    for (const table of dropTables) {
      await execQuery(`DROP TABLE IF EXISTS ${table};`);
    }
    await execQuery('PRAGMA foreign_keys = ON;');

    console.log('Creating database schema...');

    // 2. Create Schema
    const schema = `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('superadmin', 'admin', 'faculty', 'student', 'parent')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        permissions TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL
      );

      CREATE TABLE courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        department_id INTEGER,
        duration_years INTEGER NOT NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      );

      CREATE TABLE sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        course_id INTEGER,
        semester INTEGER NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE TABLE subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        course_id INTEGER,
        semester INTEGER NOT NULL,
        type TEXT CHECK(type IN ('theory', 'practical')) DEFAULT 'theory',
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE TABLE academic_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active'
      );

      CREATE TABLE students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        admission_no TEXT UNIQUE NOT NULL,
        roll_no TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        father_name TEXT NOT NULL,
        mother_name TEXT NOT NULL,
        dob TEXT NOT NULL,
        gender TEXT NOT NULL,
        category TEXT NOT NULL,
        blood_group TEXT NOT NULL,
        aadhaar_encrypted TEXT NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT NOT NULL,
        address_permanent TEXT NOT NULL,
        address_current TEXT,
        photo_url TEXT,
        course_id INTEGER,
        section_id INTEGER,
        semester INTEGER NOT NULL,
        academic_session_id INTEGER,
        admission_date TEXT NOT NULL,
        previous_qualification TEXT,
        status TEXT CHECK(status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
        FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE SET NULL,
        UNIQUE(section_id, roll_no)
      );

      CREATE TABLE parents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT NOT NULL,
        relation TEXT NOT NULL,
        student_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );

      CREATE TABLE faculty (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        name TEXT NOT NULL,
        employee_id TEXT UNIQUE NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT NOT NULL,
        department_id INTEGER,
        designation TEXT NOT NULL,
        status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      );

      CREATE TABLE faculty_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        faculty_id INTEGER,
        subject_id INTEGER,
        section_id INTEGER,
        FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
        UNIQUE(faculty_id, subject_id, section_id)
      );

      CREATE TABLE groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('department', 'course', 'semester', 'section', 'subject', 'custom')),
        description TEXT
      );

      CREATE TABLE group_members (
        group_id INTEGER,
        student_id INTEGER,
        PRIMARY KEY (group_id, student_id),
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );

      CREATE TABLE attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        date TEXT NOT NULL,
        status TEXT CHECK(status IN ('present', 'absent', 'leave')) NOT NULL,
        remarks TEXT,
        marked_by INTEGER,
        subject_id INTEGER, -- Nullable if daily, specified if subject-wise
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      );

      CREATE TABLE leave_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
        remarks TEXT,
        action_by INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (action_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE study_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        subject_id INTEGER,
        section_id INTEGER,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        uploaded_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        subject_id INTEGER,
        section_id INTEGER,
        file_path TEXT,
        due_date TEXT NOT NULL,
        max_marks INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
      );

      CREATE TABLE assignment_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER,
        student_id INTEGER,
        file_path TEXT NOT NULL,
        submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        marks_obtained REAL,
        remarks TEXT,
        graded_by INTEGER,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE timetables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id INTEGER,
        subject_id INTEGER,
        faculty_id INTEGER,
        day_of_week TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        room_no TEXT,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
      );

      CREATE TABLE exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('internal', 'practical', 'semester')) NOT NULL,
        academic_session_id INTEGER,
        date TEXT NOT NULL,
        FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE SET NULL
      );

      CREATE TABLE exam_marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER,
        student_id INTEGER,
        subject_id INTEGER,
        theory_marks REAL,
        practical_marks REAL,
        marked_by INTEGER,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE fee_structures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        course_id INTEGER,
        semester INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        break_down_json TEXT, -- JSON structure listing individual heads
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE TABLE fee_collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        fee_structure_id INTEGER,
        amount_paid REAL NOT NULL,
        payment_date TEXT NOT NULL,
        payment_mode TEXT NOT NULL,
        transaction_id TEXT,
        remarks TEXT,
        receipt_no TEXT UNIQUE NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE SET NULL
      );

      CREATE TABLE scholarships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        adjusted INTEGER DEFAULT 0 CHECK(adjusted IN (0, 1)),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );

      CREATE TABLE library_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER UNIQUE,
        card_number TEXT UNIQUE NOT NULL,
        status TEXT CHECK(status IN ('active', 'suspended')) DEFAULT 'active',
        issued_at TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );

      CREATE TABLE library_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT UNIQUE,
        category TEXT,
        total_copies INTEGER DEFAULT 1,
        available_copies INTEGER DEFAULT 1
      );

      CREATE TABLE library_issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER,
        book_id INTEGER,
        issue_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        return_date TEXT,
        status TEXT CHECK(status IN ('issued', 'returned')) DEFAULT 'issued',
        fine_amount REAL DEFAULT 0,
        fine_paid INTEGER DEFAULT 0 CHECK(fine_paid IN (0, 1)),
        FOREIGN KEY (card_id) REFERENCES library_cards(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE
      );

      CREATE TABLE notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        target_roles_json TEXT, -- array of roles e.g. ["student", "faculty"]
        target_groups_json TEXT, -- array of group IDs e.g. [1, 2]
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        target_table TEXT,
        record_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `;

    await execQuery(schema);
    console.log('Database tables created successfully.');

    // 3. Hash passwords for seed users
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('admin123', salt);
    const facultyHash = await bcrypt.hash('password123', salt);
    const studentHash = await bcrypt.hash('student123', salt);
    const parentHash = await bcrypt.hash('parent123', salt);

    console.log('Inserting seed users...');
    // Create Users
    const uSuperAdmin = await runQuery('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['superadmin@college.com', adminHash, 'superadmin']);
    const uAdmin = await runQuery('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['admin@college.com', adminHash, 'admin']);
    const uFaculty1 = await runQuery('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['smith@college.com', facultyHash, 'faculty']);
    const uFaculty2 = await runQuery('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['jones@college.com', facultyHash, 'faculty']);
    const uStudent1 = await runQuery('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['alice@college.com', studentHash, 'student']);
    const uStudent2 = await runQuery('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['bob@college.com', studentHash, 'student']);
    const uParent1 = await runQuery('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['richard@college.com', parentHash, 'parent']);
    const uParent2 = await runQuery('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', ['mary@college.com', parentHash, 'parent']);

    console.log('Inserting academic masters (departments, courses, sections, subjects)...');
    // Departments
    const dCSE = await runQuery('INSERT INTO departments (name, code) VALUES (?, ?)', ['Computer Science & Engineering', 'CSE']);
    const dIT = await runQuery('INSERT INTO departments (name, code) VALUES (?, ?)', ['Information Technology', 'IT']);

    // Courses
    const cBTech = await runQuery('INSERT INTO courses (name, code, department_id, duration_years) VALUES (?, ?, ?, ?)', ['B.Tech Computer Science', 'BTECH-CSE', dCSE.lastID, 4]);
    const cBCA = await runQuery('INSERT INTO courses (name, code, department_id, duration_years) VALUES (?, ?, ?, ?)', ['Bachelor of Computer Applications', 'BCA', dCSE.lastID, 3]);

    // Sections
    const sBTechA = await runQuery('INSERT INTO sections (name, course_id, semester) VALUES (?, ?, ?)', ['CSE-A (Semester 1)', cBTech.lastID, 1]);
    const sBTechB = await runQuery('INSERT INTO sections (name, course_id, semester) VALUES (?, ?, ?)', ['CSE-B (Semester 1)', cBTech.lastID, 1]);
    const sBcaA = await runQuery('INSERT INTO sections (name, course_id, semester) VALUES (?, ?, ?)', ['BCA-A (Semester 1)', cBCA.lastID, 1]);

    // Subjects
    const subDS = await runQuery('INSERT INTO subjects (name, code, course_id, semester, type) VALUES (?, ?, ?, ?, ?)', ['Data Structures', 'CS101', cBTech.lastID, 1, 'theory']);
    const subDBMS = await runQuery('INSERT INTO subjects (name, code, course_id, semester, type) VALUES (?, ?, ?, ?, ?)', ['Database Management Systems', 'CS102', cBTech.lastID, 1, 'theory']);
    const subMath = await runQuery('INSERT INTO subjects (name, code, course_id, semester, type) VALUES (?, ?, ?, ?, ?)', ['Discrete Mathematics', 'CS103', cBTech.lastID, 1, 'theory']);
    const subDSL = await runQuery('INSERT INTO subjects (name, code, course_id, semester, type) VALUES (?, ?, ?, ?, ?)', ['Data Structures Lab', 'CS101P', cBTech.lastID, 1, 'practical']);

    // Academic Sessions
    const sessionActive = await runQuery('INSERT INTO academic_sessions (name, status) VALUES (?, ?)', ['2025-26', 'active']);

    console.log('Inserting profiles (faculty, students, parents)...');
    // Faculty profiles
    const fSmith = await runQuery('INSERT INTO faculty (user_id, name, employee_id, mobile, email, department_id, designation) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [uFaculty1.lastID, 'Dr. Aris Smith', 'EMP-001', '9876543210', 'smith@college.com', dCSE.lastID, 'Professor & Head']);
    const fJones = await runQuery('INSERT INTO faculty (user_id, name, employee_id, mobile, email, department_id, designation) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [uFaculty2.lastID, 'Dr. Helen Jones', 'EMP-002', '9876543211', 'jones@college.com', dCSE.lastID, 'Associate Professor']);

    // Allocate Faculty to Subjects/Sections
    await runQuery('INSERT INTO faculty_allocations (faculty_id, subject_id, section_id) VALUES (?, ?, ?)', [fSmith.lastID, subDS.lastID, sBTechA.lastID]);
    await runQuery('INSERT INTO faculty_allocations (faculty_id, subject_id, section_id) VALUES (?, ?, ?)', [fSmith.lastID, subDSL.lastID, sBTechA.lastID]);
    await runQuery('INSERT INTO faculty_allocations (faculty_id, subject_id, section_id) VALUES (?, ?, ?)', [fJones.lastID, subDBMS.lastID, sBTechA.lastID]);

    // Student Profiles
    // For Aadhaar encryption, we store dummy encrypted strings. In code we will use proper aes-256-cbc.
    const studAlice = await runQuery(`
      INSERT INTO students (
        user_id, admission_no, roll_no, first_name, last_name, father_name, mother_name,
        dob, gender, category, blood_group, aadhaar_encrypted, mobile, email,
        address_permanent, address_current, photo_url, course_id, section_id, semester,
        academic_session_id, admission_date, previous_qualification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uStudent1.lastID, 'ADM-2025-001', '101', 'Alice', 'Johnson', 'Richard Johnson', 'Sarah Johnson',
        '2007-04-12', 'Female', 'General', 'O+', 'ENC:aadhaar-alice-encrypted', '9876500001', 'alice@college.com',
        '123 Baker Street, London', '123 Baker Street, London', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
        cBTech.lastID, sBTechA.lastID, 1, sessionActive.lastID, '2025-07-01', 'High School - 92%'
      ]
    );

    const studBob = await runQuery(`
      INSERT INTO students (
        user_id, admission_no, roll_no, first_name, last_name, father_name, mother_name,
        dob, gender, category, blood_group, aadhaar_encrypted, mobile, email,
        address_permanent, address_current, photo_url, course_id, section_id, semester,
        academic_session_id, admission_date, previous_qualification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uStudent2.lastID, 'ADM-2025-002', '102', 'Bob', 'Miller', 'Michael Miller', 'Mary Miller',
        '2006-09-25', 'Male', 'OBC', 'A+', 'ENC:aadhaar-bob-encrypted', '9876500002', 'bob@college.com',
        '456 Elm Road, Manchester', 'Campus Hostel Room 302', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
        cBTech.lastID, sBTechA.lastID, 1, sessionActive.lastID, '2025-07-02', 'High School - 78%'
      ]
    );

    // Parent profiles
    await runQuery('INSERT INTO parents (user_id, name, mobile, email, relation, student_id) VALUES (?, ?, ?, ?, ?, ?)',
      [uParent1.lastID, 'Richard Johnson', '9876500003', 'richard@college.com', 'Father', studAlice.lastID]);
    await runQuery('INSERT INTO parents (user_id, name, mobile, email, relation, student_id) VALUES (?, ?, ?, ?, ?, ?)',
      [uParent2.lastID, 'Mary Miller', '9876500004', 'mary@college.com', 'Mother', studBob.lastID]);

    console.log('Inserting group memberships...');
    // Create Groups
    const gCoding = await runQuery('INSERT INTO groups (name, type, description) VALUES (?, ?, ?)', ['Coding Club', 'custom', 'Student developer and programming enthusiasts club']);
    const gSports = await runQuery('INSERT INTO groups (name, type, description) VALUES (?, ?, ?)', ['Sports Club', 'custom', 'Athletics, football, and indoor sports organizing committee']);
    const gSectionA = await runQuery('INSERT INTO groups (name, type, description) VALUES (?, ?, ?)', ['CSE-A Group', 'section', 'Automated section communication group']);

    // Enroll students in groups
    await runQuery('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)', [gCoding.lastID, studAlice.lastID]);
    await runQuery('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)', [gCoding.lastID, studBob.lastID]);
    await runQuery('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)', [gSports.lastID, studBob.lastID]);
    await runQuery('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)', [gSectionA.lastID, studAlice.lastID]);
    await runQuery('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)', [gSectionA.lastID, studBob.lastID]);

    console.log('Inserting attendance records...');
    // Daily/Subject Attendance
    // Let's mark attendance for 5 days.
    // Alice: 5 days present. Bob: 3 days present, 1 day absent, 1 day leave.
    const dates = ['2026-07-15', '2026-07-16', '2026-07-17', '2026-07-20', '2026-07-21'];
    
    // Alice attendance
    for (const dt of dates) {
      await runQuery('INSERT INTO attendance (student_id, date, status, remarks, marked_by, subject_id) VALUES (?, ?, ?, ?, ?, ?)', 
        [studAlice.lastID, dt, 'present', 'On time', uFaculty1.lastID, subDS.lastID]);
      await runQuery('INSERT INTO attendance (student_id, date, status, remarks, marked_by, subject_id) VALUES (?, ?, ?, ?, ?, ?)', 
        [studAlice.lastID, dt, 'present', 'Active listener', uFaculty2.lastID, subDBMS.lastID]);
    }

    // Bob attendance (1 absent, 1 leave, 3 present) => 60% attendance (below 75% trigger!)
    await runQuery('INSERT INTO attendance (student_id, date, status, remarks, marked_by, subject_id) VALUES (?, ?, ?, ?, ?, ?)', 
      [studBob.lastID, dates[0], 'present', 'On time', uFaculty1.lastID, subDS.lastID]);
    await runQuery('INSERT INTO attendance (student_id, date, status, remarks, marked_by, subject_id) VALUES (?, ?, ?, ?, ?, ?)', 
      [studBob.lastID, dates[1], 'absent', 'Uninformed absence', uFaculty1.lastID, subDS.lastID]);
    await runQuery('INSERT INTO attendance (student_id, date, status, remarks, marked_by, subject_id) VALUES (?, ?, ?, ?, ?, ?)', 
      [studBob.lastID, dates[2], 'leave', 'Medical emergency', uFaculty1.lastID, subDS.lastID]);
    await runQuery('INSERT INTO attendance (student_id, date, status, remarks, marked_by, subject_id) VALUES (?, ?, ?, ?, ?, ?)', 
      [studBob.lastID, dates[3], 'present', 'On time', uFaculty1.lastID, subDS.lastID]);
    await runQuery('INSERT INTO attendance (student_id, date, status, remarks, marked_by, subject_id) VALUES (?, ?, ?, ?, ?, ?)', 
      [studBob.lastID, dates[4], 'present', 'Participated', uFaculty1.lastID, subDS.lastID]);

    // Leaves
    await runQuery('INSERT INTO leave_records (user_id, start_date, end_date, reason, status, remarks, action_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uStudent2.lastID, '2026-07-17', '2026-07-17', 'Fever checkup', 'approved', 'Medical certificate submitted.', uAdmin.lastID]);
    await runQuery('INSERT INTO leave_records (user_id, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?)',
      [uStudent2.lastID, '2026-07-28', '2026-07-29', 'Family event attendance', 'pending']);

    console.log('Inserting study materials & timetables...');
    // Study materials
    await runQuery('INSERT INTO study_materials (title, description, subject_id, section_id, file_path, file_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Data Structures Introduction Lecture Notes', 'Basic concepts of Arrays, Linked Lists, Stack, and Queue structures.', subDS.lastID, sBTechA.lastID, '/uploads/ds_intro.pdf', 'pdf', uFaculty1.lastID]);
    await runQuery('INSERT INTO study_materials (title, description, subject_id, section_id, file_path, file_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['DBMS Normalization Cheat Sheet', '1NF, 2NF, 3NF, BCNF structural guidelines and examples.', subDBMS.lastID, sBTechA.lastID, '/uploads/dbms_normalization.pdf', 'pdf', uFaculty2.lastID]);

    // Assignments
    const assignDS = await runQuery('INSERT INTO assignments (title, description, subject_id, section_id, due_date, max_marks) VALUES (?, ?, ?, ?, ?, ?)',
      ['Assignment 1: Linked List Implementation', 'Write a program in C to reverse a singly linked list.', subDS.lastID, sBTechA.lastID, '2026-07-30', 20]);
    
    // Bob submitted, Alice has not yet
    await runQuery('INSERT INTO assignment_submissions (assignment_id, student_id, file_path, marks_obtained, remarks, graded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [assignDS.lastID, studBob.lastID, '/uploads/submissions/bob_assign1.c', 17.5, 'Well commented but slightly late', uFaculty1.lastID]);

    // Timetables
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    for (const d of days) {
      await runQuery('INSERT INTO timetables (section_id, subject_id, faculty_id, day_of_week, start_time, end_time, room_no) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sBTechA.lastID, subDS.lastID, fSmith.lastID, d, '09:00', '10:00', 'LHC-101']);
      await runQuery('INSERT INTO timetables (section_id, subject_id, faculty_id, day_of_week, start_time, end_time, room_no) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sBTechA.lastID, subDBMS.lastID, fJones.lastID, d, '10:00', '11:00', 'LHC-101']);
      await runQuery('INSERT INTO timetables (section_id, subject_id, faculty_id, day_of_week, start_time, end_time, room_no) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sBTechA.lastID, subMath.lastID, fJones.lastID, d, '11:15', '12:15', 'LHC-101']);
    }

    console.log('Inserting exams & marks...');
    // Exams
    const examIA1 = await runQuery('INSERT INTO exams (name, type, academic_session_id, date) VALUES (?, ?, ?, ?)',
      ['Internal Assessment 1', 'internal', sessionActive.lastID, '2026-06-15']);

    // Exam Marks
    // DS
    await runQuery('INSERT INTO exam_marks (exam_id, student_id, subject_id, theory_marks, practical_marks, marked_by) VALUES (?, ?, ?, ?, ?, ?)',
      [examIA1.lastID, studAlice.lastID, subDS.lastID, 18, 0, uFaculty1.lastID]);
    await runQuery('INSERT INTO exam_marks (exam_id, student_id, subject_id, theory_marks, practical_marks, marked_by) VALUES (?, ?, ?, ?, ?, ?)',
      [examIA1.lastID, studBob.lastID, subDS.lastID, 14, 0, uFaculty1.lastID]);
    // DBMS
    await runQuery('INSERT INTO exam_marks (exam_id, student_id, subject_id, theory_marks, practical_marks, marked_by) VALUES (?, ?, ?, ?, ?, ?)',
      [examIA1.lastID, studAlice.lastID, subDBMS.lastID, 19, 0, uFaculty2.lastID]);
    await runQuery('INSERT INTO exam_marks (exam_id, student_id, subject_id, theory_marks, practical_marks, marked_by) VALUES (?, ?, ?, ?, ?, ?)',
      [examIA1.lastID, studBob.lastID, subDBMS.lastID, 11, 0, uFaculty2.lastID]);
    // Practical DS
    await runQuery('INSERT INTO exam_marks (exam_id, student_id, subject_id, theory_marks, practical_marks, marked_by) VALUES (?, ?, ?, ?, ?, ?)',
      [examIA1.lastID, studAlice.lastID, subDSL.lastID, 0, 19.5, uFaculty1.lastID]);
    await runQuery('INSERT INTO exam_marks (exam_id, student_id, subject_id, theory_marks, practical_marks, marked_by) VALUES (?, ?, ?, ?, ?, ?)',
      [examIA1.lastID, studBob.lastID, subDSL.lastID, 0, 15, uFaculty1.lastID]);

    console.log('Inserting fee structures and collection history...');
    // Fee Structures
    const feeBtechSem1 = await runQuery('INSERT INTO fee_structures (name, course_id, semester, total_amount, break_down_json) VALUES (?, ?, ?, ?, ?)',
      [
        'B.Tech CSE - Semester 1 Fees', cBTech.lastID, 1, 45000.00,
        JSON.stringify({ tuition: 30000, exam: 5000, library: 2000, development: 8000 })
      ]);

    // Alice paid fully
    await runQuery('INSERT INTO fee_collections (student_id, fee_structure_id, amount_paid, payment_date, payment_mode, transaction_id, remarks, receipt_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [studAlice.lastID, feeBtechSem1.lastID, 45000.00, '2025-07-10', 'Online', 'TXN987654321', 'Full payment for Sem 1', 'REC-2025-0001']);

    // Bob paid partially (25000 paid, 20000 pending)
    await runQuery('INSERT INTO fee_collections (student_id, fee_structure_id, amount_paid, payment_date, payment_mode, transaction_id, remarks, receipt_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [studBob.lastID, feeBtechSem1.lastID, 25000.00, '2025-07-12', 'Cash', 'TXN-CASH-002', 'Part payment - request extension for balance', 'REC-2025-0002']);

    // Scholarship for Bob (Adjusted 10000)
    await runQuery('INSERT INTO scholarships (student_id, name, amount, description, adjusted) VALUES (?, ?, ?, ?, ?)',
      [studBob.lastID, 'Merit-cum-Means Support', 10000.00, 'Eligible due to high school secondary metrics', 1]);

    console.log('Inserting library logs...');
    // Library Card
    const cardAlice = await runQuery('INSERT INTO library_cards (student_id, card_number, issued_at) VALUES (?, ?, ?)',
      [studAlice.lastID, 'LIB-101', '2025-08-01']);
    const cardBob = await runQuery('INSERT INTO library_cards (student_id, card_number, issued_at) VALUES (?, ?, ?)',
      [studBob.lastID, 'LIB-102', '2025-08-02']);

    // Library Books
    const b1 = await runQuery('INSERT INTO library_books (title, author, isbn, category, total_copies, available_copies) VALUES (?, ?, ?, ?, ?, ?)',
      ['Introduction to Algorithms', 'Thomas H. Cormen', '9780262033848', 'Computer Science', 5, 4]);
    const b2 = await runQuery('INSERT INTO library_books (title, author, isbn, category, total_copies, available_copies) VALUES (?, ?, ?, ?, ?, ?)',
      ['Database System Concepts', 'Abraham Silberschatz', '9780073523323', 'Computer Science', 3, 2]);

    // Library Issues
    // Alice issued book 1 (still active)
    await runQuery('INSERT INTO library_issues (card_id, book_id, issue_date, due_date, status) VALUES (?, ?, ?, ?, ?)',
      [cardAlice.lastID, b1.lastID, '2026-07-10', '2026-07-25', 'issued']);
    // Bob issued book 2 and returned it late with fine
    await runQuery('INSERT INTO library_issues (card_id, book_id, issue_date, due_date, return_date, status, fine_amount, fine_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [cardBob.lastID, b2.lastID, '2026-06-01', '2026-06-15', '2026-06-20', 'returned', 50.00, 1]);

    console.log('Inserting system notices...');
    // Notices
    await runQuery('INSERT INTO notices (title, content, target_roles_json) VALUES (?, ?, ?)',
      [
        'Welcome to Academic Session 2025-26!',
        'We welcome all freshers and returning students. Classes commence full swing from July 15th.',
        JSON.stringify(['student', 'faculty', 'parent'])
      ]);
    await runQuery('INSERT INTO notices (title, content, target_roles_json) VALUES (?, ?, ?)',
      [
        'Faculty Meeting: Curriculum Review',
        'A mandatory faculty review meeting is scheduled in the boardroom on Wednesday, July 23rd at 3:00 PM.',
        JSON.stringify(['faculty'])
      ]);
    await runQuery('INSERT INTO notices (title, content, target_roles_json) VALUES (?, ?, ?)',
      [
        'Fee Due Deadline Alert',
        'All semester dues must be cleared by July 31st to avoid a late clearance penalty.',
        JSON.stringify(['student', 'parent'])
      ]);

    console.log('Inserting initial audit logs...');
    // Audit logs
    await runQuery('INSERT INTO audit_logs (user_id, action, target_table, record_id, details) VALUES (?, ?, ?, ?, ?)',
      [uSuperAdmin.lastID, 'DATABASE_INIT', 'users', uSuperAdmin.lastID, 'Database tables generated and seed rosters populated.']);

    console.log('Database successfully initialized and seeded with mock records!');
  } catch (error) {
    console.error('Seeding process encountered an error:', error);
  } finally {
    db.close();
  }
}

seed();
