import express from 'express';
import { query, queryOne, run } from '../db/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// =========================================================================
// EXPENSE CATEGORIES
// =========================================================================
router.get('/categories', authenticate, async (req, res) => {
  try {
    const cats = await query(`
      SELECT ec.*, 
        COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.category_id = ec.id AND e.status IN ('paid','approved')), 0) as total_spent,
        COALESCE((SELECT b.allocated_amount FROM budgets b WHERE b.category_id = ec.id ORDER BY b.year DESC, b.month DESC LIMIT 1), 0) as budget_allocated
      FROM expense_categories ec ORDER BY ec.name ASC
    `);
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', authenticate, authorize(['admin']), async (req, res) => {
  const { name, icon, color, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  try {
    const result = await run('INSERT INTO expense_categories (name, icon, color, description) VALUES (?, ?, ?, ?)',
      [name, icon || 'Circle', color || '#6366f1', description || '']);
    res.status(201).json({ id: result.id, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// EXPENSES CRUD
// =========================================================================
router.get('/', authenticate, async (req, res) => {
  const { category_id, status, from_date, to_date, search } = req.query;
  try {
    let sql = `
      SELECT e.*, ec.name as category_name, ec.icon as category_icon, ec.color as category_color
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) { sql += ' AND e.category_id = ?'; params.push(category_id); }
    if (status) { sql += ' AND e.status = ?'; params.push(status); }
    if (from_date) { sql += ' AND e.expense_date >= ?'; params.push(from_date); }
    if (to_date) { sql += ' AND e.expense_date <= ?'; params.push(to_date); }
    if (search) {
      sql += ' AND (e.title LIKE ? OR e.vendor_name LIKE ? OR e.receipt_no LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY e.expense_date DESC, e.id DESC';
    const expenses = await query(sql, params);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  const { category_id, title, description, amount, expense_date, payment_mode, receipt_no, vendor_name, remarks } = req.body;
  if (!title || !amount || !expense_date || !category_id) {
    return res.status(400).json({ error: 'Title, amount, date and category are required' });
  }
  try {
    const result = await run(`
      INSERT INTO expenses (category_id, title, description, amount, expense_date, payment_mode, receipt_no, vendor_name, created_by, status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `, [category_id, title, description || '', parseFloat(amount), expense_date, payment_mode || 'Cash', receipt_no || '', vendor_name || '', req.user.id, remarks || '']);
    res.status(201).json({ id: result.id, title, amount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const { status, remarks } = req.body;
  try {
    if (status) {
      await run('UPDATE expenses SET status = ?, approved_by = ?, remarks = COALESCE(?, remarks) WHERE id = ?',
        [status, req.user.id, remarks, req.params.id]);
    }
    res.json({ message: 'Expense updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    await run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// EXPENSE SUMMARY & ANALYTICS
// =========================================================================
router.get('/summary', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    const thisMonth = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date LIKE ? AND status IN ('paid','approved')`,
      [`${monthStr}%`]
    );

    const thisYear = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date LIKE ? AND status IN ('paid','approved')`,
      [`${currentYear}%`]
    );

    const pending = await queryOne(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM expenses WHERE status = 'pending'`
    );

    const totalBudget = await queryOne(
      `SELECT COALESCE(SUM(allocated_amount), 0) as total FROM budgets WHERE month = ? AND year = ?`,
      [currentMonth, currentYear]
    );

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const mStr = `${y}-${String(m).padStart(2, '0')}`;
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const row = await queryOne(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date LIKE ? AND status IN ('paid','approved')`,
        [`${mStr}%`]
      );
      monthlyTrend.push({ month: monthNames[m - 1], year: y, total: row.total });
    }

    // Category-wise breakdown
    const categoryBreakdown = await query(`
      SELECT ec.name, ec.color, COALESCE(SUM(e.amount), 0) as total
      FROM expense_categories ec
      LEFT JOIN expenses e ON e.category_id = ec.id AND e.status IN ('paid','approved')
      GROUP BY ec.id
      HAVING total > 0
      ORDER BY total DESC
    `);

    res.json({
      this_month: thisMonth.total,
      this_year: thisYear.total,
      pending_count: pending.count,
      pending_amount: pending.total,
      budget_allocated: totalBudget.total,
      budget_remaining: Math.max(0, totalBudget.total - thisMonth.total),
      monthly_trend: monthlyTrend,
      category_breakdown: categoryBreakdown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
