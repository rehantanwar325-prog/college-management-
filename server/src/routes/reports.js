import express from 'express';
import XLSX from 'xlsx';
import { query, queryOne } from '../db/db.js';
import { authenticate, authorize, verifyStudentAccess } from '../middleware/auth.js';

const router = express.Router();

function createExcelBuffer(data, sheetName = 'Report') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Export Students to Excel
router.get('/export/students', authenticate, authorize(['admin']), async (req, res) => {
  const { course_id, section_id } = req.query;
  try {
    let sql = `
      SELECT s.admission_no as [Admission No], s.roll_no as [Roll No], 
             s.first_name || ' ' || s.last_name as [Full Name], s.email as [Email], 
             s.mobile as [Mobile], s.gender as [Gender], s.category as [Category], 
             s.blood_group as [Blood Group], s.father_name as [Father Name], 
             s.mother_name as [Mother Name], s.dob as [Date of Birth], 
             c.name as [Course], sec.name as [Section], s.semester as [Semester],
             s.admission_date as [Admission Date], s.status as [Status]
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE 1=1
    `;
    const params = [];
    if (course_id) {
      sql += ' AND s.course_id = ?';
      params.push(course_id);
    }
    if (section_id) {
      sql += ' AND s.section_id = ?';
      params.push(section_id);
    }

    const students = await query(sql, params);
    
    const buffer = createExcelBuffer(students, 'Students Roster');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=students_roster.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export Attendance Report to Excel
router.get('/export/attendance', authenticate, authorize(['admin', 'faculty']), async (req, res) => {
  const { section_id, start_date, end_date } = req.query;
  if (!section_id) {
    return res.status(400).json({ error: 'Section ID is required' });
  }

  try {
    const sql = `
      SELECT att.date as [Date], s.roll_no as [Roll No], 
             s.first_name || ' ' || s.last_name as [Student Name],
             sub.name as [Subject], att.status as [Status], att.remarks as [Remarks]
      FROM attendance att
      LEFT JOIN students s ON att.student_id = s.id
      LEFT JOIN subjects sub ON att.subject_id = sub.id
      WHERE s.section_id = ? AND att.date BETWEEN ? AND ?
      ORDER BY att.date DESC, s.roll_no ASC
    `;
    const logs = await query(sql, [section_id, start_date || '1970-01-01', end_date || '2099-12-31']);
    
    const buffer = createExcelBuffer(logs, 'Attendance Logs');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export Fees Collection Report to Excel
router.get('/export/fees', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const sql = `
      SELECT fc.receipt_no as [Receipt No], fc.payment_date as [Payment Date], 
             s.admission_no as [Admission No], s.first_name || ' ' || s.last_name as [Student Name],
             fs.name as [Fee Category], fc.amount_paid as [Amount Paid], 
             fc.payment_mode as [Payment Mode], fc.transaction_id as [Transaction ID], 
             fc.remarks as [Remarks]
      FROM fee_collections fc
      LEFT JOIN students s ON fc.student_id = s.id
      LEFT JOIN fee_structures fs ON fc.fee_structure_id = fs.id
      ORDER BY fc.payment_date DESC
    `;
    const payments = await query(sql);
    
    const buffer = createExcelBuffer(payments, 'Fee Collections');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=fee_collection_report.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get certificate data (Protected with Ownership Check + Real Dues Validation for Transfer Certificate)
router.get('/certificate/:student_id', authenticate, async (req, res) => {
  const { type } = req.query; // bonafide, transfer, character
  const student_id = req.params.student_id;

  try {
    const isAuthorized = await verifyStudentAccess(req.user, student_id);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to generate certificates for this student.' });
    }

    const student = await queryOne(`
      SELECT s.*, c.name as course_name, sec.name as section_name, ses.name as session_name
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN academic_sessions ses ON s.academic_session_id = ses.id
      WHERE s.id = ?
    `, [student_id]);

    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    // Validate Dues for Transfer Certificate
    if (type === 'transfer') {
      const feeStructure = await queryOne('SELECT total_amount FROM fee_structures WHERE course_id = ? AND semester = ?', [student.course_id, student.semester]);
      if (feeStructure) {
        const paidRow = await queryOne('SELECT SUM(amount_paid) as total_paid FROM fee_collections WHERE student_id = ?', [student_id]);
        const schRow = await queryOne('SELECT SUM(amount) as total_sch FROM scholarships WHERE student_id = ? AND adjusted = 1', [student_id]);
        const balance = Math.max(0, feeStructure.total_amount - (paidRow.total_paid || 0) - (schRow.total_sch || 0));
        
        if (balance > 0) {
          return res.status(400).json({ 
            error: `Cannot generate Transfer Certificate. Student has an uncleared fee dues balance of $${balance}. All dues must be cleared first.` 
          });
        }
      }
    }

    let certificateText = '';
    const name = `${student.first_name} ${student.last_name}`;

    if (type === 'bonafide') {
      certificateText = `This is to certify that Mr./Ms. ${name}, son/daughter of Mr. ${student.father_name} and Mrs. ${student.mother_name}, is a bonafide student of this college, enrolled in the course ${student.course_name} (Section: ${student.section_name}) under Admission No. ${student.admission_no}. He/She is currently in Semester ${student.semester} during the Academic Session ${student.session_name}.`;
    } else if (type === 'transfer') {
      certificateText = `This is to certify that Mr./Ms. ${name}, son/daughter of Mr. ${student.father_name}, was a student of this institution in ${student.course_name} (Roll No: ${student.roll_no}) from the date of admission ${student.admission_date}. He/She has completed his/her studies and is leaving this college. All college dues have been verified as fully cleared by the accounts office up to date. We wish him/her success in all future endeavors.`;
    } else if (type === 'character') {
      certificateText = `This is to certify that Mr./Ms. ${name}, son/daughter of Mr. ${student.father_name}, has been studying in this institution in ${student.course_name}. During his/her tenure in this college, his/her character and conduct have been found to be Exemplary and Good.`;
    } else {
      return res.status(400).json({ error: 'Invalid certificate type requested.' });
    }

    res.json({
      student,
      certificate_type: type,
      title: `${type.toUpperCase()} CERTIFICATE`,
      text: certificateText,
      issued_date: new Date().toLocaleDateString(),
      authority: 'Principal / Registrar'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
