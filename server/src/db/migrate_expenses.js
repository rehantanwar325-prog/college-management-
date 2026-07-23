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

async function migrate() {
  console.log('Starting migration...');

  // 1. Expense Categories Table
  await runQ(`CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    description TEXT
  )`);
  console.log('Created expense_categories table');

  // 2. Expenses Table
  await runQ(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    expense_date TEXT NOT NULL,
    payment_mode TEXT DEFAULT 'Cash',
    receipt_no TEXT,
    vendor_name TEXT,
    approved_by INTEGER,
    created_by INTEGER,
    status TEXT DEFAULT 'pending',
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);
  console.log('Created expenses table');

  // 3. Budgets Table
  await runQ(`CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    month INTEGER,
    year INTEGER,
    allocated_amount REAL NOT NULL,
    spent_amount REAL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id)
  )`);
  console.log('Created budgets table');

  // 4. Seed Expense Categories
  const existingCats = await allQ('SELECT COUNT(*) as c FROM expense_categories');
  if (existingCats[0].c === 0) {
    const categories = [
      ['Faculty & Staff Salary', 'Users', '#6366f1', 'Monthly salaries and allowances for teaching and non-teaching staff'],
      ['Infrastructure & Construction', 'Building2', '#f59e0b', 'Building maintenance, renovation, new construction'],
      ['Lab Equipment & Computers', 'Monitor', '#10b981', 'Computer labs, science labs, equipment purchase and repair'],
      ['Library Books & Resources', 'BookOpen', '#8b5cf6', 'New book purchases, journal subscriptions, digital resources'],
      ['Stationery & Office Supplies', 'FileText', '#ec4899', 'Paper, pens, registers, printing materials, office items'],
      ['Electricity & Water Bills', 'Zap', '#f97316', 'Monthly electricity, water, and gas utility bills'],
      ['Internet & Telecom', 'Wifi', '#06b6d4', 'Internet connection, phone bills, networking equipment'],
      ['Transport & Vehicle Maintenance', 'Bus', '#84cc16', 'College buses, fuel, driver salary, vehicle servicing'],
      ['Events & Functions', 'PartyPopper', '#a855f7', 'Annual day, farewell, cultural events, guest lectures'],
      ['Sports & Extracurricular', 'Trophy', '#ef4444', 'Sports equipment, competitions, gym, playground maintenance'],
      ['Hostel & Canteen', 'Home', '#14b8a6', 'Hostel maintenance, mess supplies, cook salary, furniture'],
      ['Security & Housekeeping', 'Shield', '#64748b', 'Security guards salary, CCTV, cleaning staff, supplies'],
      ['Marketing & Advertisements', 'Megaphone', '#e11d48', 'Newspaper ads, brochures, website, social media campaigns'],
      ['Miscellaneous', 'MoreHorizontal', '#71717a', 'Other uncategorized expenses and emergency spending']
    ];
    for (const c of categories) {
      await runQ('INSERT INTO expense_categories (name, icon, color, description) VALUES (?, ?, ?, ?)', c);
    }
    console.log('Seeded 14 expense categories');
  }

  // 5. Seed some sample expenses
  const existingExp = await allQ('SELECT COUNT(*) as c FROM expenses');
  if (existingExp[0].c === 0) {
    const sampleExpenses = [
      [1, 'July Faculty Salary Disbursement', 'Monthly salary for 12 faculty members', 480000, '2026-07-01', 'Bank Transfer', 'SAL-JUL-2026', '', 1, 1, 'paid'],
      [1, 'Staff Salary - Non-Teaching', 'Peons, watchmen, clerks salary', 95000, '2026-07-01', 'Bank Transfer', 'SAL-NT-JUL', '', 1, 1, 'paid'],
      [6, 'June Electricity Bill', 'Campus electricity bill for June 2026', 42500, '2026-07-05', 'Bank Transfer', 'ELEC-JUN-2026', 'State Electricity Board', 1, 1, 'paid'],
      [6, 'Water Supply Bill Q2', 'Quarterly water supply charges', 8500, '2026-07-03', 'Cheque', 'WAT-Q2-2026', 'Municipal Corporation', 1, 1, 'paid'],
      [3, 'Computer Lab Upgrade - 10 PCs', 'New desktop computers for Lab-3', 325000, '2026-06-20', 'Bank Transfer', 'LAB-PC-2026', 'Dell Technologies India', 1, 1, 'approved'],
      [5, 'Stationery Purchase - July', 'A4 paper, markers, registers, files', 12800, '2026-07-10', 'Cash', 'STN-JUL-2026', 'Jain Stationery Mart', 1, 1, 'paid'],
      [9, 'Annual Day Function', 'Stage setup, decorations, catering, sound', 65000, '2026-07-15', 'UPI', 'EVT-AD-2026', 'Star Events Co.', null, 1, 'pending'],
      [7, 'Internet Annual Plan Renewal', 'Fiber 100Mbps campus-wide plan', 36000, '2026-07-01', 'Bank Transfer', 'NET-2026', 'Airtel Business', 1, 1, 'paid'],
      [10, 'Cricket Kit Purchase', 'Bats, balls, pads, stumps for inter-college', 15400, '2026-06-25', 'Cash', 'SPT-CRK-2026', 'Sports World Store', 1, 1, 'paid'],
      [2, 'Classroom Whiteboard Replacement', 'Replaced 8 old blackboards with whiteboards', 28000, '2026-07-08', 'UPI', 'INF-WB-2026', 'Office Express', null, 1, 'pending'],
      [4, 'New Library Books - CS Dept', '25 new reference books for Computer Science', 18500, '2026-07-12', 'Cheque', 'LIB-CS-2026', 'Rajkamal Publishers', 1, 1, 'approved'],
      [8, 'College Bus Servicing', 'Engine oil change, brake check, tire rotation', 22000, '2026-07-06', 'Cash', 'TRN-SRV-2026', 'Maruti Authorized Service', 1, 1, 'paid'],
    ];
    for (const e of sampleExpenses) {
      await runQ(`INSERT INTO expenses (category_id, title, description, amount, expense_date, payment_mode, receipt_no, vendor_name, approved_by, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, e);
    }
    console.log('Seeded 12 sample expenses');
  }

  // 6. Seed monthly budgets for current year
  const existingBudgets = await allQ('SELECT COUNT(*) as c FROM budgets');
  if (existingBudgets[0].c === 0) {
    const monthlyBudgets = [
      [1, 7, 2026, 600000], // Salary
      [2, 7, 2026, 100000], // Infrastructure
      [3, 7, 2026, 50000],  // Lab
      [4, 7, 2026, 25000],  // Library
      [5, 7, 2026, 15000],  // Stationery
      [6, 7, 2026, 60000],  // Bills
      [7, 7, 2026, 40000],  // Internet
      [8, 7, 2026, 30000],  // Transport
      [9, 7, 2026, 75000],  // Events
      [10, 7, 2026, 20000], // Sports
      [11, 7, 2026, 50000], // Hostel
      [12, 7, 2026, 35000], // Security
      [13, 7, 2026, 20000], // Marketing
      [14, 7, 2026, 10000], // Misc
    ];
    for (const b of monthlyBudgets) {
      await runQ('INSERT INTO budgets (category_id, month, year, allocated_amount) VALUES (?, ?, ?, ?)', b);
    }
    console.log('Seeded monthly budgets');
  }

  console.log('\nMigration complete!');
  db.close();
}

migrate().catch(e => { console.error(e); db.close(); });
