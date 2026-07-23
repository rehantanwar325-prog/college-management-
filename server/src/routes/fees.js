import express from 'express';
import { query, queryOne, run } from '../db/db.js';
import { authenticate, authorize, verifyStudentAccess } from '../middleware/auth.js';

const router = express.Router();

// Fee structures list
router.get('/structures', authenticate, async (req, res) => {
  try {
    const structures = await query(`
      SELECT fs.*, c.name as course_name, c.code as course_code 
      FROM fee_structures fs
      LEFT JOIN courses c ON fs.course_id = c.id
      ORDER BY c.name ASC, fs.semester ASC
    `);
    res.json(structures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/structures', authenticate, authorize(['admin']), async (req, res) => {
  const { name, course_id, semester, total_amount, break_down } = req.body;
  if (!name || !course_id || !semester || !total_amount) {
    return res.status(400).json({ error: 'Name, course, semester and total amount are required' });
  }

  try {
    const result = await run(`
      INSERT INTO fee_structures (name, course_id, semester, total_amount, break_down_json)
      VALUES (?, ?, ?, ?, ?)
    `, [name, course_id, semester, total_amount, break_down ? JSON.stringify(break_down) : '{}']);

    res.status(201).json({ id: result.id, name, total_amount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record Payment by Admin with Strict Dues Limit Validation
router.post('/payments', authenticate, authorize(['admin']), async (req, res) => {
  const { student_id, fee_structure_id, amount_paid, payment_mode, transaction_id, remarks } = req.body;
  if (!student_id || !fee_structure_id || !amount_paid || !payment_mode) {
    return res.status(400).json({ error: 'Student ID, Fee Structure ID, Amount and Payment Mode are required' });
  }

  try {
    const numAmount = parseFloat(amount_paid);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be a positive number' });
    }

    const feeStructure = await queryOne('SELECT total_amount FROM fee_structures WHERE id = ?', [fee_structure_id]);
    if (!feeStructure) return res.status(404).json({ error: 'Fee structure template not found' });

    const paidRow = await queryOne('SELECT SUM(amount_paid) as total_paid FROM fee_collections WHERE student_id = ? AND fee_structure_id = ?', [student_id, fee_structure_id]);
    const currentPaid = paidRow.total_paid || 0;

    const scholarshipRow = await queryOne('SELECT SUM(amount) as total_sch FROM scholarships WHERE student_id = ? AND adjusted = 1', [student_id]);
    const totalScholarship = scholarshipRow.total_sch || 0;

    const remainingDues = Math.max(0, feeStructure.total_amount - currentPaid - totalScholarship);

    if (remainingDues === 0) {
      return res.status(400).json({ error: `Cannot collect fee. All dues ($${feeStructure.total_amount}) for this student are already fully paid!` });
    }

    if (numAmount > remainingDues) {
      return res.status(400).json({ error: `Payment amount ($${numAmount}) exceeds remaining balance dues ($${remainingDues}). Maximum payable is $${remainingDues}.` });
    }

    const countRow = await queryOne('SELECT COUNT(*) as count FROM fee_collections');
    const nextNum = 10001 + countRow.count;
    const receipt_no = `REC-${new Date().getFullYear()}-${nextNum}`;

    const result = await run(`
      INSERT INTO fee_collections (student_id, fee_structure_id, amount_paid, payment_date, payment_mode, transaction_id, remarks, receipt_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      student_id, fee_structure_id, numAmount, 
      new Date().toISOString().split('T')[0], 
      payment_mode, transaction_id || '', remarks || '', receipt_no
    ]);

    await run('INSERT INTO audit_logs (user_id, action, target_table, record_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'COLLECT_FEE', 'fee_collections', result.id, `Collected fee amount $${numAmount} from student ID ${student_id}`]);

    res.status(201).json({ id: result.id, receipt_no, amount_paid: numAmount, remaining_dues: remainingDues - numAmount, message: 'Fee payment recorded successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Online Payment Gateway endpoint with Dues Validation
router.post('/pay-online', authenticate, async (req, res) => {
  const { student_id, amount_paid, payment_mode, card_number } = req.body;
  if (!student_id || !amount_paid) {
    return res.status(400).json({ error: 'Student ID and amount paid are required' });
  }

  try {
    const numAmount = parseFloat(amount_paid);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be a positive number' });
    }

    const isAuthorized = await verifyStudentAccess(req.user, student_id);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to pay fees for this student.' });
    }

    const student = await queryOne('SELECT course_id, semester FROM students WHERE id = ?', [student_id]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const feeStructure = await queryOne('SELECT id, total_amount FROM fee_structures WHERE course_id = ? AND semester = ?', [student.course_id, student.semester]);
    if (!feeStructure) return res.status(400).json({ error: 'No fee structure found for current semester' });

    const paidRow = await queryOne('SELECT SUM(amount_paid) as total_paid FROM fee_collections WHERE student_id = ? AND fee_structure_id = ?', [student_id, feeStructure.id]);
    const currentPaid = paidRow.total_paid || 0;

    const scholarshipRow = await queryOne('SELECT SUM(amount) as total_sch FROM scholarships WHERE student_id = ? AND adjusted = 1', [student_id]);
    const totalScholarship = scholarshipRow.total_sch || 0;

    const remainingDues = Math.max(0, feeStructure.total_amount - currentPaid - totalScholarship);

    if (remainingDues === 0) {
      return res.status(400).json({ error: 'All fee dues for this student are already fully cleared!' });
    }

    if (numAmount > remainingDues) {
      return res.status(400).json({ error: `Payment amount ($${numAmount}) exceeds remaining balance dues ($${remainingDues}).` });
    }

    const countRow = await queryOne('SELECT COUNT(*) as count FROM fee_collections');
    const nextNum = 10001 + countRow.count;
    const receipt_no = `REC-${new Date().getFullYear()}-${nextNum}`;
    const txnId = `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await run(`
      INSERT INTO fee_collections (student_id, fee_structure_id, amount_paid, payment_date, payment_mode, transaction_id, remarks, receipt_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      student_id, feeStructure.id, numAmount,
      new Date().toISOString().split('T')[0],
      payment_mode || 'Online Gateway',
      txnId,
      `Online payment via card ending in ${card_number ? card_number.slice(-4) : 'XXXX'}`,
      receipt_no
    ]);

    await run('INSERT INTO audit_logs (user_id, action, target_table, record_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'ONLINE_PAYMENT', 'fee_collections', result.id, `Online fee payment of $${numAmount} completed for student ${student_id}`]);

    res.status(201).json({
      message: 'Payment processed successfully!',
      receipt_no,
      transaction_id: txnId,
      amount_paid: numAmount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payments history
router.get('/payments', authenticate, async (req, res) => {
  const { student_id } = req.query;
  const { id, role } = req.user;

  try {
    let sql = `
      SELECT fc.*, s.first_name, s.last_name, s.roll_no, s.admission_no, fs.name as fee_name, fs.total_amount as structure_total
      FROM fee_collections fc
      LEFT JOIN students s ON fc.student_id = s.id
      LEFT JOIN fee_structures fs ON fc.fee_structure_id = fs.id
      WHERE 1=1
    `;
    const params = [];

    if (role === 'student') {
      const student = await queryOne('SELECT id FROM students WHERE user_id = ?', [id]);
      sql += ' AND fc.student_id = ?';
      params.push(student ? student.id : null);
    } else if (role === 'parent') {
      const parent = await queryOne('SELECT student_id FROM parents WHERE user_id = ?', [id]);
      sql += ' AND fc.student_id = ?';
      params.push(parent ? parent.student_id : null);
    } else if (student_id) {
      sql += ' AND fc.student_id = ?';
      params.push(student_id);
    }

    sql += ' ORDER BY fc.payment_date DESC';
    const payments = await query(sql, params);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Single receipt
router.get('/receipt/:receipt_no', authenticate, async (req, res) => {
  try {
    const receipt = await queryOne(`
      SELECT fc.*, 
             s.first_name, s.last_name, s.roll_no, s.admission_no, s.semester as student_semester,
             c.name as course_name, sec.name as section_name,
             fs.name as fee_name, fs.total_amount as structure_total, fs.break_down_json
      FROM fee_collections fc
      LEFT JOIN students s ON fc.student_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN fee_structures fs ON fc.fee_structure_id = fs.id
      WHERE fc.receipt_no = ?
    `, [req.params.receipt_no]);

    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

    const isAuthorized = await verifyStudentAccess(req.user, receipt.student_id);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to access this receipt.' });
    }

    res.json(receipt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dues balance
router.get('/dues/:student_id', authenticate, async (req, res) => {
  const student_id = req.params.student_id;
  try {
    const isAuthorized = await verifyStudentAccess(req.user, student_id);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view these fee dues.' });
    }

    const student = await queryOne('SELECT course_id, semester FROM students WHERE id = ?', [student_id]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const feeStructure = await queryOne('SELECT * FROM fee_structures WHERE course_id = ? AND semester = ?', [student.course_id, student.semester]);
    if (!feeStructure) {
      return res.json({ total_fee: 0, paid: 0, scholarship: 0, balance: 0, message: 'No fee structure assigned for current semester.' });
    }

    const paidRow = await queryOne('SELECT SUM(amount_paid) as total_paid FROM fee_collections WHERE student_id = ? AND fee_structure_id = ?', [student_id, feeStructure.id]);
    const totalPaid = paidRow.total_paid || 0;

    const scholarshipRow = await queryOne('SELECT SUM(amount) as total_sch FROM scholarships WHERE student_id = ? AND adjusted = 1', [student_id]);
    const totalScholarship = scholarshipRow.total_sch || 0;

    const totalFee = feeStructure.total_amount;
    const balance = Math.max(0, totalFee - totalPaid - totalScholarship);

    res.json({
      fee_structure: feeStructure,
      total_fee: totalFee,
      paid: totalPaid,
      scholarship: totalScholarship,
      balance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scholarships
router.get('/scholarships', authenticate, async (req, res) => {
  const { student_id } = req.query;
  try {
    if (student_id) {
      const isAuthorized = await verifyStudentAccess(req.user, student_id);
      if (!isAuthorized) return res.status(403).json({ error: 'Forbidden' });
    }

    let sql = `
      SELECT sch.*, s.first_name, s.last_name, s.roll_no, s.admission_no 
      FROM scholarships sch
      LEFT JOIN students s ON sch.student_id = s.id
    `;
    const params = [];
    if (student_id) {
      sql += ' WHERE sch.student_id = ?';
      params.push(student_id);
    }
    const list = await query(sql, params);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/scholarships', authenticate, authorize(['admin']), async (req, res) => {
  const { student_id, name, amount, description, adjusted } = req.body;
  if (!student_id || !name || !amount) {
    return res.status(400).json({ error: 'Student, Name and Amount are required' });
  }

  try {
    const result = await run(`
      INSERT INTO scholarships (student_id, name, amount, description, adjusted)
      VALUES (?, ?, ?, ?, ?)
    `, [student_id, name, amount, description || '', adjusted ? 1 : 0]);

    res.status(201).json({ id: result.id, name, amount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fee Summary Analytics for Admin Dashboard
router.get('/summary', authenticate, async (req, res) => {
  try {
    const totalCollected = await queryOne('SELECT COALESCE(SUM(amount_paid), 0) as total FROM fee_collections');
    const totalDues = await queryOne('SELECT COALESCE(SUM(total_amount), 0) as total FROM fee_structures');
    const totalScholarships = await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM scholarships WHERE adjusted = 1');
    
    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthCollection = await queryOne(
      `SELECT COALESCE(SUM(amount_paid), 0) as total FROM fee_collections WHERE payment_date LIKE ?`, [`${thisMonth}%`]
    );

    const studentsWithDues = await queryOne(`
      SELECT COUNT(DISTINCT s.id) as count FROM students s
      LEFT JOIN fee_structures fs ON fs.course_id = s.course_id AND fs.semester = s.semester
      LEFT JOIN (SELECT student_id, fee_structure_id, SUM(amount_paid) as paid FROM fee_collections GROUP BY student_id, fee_structure_id) fc ON fc.student_id = s.id AND fc.fee_structure_id = fs.id
      LEFT JOIN (SELECT student_id, SUM(amount) as sch FROM scholarships WHERE adjusted = 1 GROUP BY student_id) sc ON sc.student_id = s.id
      WHERE s.status = 'active' AND fs.id IS NOT NULL AND (COALESCE(fc.paid, 0) + COALESCE(sc.sch, 0)) < fs.total_amount
    `);

    const paymentModes = await query(`
      SELECT payment_mode, COUNT(*) as count, SUM(amount_paid) as total 
      FROM fee_collections GROUP BY payment_mode ORDER BY total DESC
    `);

    // Monthly trend
    const monthlyTrend = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const row = await queryOne(
        `SELECT COALESCE(SUM(amount_paid), 0) as total FROM fee_collections WHERE payment_date LIKE ?`, [`${mStr}%`]
      );
      monthlyTrend.push({ month: monthNames[d.getMonth()], total: row.total });
    }

    const outstanding = Math.max(0, totalDues.total - totalCollected.total - totalScholarships.total);
    const collectionRate = totalDues.total > 0 ? Math.round((totalCollected.total / totalDues.total) * 100) : 100;

    res.json({
      total_collected: totalCollected.total,
      outstanding_dues: outstanding,
      total_scholarships: totalScholarships.total,
      this_month_collection: thisMonthCollection.total,
      students_with_dues: studentsWithDues.count,
      collection_rate: collectionRate,
      payment_modes: paymentModes,
      monthly_trend: monthlyTrend
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
