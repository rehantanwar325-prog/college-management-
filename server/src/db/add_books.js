import sqlite3Pkg from 'sqlite3';
const sqlite3 = sqlite3Pkg.verbose();
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

const books = [
  ['Data Structures and Algorithms in Java', 'Robert Lafore', '9780672324536', 'Computer Science', 4, 4],
  ['Operating System Concepts', 'Abraham Silberschatz', '9781118063330', 'Computer Science', 5, 5],
  ['Computer Networks', 'Andrew S. Tanenbaum', '9780132126953', 'Computer Science', 3, 3],
  ['Artificial Intelligence: A Modern Approach', 'Stuart Russell & Peter Norvig', '9780134610993', 'Artificial Intelligence', 4, 4],
  ['Clean Code: A Handbook of Agile Software', 'Robert C. Martin', '9780132350884', 'Software Engineering', 3, 3],
  ['Design Patterns: Elements of Reusable Software', 'Erich Gamma & Richard Helm', '9780201633610', 'Software Engineering', 3, 3],
  ['The C Programming Language', 'Brian W. Kernighan & Dennis Ritchie', '9780131103627', 'Programming', 6, 6],
  ['Python Crash Course', 'Eric Matthes', '9781593279288', 'Programming', 5, 5],
  ['Discrete Mathematics and Its Applications', 'Kenneth H. Rosen', '9780073383095', 'Mathematics', 4, 4],
  ['Engineering Mathematics', 'B.S. Grewal', '9788174091154', 'Mathematics', 6, 6],
  ['Digital Logic and Computer Design', 'M. Morris Mano', '9780132145107', 'Electronics', 4, 4],
  ['Compiler Design: Principles & Tools', 'Alfred V. Aho & Jeffrey Ullman', '9780321486813', 'Computer Science', 3, 3],
  ['Machine Learning', 'Tom M. Mitchell', '9780070428072', 'Artificial Intelligence', 3, 3],
  ['Web Development with Node and Express', 'Ethan Brown', '9781492053514', 'Web Development', 4, 4],
  ['Learning React', 'Alex Banks & Eve Porcello', '9781492051725', 'Web Development', 4, 4],
  ['Head First Java', 'Kathy Sierra & Bert Bates', '9780596009205', 'Programming', 5, 5],
  ['Database Management Systems', 'Raghu Ramakrishnan', '9780072465631', 'Computer Science', 3, 3],
  ['Computer Organization and Architecture', 'William Stallings', '9780134101613', 'Computer Science', 4, 4],
];

let count = 0;
for (const b of books) {
  db.run(
    `INSERT OR IGNORE INTO library_books (title, author, isbn, category, total_copies, available_copies) VALUES (?, ?, ?, ?, ?, ?)`,
    b,
    function(err) {
      if (err) console.error('Error:', err.message);
      else { count++; console.log(`Added: ${b[0]}`); }
      if (count + 1 >= books.length || b === books[books.length - 1]) {
        setTimeout(() => {
          db.all('SELECT COUNT(*) as total FROM library_books', (err, rows) => {
            console.log(`\nTotal books in library: ${rows[0].total}`);
            db.close();
          });
        }, 500);
      }
    }
  );
}
