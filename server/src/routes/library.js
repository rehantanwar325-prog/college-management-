import express from 'express';
import { query, queryOne, run } from '../db/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// =========================================================================
// BOOKS CATALOG
// =========================================================================
router.get('/books', authenticate, async (req, res) => {
  const { search } = req.query;
  try {
    let sql = 'SELECT * FROM library_books';
    const params = [];
    if (search) {
      sql += ' WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ? OR category LIKE ?';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    sql += ' ORDER BY title ASC';
    const books = await query(sql, params);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/books', authenticate, authorize(['admin']), async (req, res) => {
  const { title, author, isbn, category, total_copies } = req.body;
  if (!title || !author) return res.status(400).json({ error: 'Title and Author are required' });

  try {
    const copies = total_copies || 1;
    const result = await run(`
      INSERT INTO library_books (title, author, isbn, category, total_copies, available_copies)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, author, isbn || '', category || 'General', copies, copies]);

    res.status(201).json({ id: result.id, title, author });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/books/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    await run('DELETE FROM library_books WHERE id = ?', [req.params.id]);
    res.json({ message: 'Book deleted from catalog' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// LIBRARY CARDS
// =========================================================================
router.get('/cards', authenticate, async (req, res) => {
  try {
    const cards = await query(`
      SELECT lc.*, s.first_name, s.last_name, s.roll_no, s.admission_no
      FROM library_cards lc
      LEFT JOIN students s ON lc.student_id = s.id
    `);
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/cards', authenticate, authorize(['admin']), async (req, res) => {
  const { student_id, card_number } = req.body;
  if (!student_id || !card_number) {
    return res.status(400).json({ error: 'Student ID and Card number are required' });
  }

  try {
    const result = await run(`
      INSERT INTO library_cards (student_id, card_number, issued_at)
      VALUES (?, ?, ?)
    `, [student_id, card_number, new Date().toISOString().split('T')[0]]);

    res.status(201).json({ id: result.id, card_number });
  } catch (error) {
    if (error.message.includes('UNIQUE')) return res.status(400).json({ error: 'Library card number or student link already exists' });
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// BOOK ISSUING & RETURN
// =========================================================================

// List current issues
router.get('/issues', authenticate, async (req, res) => {
  const { student_id, status } = req.query;
  const { id, role } = req.user;

  try {
    let sql = `
      SELECT li.*, b.title as book_title, b.author as book_author, lc.card_number,
             s.first_name, s.last_name, s.roll_no
      FROM library_issues li
      LEFT JOIN library_books b ON li.book_id = b.id
      LEFT JOIN library_cards lc ON li.card_id = lc.id
      LEFT JOIN students s ON lc.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (role === 'student') {
      const student = await queryOne('SELECT id FROM students WHERE user_id = ?', [id]);
      sql += ' AND lc.student_id = ?';
      params.push(student ? student.id : null);
    } else if (role === 'parent') {
      const parent = await queryOne('SELECT student_id FROM parents WHERE user_id = ?', [id]);
      sql += ' AND lc.student_id = ?';
      params.push(parent ? parent.student_id : null);
    } else if (student_id) {
      sql += ' AND lc.student_id = ?';
      params.push(student_id);
    }

    if (status) {
      sql += ' AND li.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY li.issue_date DESC';
    const list = await query(sql, params);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enrichedList = list.map(item => {
      const issueDate = new Date(item.issue_date);
      const dueDate = new Date(item.due_date);
      issueDate.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      const daysIssued = Math.max(1, Math.ceil((today - issueDate) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const isOverdue = item.status === 'issued' && today > dueDate;
      const daysOverdue = isOverdue ? Math.abs(daysRemaining) : 0;
      const estimatedFine = isOverdue ? daysOverdue * 10 : (item.fine_amount || 0);

      return {
        ...item,
        days_issued: daysIssued,
        days_remaining: daysRemaining,
        is_overdue: isOverdue,
        days_overdue: daysOverdue,
        estimated_fine: estimatedFine
      };
    });

    res.json(enrichedList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send Overdue Warning Alerts & Fine Warnings
router.post('/send-overdue-reminders', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueIssues = await query(`
      SELECT li.*, b.title as book_title, s.first_name, s.last_name, s.user_id as student_user_id
      FROM library_issues li
      JOIN library_books b ON li.book_id = b.id
      JOIN library_cards lc ON li.card_id = lc.id
      JOIN students s ON lc.student_id = s.id
      WHERE li.status = 'issued' AND li.due_date < ?
    `, [todayStr]);

    let sentCount = 0;
    for (const issue of overdueIssues) {
      const title = `🚨 OVERDUE BOOK ALERT: Return "${issue.book_title}"`;
      const content = `Dear ${issue.first_name} ${issue.last_name}, your library book "${issue.book_title}" was due on ${issue.due_date}. It is currently OVERDUE! Daily overdue fines (₹10/day) are accumulating. Please return the book to the library immediately.`;

      await run(`
        INSERT INTO notices (title, content, target_roles_json, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [title, content, JSON.stringify(['student', 'parent'])]);

      sentCount++;
    }

    res.json({ message: `Overdue warning notices dispatched to ${sentCount} students!`, count: sentCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Issue Book (Supports Single or Multi-Book Issuing)
router.post('/issues', authenticate, authorize(['admin']), async (req, res) => {
  const { card_number, student_id, book_id, book_ids, due_date, loan_days } = req.body;
  
  // Normalize book_ids list
  let selectedBookIds = [];
  if (Array.isArray(book_ids) && book_ids.length > 0) {
    selectedBookIds = book_ids;
  } else if (book_id) {
    selectedBookIds = [book_id];
  }

  if ((!card_number && !student_id) || selectedBookIds.length === 0) {
    return res.status(400).json({ error: 'Student and at least one Book selection are required' });
  }

  try {
    let card;
    if (card_number) {
      card = await queryOne('SELECT * FROM library_cards WHERE card_number = ?', [card_number]);
    } else if (student_id) {
      card = await queryOne('SELECT * FROM library_cards WHERE student_id = ?', [student_id]);
      if (!card) {
        // Auto create library card for student
        const student = await queryOne('SELECT * FROM students WHERE id = ?', [student_id]);
        if (!student) return res.status(404).json({ error: 'Student record not found' });
        const autoCardNum = `LIB-${student.roll_no || student.id}`;
        const cardRes = await run(`
          INSERT INTO library_cards (student_id, card_number, issued_at)
          VALUES (?, ?, ?)
        `, [student_id, autoCardNum, new Date().toISOString().split('T')[0]]);
        card = { id: cardRes.id, card_number: autoCardNum, status: 'active' };
      }
    }

    if (!card) return res.status(404).json({ error: 'Library card not registered for student' });
    if (card.status !== 'active') return res.status(400).json({ error: 'Library card has been suspended' });

    // Calculate Issue & Due Date
    const issueDate = new Date();
    const issueDateStr = issueDate.toISOString().split('T')[0];

    let dueDateStr;
    if (due_date) {
      dueDateStr = due_date;
    } else {
      const days = parseInt(loan_days, 10) || 14;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);
      dueDateStr = dueDate.toISOString().split('T')[0];
    }

    const issuedResults = [];
    for (const bId of selectedBookIds) {
      const book = await queryOne('SELECT * FROM library_books WHERE id = ?', [bId]);
      if (book && book.available_copies > 0) {
        const result = await run(`
          INSERT INTO library_issues (card_id, book_id, issue_date, due_date, status)
          VALUES (?, ?, ?, ?, 'issued')
        `, [card.id, bId, issueDateStr, dueDateStr]);

        await run('UPDATE library_books SET available_copies = available_copies - 1 WHERE id = ?', [bId]);
        issuedResults.push({ id: result.id, book_id: bId, title: book.title });
      }
    }

    if (issuedResults.length === 0) {
      return res.status(400).json({ error: 'Selected books are either unavailable or out of stock' });
    }

    res.status(201).json({
      message: `Successfully issued ${issuedResults.length} book(s)!`,
      count: issuedResults.length,
      issued_books: issuedResults,
      issue_date: issueDateStr,
      due_date: dueDateStr
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Return Book & Auto-calculate Fine
router.put('/issues/:id/return', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const issue = await queryOne('SELECT * FROM library_issues WHERE id = ?', [req.params.id]);
    if (!issue) return res.status(404).json({ error: 'Issue record not found' });
    if (issue.status === 'returned') return res.status(400).json({ error: 'Book has already been returned' });

    const returnDateStr = new Date().toISOString().split('T')[0];
    
    // Calculate Fine (Fine rate: $5 per day overdue)
    const dueDate = new Date(issue.due_date);
    const returnDate = new Date(returnDateStr);
    let fine = 0;
    
    if (returnDate > dueDate) {
      const diffTime = Math.abs(returnDate - dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fine = diffDays * 5; // $5 fine per day
    }

    // 1. Update Issue status
    await run(`
      UPDATE library_issues 
      SET return_date = ?, status = 'returned', fine_amount = ?
      WHERE id = ?
    `, [returnDateStr, fine, req.params.id]);

    // 2. Increment book copies
    await run('UPDATE library_books SET available_copies = available_copies + 1 WHERE id = ?', [issue.book_id]);

    res.json({ message: 'Book returned successfully', fine_calculated: fine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pay fine
router.put('/issues/:id/pay-fine', authenticate, authorize(['admin']), async (req, res) => {
  try {
    await run('UPDATE library_issues SET fine_paid = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Fine payment recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Library Stats for Analytics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const totalBooks = await queryOne('SELECT COUNT(*) as count, COALESCE(SUM(total_copies), 0) as copies FROM library_books');
    const categories = await query('SELECT DISTINCT category, COUNT(*) as count FROM library_books GROUP BY category ORDER BY count DESC');
    const lowStock = await query('SELECT * FROM library_books WHERE available_copies <= 1 ORDER BY available_copies ASC LIMIT 5');
    const mostIssued = await query(`
      SELECT b.title, b.author, COUNT(li.id) as issue_count 
      FROM library_issues li JOIN library_books b ON li.book_id = b.id 
      GROUP BY li.book_id ORDER BY issue_count DESC LIMIT 5
    `);
    res.json({
      total_titles: totalBooks.count,
      total_copies: totalBooks.copies,
      categories,
      low_stock: lowStock,
      most_issued: mostIssued
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
