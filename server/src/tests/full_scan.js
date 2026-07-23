const BASE = 'http://localhost:5000/api';

async function req(endpoint, options = {}) {
  const res = await fetch(`${BASE}${endpoint}`, options);
  const data = await res.json();
  return { status: res.status, data };
}

async function authReq(endpoint, token, options = {}) {
  return req(endpoint, {
    ...options,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers }
  });
}

async function runTests() {
  const results = [];
  const fail = (name, msg) => { results.push(`❌ ${name}: ${msg}`); };
  const pass = (name) => { results.push(`✅ ${name}`); };

  // 1. LOGIN TESTS
  console.log('\n=== LOGIN TESTS ===');
  
  // Admin login
  let adminToken;
  try {
    const r = await req('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@college.com', password: 'admin123' }) });
    if (r.status === 200 && r.data.token) { adminToken = r.data.token; pass('Admin Login'); } else fail('Admin Login', JSON.stringify(r.data));
  } catch (e) { fail('Admin Login', e.message); }

  // Faculty login
  let facToken;
  try {
    const r = await req('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'smith@college.com', password: 'password123' }) });
    if (r.status === 200 && r.data.token) { facToken = r.data.token; pass('Faculty Login'); } else fail('Faculty Login', JSON.stringify(r.data));
  } catch (e) { fail('Faculty Login', e.message); }

  // Student login
  let stuToken, stuUser;
  try {
    const r = await req('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'alice@college.com', password: 'student123' }) });
    if (r.status === 200 && r.data.token) { stuToken = r.data.token; stuUser = r.data.user; pass('Student Login'); } else fail('Student Login', JSON.stringify(r.data));
  } catch (e) { fail('Student Login', e.message); }

  // Parent login
  let parToken, parUser;
  try {
    const r = await req('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'richard@college.com', password: 'parent123' }) });
    if (r.status === 200 && r.data.token) { parToken = r.data.token; parUser = r.data.user; pass('Parent Login'); } else fail('Parent Login', JSON.stringify(r.data));
  } catch (e) { fail('Parent Login', e.message); }

  // 2. AUTH PROFILE ENDPOINT
  console.log('\n=== AUTH PROFILE TESTS ===');
  try {
    const r = await authReq('/auth/profile', adminToken);
    if (r.status === 200) pass('Admin /auth/profile'); else fail('Admin /auth/profile', `status=${r.status} ${JSON.stringify(r.data)}`);
  } catch (e) { fail('Admin /auth/profile', e.message); }

  try {
    const r = await authReq('/auth/profile', stuToken);
    if (r.status === 200 && (r.data.student_id || r.data.id)) pass('Student /auth/profile'); else fail('Student /auth/profile', `status=${r.status} ${JSON.stringify(r.data)}`);
  } catch (e) { fail('Student /auth/profile', e.message); }

  try {
    const r = await authReq('/auth/profile', parToken);
    if (r.status === 200 && (r.data.student_id || r.data.parent_id || r.data.id)) pass('Parent /auth/profile'); else fail('Parent /auth/profile', `status=${r.status} ${JSON.stringify(r.data)}`);
  } catch (e) { fail('Parent /auth/profile', e.message); }

  try {
    const r = await authReq('/auth/profile', facToken);
    if (r.status === 200 && (r.data.faculty_id || r.data.id)) pass('Faculty /auth/profile'); else fail('Faculty /auth/profile', `status=${r.status} ${JSON.stringify(r.data)}`);
  } catch (e) { fail('Faculty /auth/profile', e.message); }

  // 3. ADMIN DASHBOARD
  console.log('\n=== ADMIN DASHBOARD ===');
  try {
    const r = await authReq('/admin/dashboard', adminToken);
    if (r.status === 200 && r.data.metrics) pass('Admin Dashboard Metrics'); else fail('Admin Dashboard Metrics', JSON.stringify(r.data));
  } catch (e) { fail('Admin Dashboard Metrics', e.message); }

  // 4. ACADEMICS
  console.log('\n=== ACADEMICS ===');
  try { const r = await authReq('/academics/departments', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Departments (${r.data.length})`); else fail('Departments', JSON.stringify(r.data)); } catch (e) { fail('Departments', e.message); }
  try { const r = await authReq('/academics/courses', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Courses (${r.data.length})`); else fail('Courses', JSON.stringify(r.data)); } catch (e) { fail('Courses', e.message); }
  try { const r = await authReq('/academics/sections', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Sections (${r.data.length})`); else fail('Sections', JSON.stringify(r.data)); } catch (e) { fail('Sections', e.message); }
  try { const r = await authReq('/academics/subjects', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Subjects (${r.data.length})`); else fail('Subjects', JSON.stringify(r.data)); } catch (e) { fail('Subjects', e.message); }
  try { const r = await authReq('/academics/allocations', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Allocations (${r.data.length})`); else fail('Allocations', JSON.stringify(r.data)); } catch (e) { fail('Allocations', e.message); }
  try { const r = await authReq('/academics/timetable?section_id=1', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Timetable (${r.data.length})`); else fail('Timetable', JSON.stringify(r.data)); } catch (e) { fail('Timetable', e.message); }

  // 5. STUDENTS
  console.log('\n=== STUDENTS ===');
  try { const r = await authReq('/students', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Student List (${r.data.length})`); else fail('Student List', JSON.stringify(r.data)); } catch (e) { fail('Student List', e.message); }
  try { const r = await authReq('/students/1', adminToken); if (r.status === 200 && r.data.first_name) pass(`Student #1 Details: ${r.data.first_name}`); else fail('Student #1 Details', JSON.stringify(r.data)); } catch (e) { fail('Student #1 Details', e.message); }
  try { const r = await authReq('/students/faculty/list', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Faculty List (${r.data.length})`); else fail('Faculty List', JSON.stringify(r.data)); } catch (e) { fail('Faculty List', e.message); }
  try { const r = await authReq('/students/parents/list', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Parents List (${r.data.length})`); else fail('Parents List', JSON.stringify(r.data)); } catch (e) { fail('Parents List', e.message); }

  // Student accessing own profile
  try { 
    const sid = stuUser?.student_id || 1;
    const r = await authReq(`/students/${sid}`, stuToken); 
    if (r.status === 200 && r.data.first_name) pass('Student Self-Access'); else fail('Student Self-Access', `status=${r.status} ${JSON.stringify(r.data)}`); 
  } catch (e) { fail('Student Self-Access', e.message); }

  // Parent accessing child profile
  try { 
    const sid = parUser?.student_id || parUser?.student_db_id || 1;
    const r = await authReq(`/students/${sid}`, parToken);
    if (r.status === 200 && r.data.first_name) pass('Parent Accessing Child Profile'); else fail('Parent Accessing Child Profile', `status=${r.status} ${JSON.stringify(r.data)}`);
  } catch (e) { fail('Parent Accessing Child Profile', e.message); }

  // 6. ATTENDANCE
  console.log('\n=== ATTENDANCE ===');
  try { const r = await authReq('/attendance/logs?section_id=1', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Attendance Logs (${r.data.length})`); else fail('Attendance Logs', JSON.stringify(r.data)); } catch (e) { fail('Attendance Logs', e.message); }
  try { const r = await authReq('/attendance/logs?student_id=1', adminToken); if (r.status === 200 && Array.isArray(r.data)) { const allMatch = r.data.every(l => l.student_id === 1); if (allMatch) pass(`Student-filtered Attendance (${r.data.length})`); else fail('Student-filtered Attendance', 'Contains other student records!'); } else fail('Student-filtered Attendance', JSON.stringify(r.data)); } catch (e) { fail('Student-filtered Attendance', e.message); }
  try { const r = await authReq('/attendance/report?section_id=1', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Attendance Report (${r.data.length} students)`); else fail('Attendance Report', JSON.stringify(r.data)); } catch (e) { fail('Attendance Report', e.message); }
  try { const r = await authReq('/attendance/leaves', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Leave Records (${r.data.length})`); else fail('Leave Records', JSON.stringify(r.data)); } catch (e) { fail('Leave Records', e.message); }

  // Faculty marking attendance
  try {
    const r = await authReq('/attendance/mark', facToken, { method: 'POST', body: JSON.stringify({ date: '2026-07-22', section_id: 1, subject_id: 1, records: [{ student_id: 1, status: 'present', remarks: 'Test' }] }) });
    if (r.status === 200) pass('Faculty Mark Attendance'); else fail('Faculty Mark Attendance', `status=${r.status} ${JSON.stringify(r.data)}`);
  } catch (e) { fail('Faculty Mark Attendance', e.message); }

  // Student applying leave
  try {
    const r = await authReq('/attendance/leaves', stuToken, { method: 'POST', body: JSON.stringify({ start_date: '2026-08-01', end_date: '2026-08-02', reason: 'Test leave' }) });
    if (r.status === 201) pass('Student Apply Leave'); else fail('Student Apply Leave', `status=${r.status} ${JSON.stringify(r.data)}`);
  } catch (e) { fail('Student Apply Leave', e.message); }

  // 7. STUDY MATERIALS & ASSIGNMENTS
  console.log('\n=== STUDY ===');
  try { const r = await authReq('/study/materials', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Study Materials (${r.data.length})`); else fail('Study Materials', JSON.stringify(r.data)); } catch (e) { fail('Study Materials', e.message); }
  try { const r = await authReq('/study/assignments', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Assignments (${r.data.length})`); else fail('Assignments', JSON.stringify(r.data)); } catch (e) { fail('Assignments', e.message); }
  try { const r = await authReq('/study/submissions', stuToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Student Submissions (${r.data.length})`); else fail('Student Submissions', JSON.stringify(r.data)); } catch (e) { fail('Student Submissions', e.message); }

  // Student submitting assignment
  try {
    const r = await authReq('/study/submissions', stuToken, { method: 'POST', body: JSON.stringify({ assignment_id: 1, file_path: '/uploads/test-solution.pdf' }) });
    if (r.status === 200 || r.status === 201) pass('Student Submit Assignment'); else fail('Student Submit Assignment', `status=${r.status} ${JSON.stringify(r.data)}`);
  } catch (e) { fail('Student Submit Assignment', e.message); }

  // 8. EXAMS
  console.log('\n=== EXAMS ===');
  try { const r = await authReq('/exams', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Exams List (${r.data.length})`); else fail('Exams List', JSON.stringify(r.data)); } catch (e) { fail('Exams List', e.message); }
  try { const r = await authReq('/exams/marks?exam_id=1&subject_id=1', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Exam Marks (${r.data.length})`); else fail('Exam Marks', JSON.stringify(r.data)); } catch (e) { fail('Exam Marks', e.message); }
  try { const r = await authReq(`/exams/marksheet/${stuUser?.student_id || 1}`, stuToken); if (r.status === 200 && r.data.results) pass(`Student Marksheet (${r.data.results.length} subjects)`); else fail('Student Marksheet', `status=${r.status} ${JSON.stringify(r.data)}`); } catch (e) { fail('Student Marksheet', e.message); }
  try { const r = await authReq(`/exams/marksheet/${parUser?.student_id || parUser?.student_db_id || 1}`, parToken); if (r.status === 200 && r.data.results) pass(`Parent View Marksheet`); else fail('Parent View Marksheet', `status=${r.status} ${JSON.stringify(r.data)}`); } catch (e) { fail('Parent View Marksheet', e.message); }
  try { const r = await authReq('/exams/analysis?exam_id=1&section_id=1', adminToken); if (r.status === 200) pass(`Exam Analysis`); else fail('Exam Analysis', JSON.stringify(r.data)); } catch (e) { fail('Exam Analysis', e.message); }

  // 9. FEES
  console.log('\n=== FEES ===');
  try { const r = await authReq('/fees/structures', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Fee Structures (${r.data.length})`); else fail('Fee Structures', JSON.stringify(r.data)); } catch (e) { fail('Fee Structures', e.message); }
  try { const r = await authReq('/fees/payments', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Fee Payments All (${r.data.length})`); else fail('Fee Payments All', JSON.stringify(r.data)); } catch (e) { fail('Fee Payments All', e.message); }
  try { const r = await authReq(`/fees/dues/${stuUser?.student_id || 1}`, stuToken); if (r.status === 200) pass(`Student Fee Dues: balance=${r.data.balance}`); else fail('Student Fee Dues', `status=${r.status} ${JSON.stringify(r.data)}`); } catch (e) { fail('Student Fee Dues', e.message); }
  try { const r = await authReq(`/fees/dues/${parUser?.student_id || parUser?.student_db_id || 1}`, parToken); if (r.status === 200) pass(`Parent View Dues: balance=${r.data.balance}`); else fail('Parent View Dues', `status=${r.status} ${JSON.stringify(r.data)}`); } catch (e) { fail('Parent View Dues', e.message); }
  try { const r = await authReq('/fees/payments', stuToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Student Payment History (${r.data.length})`); else fail('Student Payment History', JSON.stringify(r.data)); } catch (e) { fail('Student Payment History', e.message); }
  try { const r = await authReq('/fees/scholarships', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Scholarships (${r.data.length})`); else fail('Scholarships', JSON.stringify(r.data)); } catch (e) { fail('Scholarships', e.message); }

  // 10. LIBRARY
  console.log('\n=== LIBRARY ===');
  try { const r = await authReq('/library/books', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Library Books (${r.data.length})`); else fail('Library Books', JSON.stringify(r.data)); } catch (e) { fail('Library Books', e.message); }
  try { const r = await authReq('/library/cards', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Library Cards (${r.data.length})`); else fail('Library Cards', JSON.stringify(r.data)); } catch (e) { fail('Library Cards', e.message); }
  try { const r = await authReq('/library/issues', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Library Issues (${r.data.length})`); else fail('Library Issues', JSON.stringify(r.data)); } catch (e) { fail('Library Issues', e.message); }
  try { const r = await authReq('/library/issues', stuToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Student Library Issues (${r.data.length})`); else fail('Student Library Issues', JSON.stringify(r.data)); } catch (e) { fail('Student Library Issues', e.message); }

  // 11. COMMUNICATIONS
  console.log('\n=== COMMUNICATIONS ===');
  try { const r = await authReq('/communications/notices', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Notices (${r.data.length})`); else fail('Notices', JSON.stringify(r.data)); } catch (e) { fail('Notices', e.message); }
  try { const r = await authReq('/communications/notices', stuToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Student Notices (${r.data.length})`); else fail('Student Notices', JSON.stringify(r.data)); } catch (e) { fail('Student Notices', e.message); }

  // 12. REPORTS
  console.log('\n=== REPORTS ===');
  try { const r = await authReq('/reports/certificate/1?type=bonafide', adminToken); if (r.status === 200 && r.data.text) pass('Bonafide Certificate'); else fail('Bonafide Certificate', JSON.stringify(r.data)); } catch (e) { fail('Bonafide Certificate', e.message); }
  try { const r = await authReq('/reports/certificate/1?type=character', adminToken); if (r.status === 200 && r.data.text) pass('Character Certificate'); else fail('Character Certificate', JSON.stringify(r.data)); } catch (e) { fail('Character Certificate', e.message); }
  try { const r = await authReq('/reports/certificate/1?type=transfer', adminToken); if (r.status === 200 || r.status === 400) pass(`Transfer Certificate (status=${r.status}, expected fee check)`); else fail('Transfer Certificate', JSON.stringify(r.data)); } catch (e) { fail('Transfer Certificate', e.message); }

  // Student accessing own certificate
  try { 
    const sid = stuUser?.student_id || 1;
    const r = await authReq(`/reports/certificate/${sid}?type=bonafide`, stuToken); 
    if (r.status === 200 && r.data.text) pass('Student Self Bonafide Certificate'); else fail('Student Self Bonafide Certificate', `status=${r.status} ${JSON.stringify(r.data)}`); 
  } catch (e) { fail('Student Self Bonafide Certificate', e.message); }

  // 13. ADMIN OPS
  console.log('\n=== ADMIN OPS ===');
  try { const r = await authReq('/admin/audit-logs', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`Audit Logs (${r.data.length})`); else fail('Audit Logs', JSON.stringify(r.data)); } catch (e) { fail('Audit Logs', e.message); }
  try { const r = await authReq('/admin/users', adminToken); if (r.status === 200 && Array.isArray(r.data)) pass(`System Users (${r.data.length})`); else fail('System Users', JSON.stringify(r.data)); } catch (e) { fail('System Users', e.message); }

  // 14. CHANGE PASSWORD
  console.log('\n=== CHANGE PASSWORD ===');
  try {
    const r = await authReq('/auth/change-password', stuToken, { method: 'POST', body: JSON.stringify({ old_password: 'student123', new_password: 'student123' }) });
    if (r.status === 200) pass('Change Password'); else fail('Change Password', `status=${r.status} ${JSON.stringify(r.data)}`);
  } catch (e) { fail('Change Password', e.message); }

  // 15. EXCEL EXPORTS
  console.log('\n=== EXCEL EXPORTS ===');
  try {
    const res = await fetch(`${BASE}/reports/export/students`, { headers: { Authorization: `Bearer ${adminToken}` } });
    if (res.status === 200 && res.headers.get('content-type')?.includes('sheet')) pass('Export Students Excel'); else fail('Export Students Excel', `status=${res.status}`);
  } catch (e) { fail('Export Students Excel', e.message); }
  try {
    const res = await fetch(`${BASE}/reports/export/attendance?section_id=1`, { headers: { Authorization: `Bearer ${adminToken}` } });
    if (res.status === 200 && res.headers.get('content-type')?.includes('sheet')) pass('Export Attendance Excel'); else fail('Export Attendance Excel', `status=${res.status}`);
  } catch (e) { fail('Export Attendance Excel', e.message); }
  try {
    const res = await fetch(`${BASE}/reports/export/fees`, { headers: { Authorization: `Bearer ${adminToken}` } });
    if (res.status === 200 && res.headers.get('content-type')?.includes('sheet')) pass('Export Fees Excel'); else fail('Export Fees Excel', `status=${res.status}`);
  } catch (e) { fail('Export Fees Excel', e.message); }

  // 16. HEALTH CHECK
  console.log('\n=== HEALTH ===');
  try { const r = await req('/health'.replace('/api', '')); } catch (e) {}
  try {
    const res = await fetch('http://localhost:5000/health');
    const d = await res.json();
    if (res.status === 200 && d.status === 'HEALTHY') pass('Health Check'); else fail('Health Check', JSON.stringify(d));
  } catch (e) { fail('Health Check', e.message); }

  // SUMMARY
  console.log('\n\n========== FULL TEST RESULTS ==========');
  const passed = results.filter(r => r.startsWith('✅')).length;
  const failed = results.filter(r => r.startsWith('❌')).length;
  results.forEach(r => console.log(r));
  console.log(`\n🏁 TOTAL: ${passed} passed, ${failed} failed out of ${results.length} tests`);
}

runTests().catch(e => console.error('Test runner error:', e));
