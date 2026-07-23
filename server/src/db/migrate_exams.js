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

async function migrateExamsTable() {
  console.log('Recreating exams table with updated constraints and fields...');

  // Backup existing exams data
  const existingExams = await allQ('SELECT * FROM exams');
  
  await runQ('PRAGMA foreign_keys=OFF');
  await runQ('DROP TABLE IF EXISTS exams');

  await runQ(`
    CREATE TABLE exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      academic_session_id INTEGER,
      date TEXT NOT NULL,
      max_marks INTEGER DEFAULT 100,
      subject_id INTEGER,
      section_id INTEGER,
      FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE SET NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
    )
  `);

  // Restore old data
  for (const e of existingExams) {
    await runQ(`
      INSERT INTO exams (id, name, type, academic_session_id, date, max_marks, subject_id, section_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [e.id, e.name, e.type, e.academic_session_id, e.date, e.max_marks || 100, e.subject_id || null, e.section_id || null]);
  }

  // Insert sample weekly and monthly tests
  const sampleTests = [
    ['Weekly Test 1 - Data Structures', 'weekly_test', 1, '2026-07-10', 20, 1, 1],
    ['Weekly Test 2 - Operating Systems', 'weekly_test', 1, '2026-07-17', 20, 2, 1],
    ['Monthly Assessment - July', 'monthly_test', 1, '2026-07-25', 50, 1, 1],
    ['Unit Test 1 - Mathematics', 'unit_test', 1, '2026-07-05', 25, 3, 1],
    ['Surprise Quiz - Web Tech', 'quiz', 1, '2026-07-12', 10, 4, 1]
  ];
  for (const t of sampleTests) {
    await runQ(`INSERT INTO exams (name, type, academic_session_id, date, max_marks, subject_id, section_id) VALUES (?, ?, ?, ?, ?, ?, ?)`, t);
  }

  await runQ('PRAGMA foreign_keys=ON');
  console.log('Exams table successfully updated and seeded!');
  db.close();
}

migrateExamsTable().catch(e => { console.error(e); db.close(); });
