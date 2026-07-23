import assert from 'assert';
import { query, queryOne } from '../db/db.js';
import { encrypt, decrypt } from '../utils/security.js';

async function runTests() {
  console.log('--- STARTING SERVER AND DATABASE INTEGRATION TESTS ---');

  try {
    // 1. Verify foreign keys are enabled
    const fkCheck = await queryOne('PRAGMA foreign_keys;');
    console.log('✓ Foreign keys status:', fkCheck);
    assert.strictEqual(fkCheck.foreign_keys, 1, 'Foreign keys should be enabled (status 1)');

    // 2. Assert core tables exist and have records
    const usersCount = await queryOne('SELECT COUNT(*) as count FROM users');
    console.log('✓ Users seeded:', usersCount.count);
    assert.ok(usersCount.count >= 8, 'Should have at least 8 users seeded');

    const studentsCount = await queryOne('SELECT COUNT(*) as count FROM students');
    console.log('✓ Students seeded:', studentsCount.count);
    assert.ok(studentsCount.count >= 2, 'Should have at least 2 students seeded');

    const coursesCount = await queryOne('SELECT COUNT(*) as count FROM courses');
    console.log('✓ Courses seeded:', coursesCount.count);
    assert.ok(coursesCount.count >= 2, 'Should have at least 2 courses seeded');

    const subjectsCount = await queryOne('SELECT COUNT(*) as count FROM subjects');
    console.log('✓ Subjects seeded:', subjectsCount.count);
    assert.ok(subjectsCount.count >= 4, 'Should have at least 4 subjects seeded');

    // 3. Test Aadhaar encryption & decryption integrity
    const testAadhaar = '123456789012';
    const encrypted = encrypt(testAadhaar);
    console.log('✓ Aadhaar Encryption text:', encrypted);
    assert.notStrictEqual(encrypted, testAadhaar, 'Encrypted Aadhaar should not match plain text');

    const decrypted = decrypt(encrypted);
    console.log('✓ Aadhaar Decryption text:', decrypted);
    assert.strictEqual(decrypted, testAadhaar, 'Decrypted text must match the original plain text');

    // 4. Test Student-Course-Section Relational Join
    const studentJoin = await queryOne(`
      SELECT s.first_name, s.last_name, c.code as course_code, sec.name as section_name
      FROM students s
      JOIN courses c ON s.course_id = c.id
      JOIN sections sec ON s.section_id = sec.id
      WHERE s.admission_no = ?
    `, ['ADM-2025-001']);
    console.log('✓ Joined Student profile:', studentJoin);
    assert.ok(studentJoin, 'Should fetch student details by joining tables');
    assert.strictEqual(studentJoin.course_code, 'BTECH-CSE', 'Alice should be enrolled in BTech CSE');

    // 5. Test Attendance Warning Ratios (Bob below 75%)
    const attendanceStats = await queryOne(`
      SELECT 
        COUNT(*) as total, 
        SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present
      FROM attendance
      WHERE student_id = (SELECT id FROM students WHERE first_name = 'Bob')
    `);
    const attendancePercent = Math.round((attendanceStats.present / attendanceStats.total) * 100);
    console.log('✓ Bob Attendance Percentage:', attendancePercent + '%');
    assert.ok(attendancePercent < 75, 'Bob should have low attendance (below 75%) due to mock absences');

    console.log('--- ALL INTEGRATION AND RELATIONAL TESTS PASSED SUCCESSFULY! ---');
    process.exit(0);
  } catch (error) {
    console.error('✗ Test suite encountered a failure:', error);
    process.exit(1);
  }
}

runTests();
