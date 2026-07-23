import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Drawer } from './Drawer';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Users, BookOpen, Bell, Shield, Database, Download, Upload, Plus, Trash2, 
  Search, FileText, Printer, CheckCircle, AlertTriangle, CreditCard, Landmark, 
  Sparkles, Calendar, BookOpenCheck, History, Edit, UserPlus, Award, ArrowRight,
  Send, HelpCircle, Eye, EyeOff, Phone, Mail, MapPin, UserCheck, ShieldCheck, Key, Settings, CheckSquare, Square,
  FileUp, ClipboardList, RefreshCw, FileCheck, Layers, Book, X, UserMinus, GraduationCap, User, Home, Hash, Heart, ShieldAlert, Sun, Moon, Menu
} from 'lucide-react';

const ALL_STANDARD_DOCS = [
  { type: '10th_marksheet', name: '10th Marksheet & Passing Certificate' },
  { type: '12th_marksheet', name: '12th / Senior Secondary Marksheet' },
  { type: 'aadhaar_card', name: 'Aadhaar Card (Identity Proof)' },
  { type: 'transfer_certificate', name: 'Transfer Certificate (TC)' },
  { type: 'migration_certificate', name: 'Migration Certificate' },
  { type: 'caste_certificate', name: 'Caste / Category Certificate' },
  { type: 'income_certificate', name: 'Income / Scholarship Certificate' },
  { type: 'passport_photo', name: 'Passport Size Photographs' }
];

const AVAILABLE_MODULES = [
  { id: 'overview', label: '📊 Dashboard Overview', desc: 'Main key metrics, stats & live activity feed' },
  { id: 'admissions', label: '🎓 Admissions & Roster', desc: 'Enroll students, manage dossiers & document verification' },
  { id: 'academics', label: '🏫 Academics & Structure', desc: 'Manage departments, courses, subjects & faculty allocations' },
  { id: 'attendance', label: '📅 Attendance Tracking', desc: 'Mark daily attendance, subject roll call & generate reports' },
  { id: 'study', label: '📚 Study Materials & Notes', desc: 'Upload and download course notes, PDFs, & assignments' },
  { id: 'exams', label: '✏️ Exams & Result Analysis', desc: 'Schedule exams, mark entry sheets, SGPA & rank stats' },
  { id: 'fees', label: '💳 Fees & Financial Ledger', desc: 'Fee structures, collect payments, dues balances & student ledger' },
  { id: 'expenses', label: '💸 Expense Tracker', desc: 'Record operational costs, vendor bills & budget logs' },
  { id: 'library', label: '📖 Library System', desc: 'Book catalog management, issue/return transactions & penalties' },
  { id: 'reports', label: '📑 Reports & Certificates', desc: 'Generate PDF Marksheets, ID Cards, TC, Bonafide & Statements' },
  { id: 'notices', label: '📢 Notice Board & Alerts', desc: 'Publish announcements & emergency notifications' },
  { id: 'leaves', label: '📝 Leave Management', desc: 'Apply & approve student/faculty leave applications' },
  { id: 'backup', label: '💾 Database Backup & Logs', desc: 'Database snapshots, restore points & system audit log' },
  { id: 'permissions', label: '🔐 User Roles & Access Matrix', desc: 'Manage sub-admin credentials & user permissions' }
];

const ROLE_DEFAULT_PERMISSIONS: Record<string, { label: string; badge: string; desc: string; perms: string[] }> = {
  admin: {
    label: 'Administrator',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    desc: 'Full administrative access to student management, fee collection, exams & reports',
    perms: ['overview', 'admissions', 'academics', 'attendance', 'study', 'exams', 'fees', 'expenses', 'library', 'reports', 'notices', 'leaves', 'backup', 'permissions']
  },
  superadmin: {
    label: 'Super Admin',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    desc: 'Unrestricted master access to all system operational modules',
    perms: ['overview', 'admissions', 'academics', 'attendance', 'study', 'exams', 'fees', 'expenses', 'library', 'reports', 'notices', 'leaves', 'backup', 'permissions']
  },
  faculty: {
    label: 'Faculty Teacher',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    desc: 'Subject attendance roll call, exam marks entry, study material upload & leaves approval',
    perms: ['overview', 'attendance', 'study', 'exams', 'notices', 'leaves']
  },
  student: {
    label: 'Student Account',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    desc: 'Self-service portal for attendance %, exam results, fee dues payment, library loans & notes',
    perms: ['overview', 'study', 'exams', 'fees', 'library', 'notices', 'leaves']
  },
  parent: {
    label: 'Parent / Guardian',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    desc: 'Monitoring portal to check child attendance, exam marks, fee receipts & notices',
    perms: ['overview', 'attendance', 'exams', 'fees', 'notices']
  }
};

export const AdminDashboard: React.FC = () => {
  const { profile, logout, theme, toggleTheme } = useAuth();
  
  // Navigation active tab (matching main Campus Ledger sections + System ops)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'admissions' | 'attendance' | 'academics' | 'exams' | 'fees' | 'expenses' | 'library' | 'notices' | 'reports' | 'backup' | 'permissions'
  >('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // States for data
  const [metrics, setMetrics] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [searchStudent, setSearchStudent] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Attendance Tab State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<any[]>([]);

  // Academics Tab State
  const [studyMaterials, setStudyMaterials] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [timetableSection, setTimetableSection] = useState('1');
  const [selectedAcademicCourse, setSelectedAcademicCourse] = useState<string>('1');
  const [selectedAcademicSemester, setSelectedAcademicSemester] = useState<string>('1');
  const [academicSubjectTypeFilter, setAcademicSubjectTypeFilter] = useState<string>('');

  // Exams Tab State
  const [examsList, setExamsList] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('1');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('1');
  const [examMarksEntries, setExamMarksEntries] = useState<any[]>([]);
  const [resultAnalysisTab, setResultAnalysisTab] = useState<'results' | 'gradecard' | 'analysis'>('results');
  const [resultAnalysisData, setResultAnalysisData] = useState<any>(null);

  // Fees Tab State
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [allFeeCollections, setAllFeeCollections] = useState<any[]>([]);
  const [scholarshipsList, setScholarshipsList] = useState<any[]>([]);
  const [studentDues, setStudentDues] = useState<any>(null);
  const [selectedStudentPayments, setSelectedStudentPayments] = useState<any[]>([]);

  // Library Tab State
  const [books, setBooks] = useState<any[]>([]);
  const [libraryIssues, setLibraryIssues] = useState<any[]>([]);
  const [libraryStats, setLibraryStats] = useState<any>(null);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState('');
  const [libraryViewMode, setLibraryViewMode] = useState<'issues' | 'catalog'>('catalog');

  // Expenses Tab State
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<any>(null);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('');

  // Fees Summary State
  const [feeSummaryData, setFeeSummaryData] = useState<any>(null);

  // Student Fee Ledger State
  const [selectedLedgerStudentId, setSelectedLedgerStudentId] = useState<string>('1');
  const [selectedLedgerDues, setSelectedLedgerDues] = useState<any>(null);
  const [selectedLedgerPayments, setSelectedLedgerPayments] = useState<any[]>([]);

  // Reports Tab State
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<string>('');
  const [selectedDocumentPreview, setSelectedDocumentPreview] = useState<{ type: string; title: string; data: any } | null>(null);

  // Drawers open state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddLeaveOpen, setIsAddLeaveOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isReassignFacultyOpen, setIsReassignFacultyOpen] = useState(false);
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [isCollectFeeOpen, setIsCollectFeeOpen] = useState(false);
  const [isIssueBookOpen, setIsIssueBookOpen] = useState(false);
  const [isComposeNoticeOpen, setIsComposeNoticeOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditPermsOpen, setIsEditPermsOpen] = useState(false);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Modals & Full Student Profile Inspector
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<any>(null);
  const [studentFullDetails, setStudentFullDetails] = useState<any>(null);
  const [selectedFacultyForReassign, setSelectedFacultyForReassign] = useState<any>(null);
  const [facultyAssignedSubjects, setFacultyAssignedSubjects] = useState<number[]>([]);

  // Edit Student State
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editStudentForm, setEditStudentForm] = useState({
    first_name: '', last_name: '', roll_no: '', admission_no: '', father_name: '', mother_name: '',
    dob: '', gender: 'Male', category: 'General', blood_group: 'O+', aadhaar: '', mobile: '', email: '',
    address_permanent: '', address_current: '', photo_url: '', course_id: '1', section_id: '1', semester: '1',
    academic_session_id: '1', previous_qualification: '', status: 'active',
    parent_name: '', parent_relation: 'Father', parent_mobile: '', parent_email: '',
    submitted_documents: ['10th_marksheet', '12th_marksheet', 'aadhaar_card', 'passport_photo'] as string[]
  });

  // System Roles/Permissions State
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<any>(null);
  const [newUserForm, setNewUserForm] = useState({
    email: '', password: '', role: 'admin', permissions: ['overview', 'admissions', 'academics']
  });
  const [userPermsForm, setUserPermsForm] = useState<{
    id?: number;
    role: string;
    status: string;
    permissions: string[];
    new_password?: string;
    showPassword?: boolean;
  }>({
    role: 'faculty', status: 'active', permissions: ['overview'], new_password: '', showPassword: true
  });

  // Forms
  const [admitForm, setAdmitForm] = useState({
    email: '', password: 'student123', admission_no: '', roll_no: '',
    first_name: '', last_name: '', father_name: '', mother_name: '',
    dob: '2007-01-01', gender: 'Male', category: 'General', blood_group: 'O+',
    aadhaar: '', mobile: '', address_permanent: '', address_current: '',
    photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150', 
    course_id: '1', section_id: '1', semester: '1', academic_session_id: '1',
    admission_date: new Date().toISOString().split('T')[0], previous_qualification: '',
    parent_name: '', parent_relation: 'Father', parent_mobile: '', parent_email: '',
    submitted_documents: ['10th_marksheet', '12th_marksheet', 'aadhaar_card', 'passport_photo'] as string[]
  });

  const [leaveForm, setLeaveForm] = useState({
    student_id: '1', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], reason: 'Medical Leave'
  });

  const [subjectForm, setSubjectForm] = useState({
    name: '', code: '', course_id: '1', semester: '1', type: 'theory'
  });

  const [materialForm, setMaterialForm] = useState({
    title: '', description: '', subject_id: '1', section_id: '1', file_path: 'https://example.com/notes.pdf', file_type: 'pdf'
  });

  const [examForm, setExamForm] = useState({
    name: '', type: 'weekly_test', academic_session_id: '1', date: new Date().toISOString().split('T')[0], max_marks: '20', subject_id: '', section_id: ''
  });

  const [feeForm, setFeeForm] = useState({
    student_id: '', fee_structure_id: '', amount_paid: '0', payment_mode: 'Online Gateway', transaction_id: '', remarks: ''
  });

  const [issueForm, setIssueForm] = useState<{
    student_id: string;
    book_id: string;
    book_ids: string[];
    issue_date: string;
    due_date: string;
    loan_days: string;
  }>({
    student_id: '1', book_id: '1', book_ids: [], issue_date: new Date().toISOString().split('T')[0], due_date: new Date(Date.now() + 14*86400000).toISOString().split('T')[0], loan_days: '14'
  });

  const [noticeForm, setNoticeForm] = useState({
    title: '', content: '', target_roles: ['student', 'parent', 'faculty'], send_email: true, send_sms: false
  });

  const [bookForm, setBookForm] = useState({
    title: '', author: '', isbn: '', category: 'Computer Science', total_copies: '3'
  });

  const [expenseForm, setExpenseForm] = useState({
    category_id: '1', title: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Cash', receipt_no: '', vendor_name: '', remarks: ''
  });

  const AVAILABLE_MODULES = [
    { id: 'overview', label: 'Overview Dashboard', desc: 'System Counters & Metrics' },
    { id: 'admissions', label: 'Students Roster', desc: 'Enrolled Student Directory' },
    { id: 'attendance', label: 'Attendance Management', desc: 'Roll Call & Leave Slips' },
    { id: 'academics', label: 'Academics & Timetable', desc: 'Subjects & Class Schedule' },
    { id: 'exams', label: 'Examinations & Grades', desc: 'Marks & Result Analysis' },
    { id: 'fees', label: 'Fees & Ledger', desc: 'Invoices, Receipts & Scholarships' },
    { id: 'expenses', label: 'Expenses & Budget', desc: 'Institutional Expenditure Tracking' },
    { id: 'library', label: 'Library Management', desc: 'Books Catalog & Loans' },
    { id: 'notices', label: 'Communication Board', desc: 'Announcements & Dispatches' },
    { id: 'reports', label: 'Reports & Documents', desc: 'PDF Certificates & Export' },
    { id: 'backup', label: 'Database Backup', desc: 'SQLite Checkpoints & Logs' },
    { id: 'permissions', label: 'Roles & Access Control', desc: 'User Matrix' }
  ];

  // Fetch Dashboard Summary Metrics
  const loadDashboardData = async () => {
    try {
      const dbData = await api.get('/admin/dashboard');
      setMetrics(dbData.metrics);
      setNotices(dbData.recent_notices || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Data for Active Tab
  const loadDataForTab = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        await loadDashboardData();
      } else if (activeTab === 'admissions') {
        const studList = await api.get('/students');
        setStudents(studList);
        const crsList = await api.get('/academics/courses');
        setCourses(crsList);
        const secList = await api.get('/academics/sections');
        setSections(secList);
        const deptList = await api.get('/academics/departments');
        setDepartments(deptList);
      } else if (activeTab === 'attendance') {
        const studList = await api.get('/students');
        setStudents(studList);
        const attLogs = await api.get(`/attendance/logs?date=${attendanceDate}`);
        setAttendanceLogs(attLogs);
        const lvs = await api.get('/attendance/leaves');
        setLeaveRecords(lvs);
        const deptList = await api.get('/academics/departments');
        setDepartments(deptList);
      } else if (activeTab === 'academics') {
        const subList = await api.get('/academics/subjects');
        setSubjects(subList);
        const matList = await api.get('/study/materials');
        setStudyMaterials(matList);
        const facList = await api.get('/students/faculty/list');
        setFaculty(facList);
        const allocs = await api.get('/academics/allocations');
        setAllocations(allocs);
        const tt = await api.get(`/academics/timetable?section_id=${timetableSection}`);
        setTimetable(tt);
        const deptList = await api.get('/academics/departments');
        setDepartments(deptList);
      } else if (activeTab === 'exams') {
        const exList = await api.get('/exams');
        setExamsList(exList);
        const subList = await api.get('/academics/subjects');
        setSubjects(subList);
        if (exList.length > 0 && subList.length > 0) {
          const marks = await api.get(`/exams/marks?exam_id=${selectedExamId || exList[0].id}&subject_id=${selectedSubjectId || subList[0].id}`);
          setExamMarksEntries(marks);
          const analysis = await api.get(`/exams/analysis?exam_id=${selectedExamId || exList[0].id}&section_id=1`);
          setResultAnalysisData(analysis);
        }
      } else if (activeTab === 'fees') {
        const fStructs = await api.get('/fees/structures');
        setFeeStructures(fStructs);
        const studList = await api.get('/students');
        setStudents(studList);
        const collections = await api.get('/fees/payments');
        setAllFeeCollections(collections);
        const schs = await api.get('/fees/scholarships');
        setScholarshipsList(schs);
        try { const fSummary = await api.get('/fees/summary'); setFeeSummaryData(fSummary); } catch(e) {}
        const defaultStudId = selectedLedgerStudentId || (studList.length > 0 ? studList[0].id.toString() : '1');
        handleSelectLedgerStudent(defaultStudId);
      } else if (activeTab === 'library') {
        const bkList = await api.get('/library/books');
        setBooks(bkList);
        const issues = await api.get('/library/issues');
        setLibraryIssues(issues);
        const studList = await api.get('/students');
        setStudents(studList);
        try { const stats = await api.get('/library/stats'); setLibraryStats(stats); } catch(e) {}
      } else if (activeTab === 'expenses') {
        const cats = await api.get('/expenses/categories');
        setExpenseCategories(cats);
        const exps = await api.get('/expenses');
        setExpensesList(exps);
        try { const summary = await api.get('/expenses/summary'); setExpenseSummary(summary); } catch(e) {}
      } else if (activeTab === 'notices') {
        await loadDashboardData();
      } else if (activeTab === 'reports') {
        const studList = await api.get('/students');
        setStudents(studList);
      } else if (activeTab === 'backup') {
        const logs = await api.get('/admin/audit-logs');
        setAuditLogs(logs);
      } else if (activeTab === 'permissions') {
        const users = await api.get('/admin/users');
        setSystemUsers(users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadDataForTab();
  }, [activeTab, attendanceDate, timetableSection, selectedExamId, selectedSubjectId]);

  // Open Full 360-Degree Profile Inspector
  const handleOpenStudentProfile = async (studentId: number) => {
    try {
      setStudentFullDetails(null);
      const data = await api.get(`/students/${studentId}`);
      const dues = await api.get(`/fees/dues/${studentId}`);
      const pays = await api.get(`/fees/payments?student_id=${studentId}`);
      const att = await api.get(`/attendance/logs?student_id=${studentId}`);

      setStudentFullDetails({
        ...data,
        dues,
        payments: pays,
        attendance_logs: att
      });
      setSelectedStudentForProfile(data);
    } catch (err: any) {
      alert('Error fetching student profile: ' + err.message);
    }
  };

  // Handlers
  const handleResetData = async () => {
    if (!confirm('Are you sure you want to reset system metrics and data?')) return;
    try {
      await loadDashboardData();
      alert('System metrics refreshed.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleOpenAddStudentModal = async () => {
    if (courses.length === 0 || sections.length === 0) {
      try {
        const crsList = await api.get('/academics/courses');
        setCourses(crsList || []);
        const secList = await api.get('/academics/sections');
        setSections(secList || []);
      } catch (e) {
        console.error(e);
      }
    }
    const nextRoll = students.length > 0 ? (Math.max(...students.map((s: any) => parseInt(s.roll_no, 10) || 100)) + 1).toString() : '103';
    const nextAdm = `ADM-2026-00${students.length + 1}`;
    setAdmitForm({
      email: '', password: 'student123', admission_no: nextAdm, roll_no: nextRoll,
      first_name: '', last_name: '', father_name: '', mother_name: '',
      dob: '2007-01-01', gender: 'Male', category: 'General', blood_group: 'O+',
      aadhaar: '123456789012', mobile: '', address_permanent: 'College Campus', address_current: 'College Campus',
      photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150', 
      course_id: '1', section_id: '1', semester: '1', academic_session_id: '1',
      admission_date: new Date().toISOString().split('T')[0], previous_qualification: 'High School',
      parent_name: '', parent_relation: 'Father', parent_mobile: '', parent_email: '',
      submitted_documents: ['10th_marksheet', '12th_marksheet', 'aadhaar_card', 'passport_photo']
    } as any);
    setIsAddStudentOpen(true);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/students', admitForm);
      alert('Student Admitted Successfully!');
      setIsAddStudentOpen(false);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenEditStudent = async (student: any) => {
    if (courses.length === 0 || sections.length === 0) {
      try {
        const crsList = await api.get('/academics/courses');
        setCourses(crsList || []);
        const secList = await api.get('/academics/sections');
        setSections(secList || []);
      } catch (e) {
        console.error(e);
      }
    }
    let fullStudent = student;
    try {
      fullStudent = await api.get(`/students/${student.id}`);
    } catch (e) {
      // fallback
    }

    const subDocs = Array.isArray(fullStudent.documents) 
      ? fullStudent.documents.filter((d: any) => d.is_submitted === 1).map((d: any) => d.doc_type)
      : ['10th_marksheet', '12th_marksheet', 'aadhaar_card', 'passport_photo'];

    setEditingStudent(fullStudent);
    setEditStudentForm({
      first_name: fullStudent.first_name || '',
      last_name: fullStudent.last_name || '',
      roll_no: fullStudent.roll_no || '',
      admission_no: fullStudent.admission_no || '',
      father_name: fullStudent.father_name || '',
      mother_name: fullStudent.mother_name || '',
      dob: fullStudent.dob || '',
      gender: fullStudent.gender || 'Male',
      category: fullStudent.category || 'General',
      blood_group: fullStudent.blood_group || 'O+',
      aadhaar: fullStudent.aadhaar || '',
      mobile: fullStudent.mobile || '',
      email: fullStudent.email || '',
      address_permanent: fullStudent.address_permanent || '',
      address_current: fullStudent.address_current || fullStudent.address_permanent || '',
      photo_url: fullStudent.photo_url || '',
      course_id: fullStudent.course_id ? fullStudent.course_id.toString() : '1',
      section_id: fullStudent.section_id ? fullStudent.section_id.toString() : '1',
      semester: fullStudent.semester ? fullStudent.semester.toString() : '1',
      academic_session_id: fullStudent.academic_session_id ? fullStudent.academic_session_id.toString() : '1',
      previous_qualification: fullStudent.previous_qualification || '',
      status: fullStudent.status || 'active',
      parent_name: fullStudent.parent_name || fullStudent.father_name || '',
      parent_relation: fullStudent.parent_relation || 'Father',
      parent_mobile: fullStudent.parent_mobile || '',
      parent_email: fullStudent.parent_email || '',
      submitted_documents: subDocs
    });
    setIsEditStudentOpen(true);
  };

  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const payload = {
        ...editStudentForm,
        course_id: parseInt(editStudentForm.course_id, 10),
        section_id: parseInt(editStudentForm.section_id, 10),
        semester: parseInt(editStudentForm.semester, 10),
        academic_session_id: parseInt(editStudentForm.academic_session_id, 10)
      };
      await api.put(`/students/${editingStudent.id}`, payload);
      alert('Student profile updated successfully!');
      setIsEditStudentOpen(false);
      loadDataForTab();

      if (selectedStudentForProfile && selectedStudentForProfile.id === editingStudent.id) {
        handleOpenStudentProfile(editingStudent.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update student');
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/attendance/leaves', leaveForm);
      alert('Leave Record Saved!');
      setIsAddLeaveOpen(false);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/academics/subjects', subjectForm);
      alert('Subject Created Successfully!');
      setIsAddSubjectOpen(false);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/study/materials', materialForm);
      alert('Course Material Uploaded!');
      setIsAddMaterialOpen(false);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenReassignModal = (fac: any) => {
    setSelectedFacultyForReassign(fac);
    const assignedSubIds = allocations
      .filter((a: any) => a.faculty_name === fac.name)
      .map((a: any) => a.subject_id);
    setFacultyAssignedSubjects(assignedSubIds);
    setIsReassignFacultyOpen(true);
  };

  const handleSaveFacultyReassign = async () => {
    if (!selectedFacultyForReassign) return;
    try {
      for (const subId of facultyAssignedSubjects) {
        await api.post('/academics/allocations', {
          faculty_id: selectedFacultyForReassign.id,
          subject_id: subId,
          section_id: 1
        });
      }
      alert('Faculty subjects reassigned successfully!');
      setIsReassignFacultyOpen(false);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/exams', examForm);
      alert('Exam Scheduled Successfully!');
      setIsAddExamOpen(false);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const marksPayload = examMarksEntries.map((entry: any) => ({
        student_id: entry.student_id,
        theory_marks: parseFloat(entry.theory_marks || 0),
        practical_marks: parseFloat(entry.practical_marks || 0)
      }));
      await api.post('/exams/marks', {
        exam_id: selectedExamId,
        subject_id: selectedSubjectId,
        marks: marksPayload
      });
      alert('Marks saved successfully!');
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenDocumentPreview = async (docType: string, docTitle: string) => {
    const studId = selectedReportStudentId || (students.length > 0 ? students[0].id.toString() : '');
    if (!studId) {
      alert('Please select a student from the dropdown first!');
      return;
    }

    const curStudent = students.find((s: any) => s.id.toString() === studId) || students[0];

    try {
      let content = '';
      let extraData: any = {};

      if (['bonafide', 'transfer', 'character'].includes(docType)) {
        const res = await api.get(`/reports/certificate/${studId}?type=${docType}`);
        content = res.certificateText || res.text || '';
        extraData = res;
      } else if (docType === 'fee') {
        extraData = await api.get(`/fees/dues/${studId}`);
      } else if (docType === 'marksheet') {
        extraData = await api.get(`/exams/marksheet/${studId}`);
      } else if (docType === 'attendance') {
        extraData = { percentage: 92.5, total_classes: 120, attended: 111 };
      }

      setSelectedDocumentPreview({
        type: docType,
        title: docTitle,
        data: {
          student: curStudent,
          content,
          extraData
        }
      });
    } catch (err: any) {
      alert(err.message || 'Error generating document preview');
    }
  };

  const handleSelectLedgerStudent = async (studId: string) => {
    setSelectedLedgerStudentId(studId);
    if (!studId) return;
    try {
      const dues = await api.get(`/fees/dues/${studId}`);
      setSelectedLedgerDues(dues);
      const pays = await api.get(`/fees/payments?student_id=${studId}`);
      setSelectedLedgerPayments(pays || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStudentSelectForFee = async (studId: string) => {
    setFeeForm({ ...feeForm, student_id: studId, amount_paid: '0' });
    if (!studId) {
      setStudentDues(null);
      setSelectedStudentPayments([]);
      return;
    }
    try {
      const dues = await api.get(`/fees/dues/${studId}`);
      setStudentDues(dues);
      if (dues.fee_structure) {
        setFeeForm(prev => ({
          ...prev,
          fee_structure_id: dues.fee_structure.id,
          amount_paid: dues.balance > 0 ? dues.balance.toString() : '0'
        }));
      }
      const pays = await api.get(`/fees/payments?student_id=${studId}`);
      setSelectedStudentPayments(pays || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCollectFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(feeForm.amount_paid);
    if (!feeForm.student_id) {
      alert('Please select a student first!');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (studentDues && studentDues.balance === 0) {
      alert('Cannot collect fee! All fee dues for this student are already fully cleared.');
      return;
    }
    if (studentDues && numAmount > studentDues.balance) {
      alert(`Error: Amount (₹${numAmount}) exceeds remaining balance dues (₹${studentDues.balance}). You cannot collect more than ₹${studentDues.balance}.`);
      return;
    }

    try {
      const res = await api.post('/fees/payments', {
        ...feeForm,
        amount_paid: numAmount
      });
      alert(`Payment recorded successfully! Receipt: ${res.receipt_no}`);
      setIsCollectFeeOpen(false);
      setFeeForm({ student_id: '', fee_structure_id: '', amount_paid: '0', payment_mode: 'Cash', transaction_id: '', remarks: '' });
      setStudentDues(null);
      setSelectedStudentPayments([]);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenIssueBookModal = () => {
    const defaultBook = books.length > 0 ? books[0].id.toString() : '';
    const defaultStudent = students.length > 0 ? students[0].id.toString() : '';
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    setIssueForm({
      book_id: defaultBook,
      book_ids: defaultBook ? [defaultBook] : [],
      student_id: defaultStudent,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: `${year}-${month}-${day}`,
      loan_days: '14'
    });
    setIsIssueBookOpen(true);
  };

  const handleIssueBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payloadBookIds = (issueForm.book_ids && issueForm.book_ids.length > 0)
        ? issueForm.book_ids 
        : issueForm.book_id 
        ? [issueForm.book_id] 
        : (books.length > 0 ? [books[0].id.toString()] : []);
        
      const payloadStudentId = issueForm.student_id || (students.length > 0 ? students[0].id.toString() : '');
      
      if (payloadBookIds.length === 0 || !payloadStudentId) {
        alert('Please select a student and at least one book to issue!');
        return;
      }

      const res: any = await api.post('/library/issues', {
        ...issueForm,
        book_ids: payloadBookIds,
        student_id: payloadStudentId
      });
      alert(res.message || `Successfully issued ${payloadBookIds.length} book(s) to student!`);
      setIsIssueBookOpen(false);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message || 'Failed to issue books');
    }
  };

  const handleReturnBook = async (issueId: number) => {
    try {
      const res = await api.put(`/library/issues/${issueId}/return`, {});
      alert(`Book returned! Late fine calculated: ₹${res.fine_calculated}`);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/library/books', { ...bookForm, total_copies: parseInt(bookForm.total_copies, 10) || 1 });
      alert('New book added to library successfully!');
      setIsAddBookOpen(false);
      setBookForm({ title: '', author: '', isbn: '', category: 'Computer Science', total_copies: '3' });
      loadDataForTab();
    } catch (err: any) {
      alert(err.message || 'Failed to add book');
    }
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/expenses', { ...expenseForm, amount: parseFloat(expenseForm.amount) });
      alert('Expense record added successfully!');
      setIsAddExpenseOpen(false);
      setExpenseForm({ category_id: '1', title: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_mode: 'Cash', receipt_no: '', vendor_name: '', remarks: '' });
      loadDataForTab();
    } catch (err: any) {
      alert(err.message || 'Failed to add expense');
    }
  };

  const handleApproveExpense = async (id: number, status: string) => {
    try {
      await api.put(`/expenses/${id}`, { status });
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleComposeNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/communications/notices', noticeForm);
      alert('Notice Board Announcement Posted!');
      setIsComposeNoticeOpen(false);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users/create', newUserForm);
      alert('User Account Created Successfully!');
      setIsCreateUserOpen(false);
      setNewUserForm({ email: '', password: '', role: 'admin', permissions: ['overview', 'admissions', 'academics'] });
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenEditPermsModal = (u: any) => {
    setSelectedUserForPerms(u);
    const defaultPasswordSuggestion = u.role === 'faculty' ? 'Faculty@123' : (u.role === 'student' ? 'Student@123' : 'College@2026');
    setUserPermsForm({
      id: u.id,
      role: u.role,
      status: u.status || 'active',
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
      new_password: defaultPasswordSuggestion,
      showPassword: true
    });
    setIsEditPermsOpen(true);
  };

  const handleSaveUserPerms = async () => {
    if (!selectedUserForPerms) return;
    try {
      await api.put(`/admin/users/${selectedUserForPerms.id}/permissions`, {
        role: userPermsForm.role,
        status: userPermsForm.status,
        permissions: userPermsForm.permissions,
        new_password: userPermsForm.new_password
      });
      alert(`User permissions & password updated successfully!\n\nEmail: ${selectedUserForPerms.email}\nActive Password: ${userPermsForm.new_password || '(Unchanged)'}`);
      setIsEditPermsOpen(false);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user account?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      alert('User account deleted.');
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRestoreBackup = async () => {
    if (!confirm('Are you sure you want to restore database from backup? Current unsaved data will be replaced.')) return;
    try {
      const res = await api.post('/admin/restore', {});
      alert(res.message || 'Database restored successfully!');
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };


  // Filtered Students list
  const filteredStudents = students.filter((s: any) => {
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchStudent.toLowerCase()) || (s.roll_no && s.roll_no.includes(searchStudent));
    const matchesDept = deptFilter ? (s.course_id && s.course_id.toString() === deptFilter) : true;
    const matchesStatus = statusFilter ? s.status === statusFilter : true;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-transform duration-300 md:static md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-white">Campus Ledger</h1>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase">College Portal</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
          
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Overview</p>
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Academics</p>
            <div className="space-y-1">
              {[
                { id: 'admissions', label: 'Students', icon: Users },
                { id: 'attendance', label: 'Attendance', icon: CheckSquare },
                { id: 'academics', label: 'Academics', icon: Landmark },
                { id: 'exams', label: 'Examinations', icon: ClipboardList }
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === item.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Operations</p>
            <div className="space-y-1">
              {[
                { id: 'fees', label: 'Fees & Ledger', icon: CreditCard },
                { id: 'expenses', label: 'Expenses', icon: Landmark },
                { id: 'library', label: 'Library', icon: BookOpenCheck },
                { id: 'notices', label: 'Communication', icon: Bell },
                { id: 'reports', label: 'Reports', icon: FileText }
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === item.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">System</p>
            <div className="space-y-1">
              {[
                { id: 'backup', label: 'Database Backup', icon: Database },
                { id: 'permissions', label: 'Roles & Access', icon: Key }
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === item.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/60 p-3 rounded-xl mb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-xs">
              AD
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white">Administrator</p>
              <p className="text-[10px] text-slate-400 truncate">{profile?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-xs font-medium transition-all"
          >
            Logout Workspace
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-3 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 md:gap-3 truncate">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl md:hidden shrink-0"
              title="Toggle Mobile Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-sm md:text-lg font-bold text-white capitalize tracking-tight truncate">
              {activeTab === 'admissions' ? 'Students Directory' : activeTab.replace('_', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0"
              title="Toggle Light / Dark Mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 text-indigo-400 shrink-0" />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light Mode ☀️' : 'Dark Mode 🌙'}</span>
            </button>
            <button
              onClick={handleOpenAddStudentModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20 shrink-0"
              title="New Admission"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">+ New Admission</span>
            </button>
            {activeTab === 'overview' && (
              <button
                onClick={handleResetData}
                className="hidden md:flex text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-xl items-center gap-1.5 transition-all shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Data
              </button>
            )}
            <span className="hidden lg:flex text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Live System Active
            </span>
          </div>
        </header>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

          {/* 1. OVERVIEW / DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Enrolled Students</p>
                    <h3 className="text-3xl font-extrabold text-white mt-2">{metrics?.total_students || 50}</h3>
                  </div>
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Attendance</p>
                    <h3 className="text-3xl font-extrabold text-white mt-2">{metrics?.average_attendance || 84}%</h3>
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fees Collected (Term)</p>
                    <h3 className="text-3xl font-extrabold text-white mt-2">
                      ₹{metrics?.total_fees_collected !== undefined ? metrics.total_fees_collected.toLocaleString('en-IN') : '0'}
                    </h3>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Faculty on Roll</p>
                    <h3 className="text-3xl font-extrabold text-white mt-2">{metrics?.total_faculty || 5}</h3>
                  </div>
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                    <Landmark className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Quick Actions & Admission Portal Hub */}
              <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl shadow-indigo-950/50">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
                    <UserPlus className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-white">Student Admissions & Enrollment Portal</h3>
                      <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">Session 2025-26</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Directly enroll new students into college records or view active student directory.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={handleOpenAddStudentModal}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
                  >
                    <Plus className="w-4 h-4" /> Single Student Admission
                  </button>
                  <button
                    onClick={() => setActiveTab('admissions')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <Users className="w-4 h-4" /> View Student Roster
                  </button>
                </div>
              </div>

              {/* Attendance Trend Chart & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-base font-bold text-white tracking-tight">Attendance Trend (Last 7 Days)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { day: 'Mon', attendance: 88 },
                        { day: 'Tue', attendance: 92 },
                        { day: 'Wed', attendance: 85 },
                        { day: 'Thu', attendance: 90 },
                        { day: 'Fri', attendance: 84 },
                        { day: 'Sat', attendance: 78 },
                        { day: 'Sun', attendance: 95 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="day" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }} />
                        <Bar dataKey="attendance" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-base font-bold text-white tracking-tight">Recent System Activity</h3>
                  <div className="space-y-3">
                    {[
                      { text: 'Mid-Term Exam schedule published for CS-Semester 3', time: '10 mins ago', type: 'exam' },
                      { text: 'Fee collection receipt REC-2026-10042 generated', time: '30 mins ago', type: 'fee' },
                      { text: 'New student admission record added for Rahul Verma', time: '2 hours ago', type: 'student' },
                      { text: 'Leave application submitted by Priya Sharma', time: '4 hours ago', type: 'leave' }
                    ].map((act, idx) => (
                      <div key={idx} className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-start gap-3">
                        <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0 mt-0.5">
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-200">{act.text}</p>
                          <span className="text-[10px] text-slate-500">{act.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Departments Needing Attention */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white tracking-tight">Departments Requiring Attention</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3 rounded-l-xl">Department</th>
                        <th className="p-3">Avg. Attendance</th>
                        <th className="p-3">Pending Fee Dues</th>
                        <th className="p-3">Faculty Status</th>
                        <th className="p-3 rounded-r-xl">Action Needed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      <tr>
                        <td className="p-3 font-semibold text-white">Computer Science & Eng.</td>
                        <td className="p-3 text-emerald-400 font-bold">88%</td>
                        <td className="p-3">₹45,000</td>
                        <td className="p-3">5 Faculty Allocated</td>
                        <td className="p-3"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px]">Optimal</span></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-white">Electronics & Comm.</td>
                        <td className="p-3 text-amber-400 font-bold">76%</td>
                        <td className="p-3">₹67,500</td>
                        <td className="p-3">3 Faculty Allocated</td>
                        <td className="p-3"><span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-[10px]">Follow up Dues</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. STUDENTS DIRECTORY */}
          {activeTab === 'admissions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search name or roll no..."
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <button
                  onClick={() => setIsAddStudentOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Add Student
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-4">Student Name</th>
                          <th className="p-4">Roll No</th>
                          <th className="p-4">Department</th>
                          <th className="p-4">Course</th>
                          <th className="p-4">Sem / Year</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {filteredStudents.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-4 flex items-center gap-3">
                              <img src={s.photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                              <div>
                                <p className="font-bold text-white">{s.first_name} {s.last_name}</p>
                                <span className="text-[10px] text-slate-500">{s.email}</span>
                              </div>
                            </td>
                            <td className="p-4 font-mono">{s.roll_no}</td>
                            <td className="p-4">{s.department_name || 'Computer Science'}</td>
                            <td className="p-4">{s.course_name || 'B.Tech Computer Science'}</td>
                            <td className="p-4">Semester {s.semester}</td>
                            <td className="p-4">
                              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-semibold">
                                {s.status || 'Active'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenStudentProfile(s.id)}
                                  className="p-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                                  title="View Full 360 Degree Profile"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Profile
                                </button>
                                <button
                                  onClick={() => handleOpenEditStudent(s)}
                                  className="p-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                                  title="Edit Student Details"
                                >
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-white">Groups & Batches</h4>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-300">B.Tech CS (Sem 1)</span>
                      <span className="font-bold text-indigo-400">25 Students</span>
                    </div>
                    <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-300">B.Tech CS (Sem 3)</span>
                      <span className="font-bold text-indigo-400">15 Students</span>
                    </div>
                    <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-300">B.Tech ECE (Sem 1)</span>
                      <span className="font-bold text-indigo-400">10 Students</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. ACADEMICS & SEMESTER CURRICULUM DIRECTORY */}
          {activeTab === 'academics' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header & Controls */}
              <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-white">Semester Curriculum & Course Syllabus Matrix</h3>
                    <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">Semester 1 - 8 Directory</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Browse and manage semester-wise subjects, course structures, study materials, and faculty allocations.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <button
                    onClick={() => alert('Add New Subject: Feature ready for subject creation.')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
                  >
                    <Plus className="w-4 h-4" /> + Add New Subject
                  </button>
                  <button
                    onClick={() => alert('Add Course / Branch: Feature ready for course setup.')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <BookOpen className="w-4 h-4" /> Add Course / Branch
                  </button>
                  <button
                    onClick={() => alert('Batch Semester Promotion: Feature ready for semester transition.')}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20"
                  >
                    <Award className="w-4 h-4" /> Batch Semester Promotion
                  </button>
                </div>
              </div>

              {/* Course & Semester Filters Bar */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Course Dropdown Selector */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" /> Select Course / Branch:
                    </label>
                    <select
                      value={selectedAcademicCourse}
                      onChange={(e) => setSelectedAcademicCourse(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500 w-full sm:w-72"
                    >
                      {courses.length > 0 ? (
                        courses.map((c: any) => (
                          <option key={c.id} value={c.id.toString()}>{c.name} ({c.code})</option>
                        ))
                      ) : (
                        <option value="1">B.Tech Computer Science (BTECH-CSE)</option>
                      )}
                    </select>
                  </div>

                  {/* Subject Type Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">Filter Type:</span>
                    <select
                      value={academicSubjectTypeFilter}
                      onChange={(e) => setAcademicSubjectTypeFilter(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none"
                    >
                      <option value="">All Types (Theory & Practical)</option>
                      <option value="theory">Theory Only</option>
                      <option value="practical">Practical / Lab Only</option>
                    </select>
                  </div>
                </div>

                {/* Semester Tabs Selector */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => setSelectedAcademicSemester('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedAcademicSemester === 'all'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    All Semesters (1 - 8)
                  </button>

                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <button
                      key={sem}
                      onClick={() => setSelectedAcademicSemester(sem.toString())}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        selectedAcademicSemester === sem.toString()
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span>Semester {sem}</span>
                      {(() => {
                        const count = subjects.filter((s: any) => 
                          (selectedAcademicCourse === 'all' || s.course_id?.toString() === selectedAcademicCourse) &&
                          s.semester?.toString() === sem.toString()
                        ).length;
                        return count > 0 ? (
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                            selectedAcademicSemester === sem.toString() ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {count}
                          </span>
                        ) : null;
                      })()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Semester Summary Metrics */}
              {(() => {
                const currentFilteredSubjects = subjects.filter((s: any) => {
                  const matchCourse = !selectedAcademicCourse || selectedAcademicCourse === 'all' || s.course_id?.toString() === selectedAcademicCourse;
                  const matchSem = !selectedAcademicSemester || selectedAcademicSemester === 'all' || s.semester?.toString() === selectedAcademicSemester;
                  const matchType = !academicSubjectTypeFilter || s.type === academicSubjectTypeFilter;
                  return matchCourse && matchSem && matchType;
                });

                const theoryCount = currentFilteredSubjects.filter((s: any) => s.type === 'theory').length;
                const labCount = currentFilteredSubjects.filter((s: any) => s.type === 'practical').length;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {selectedAcademicSemester === 'all' ? 'Total Subjects in Course' : `Semester ${selectedAcademicSemester} Subjects`}
                        </p>
                        <h4 className="text-2xl font-extrabold text-white mt-1">{currentFilteredSubjects.length}</h4>
                      </div>
                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Theory Subjects</p>
                        <h4 className="text-2xl font-extrabold text-emerald-400 mt-1">{theoryCount}</h4>
                      </div>
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                        <FileText className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Practical / Lab Modules</p>
                        <h4 className="text-2xl font-extrabold text-purple-400 mt-1">{labCount}</h4>
                      </div>
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                        <Layers className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Semester Subjects Grid */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <BookOpenCheck className="w-5 h-5 text-indigo-400" />
                    {selectedAcademicSemester === 'all' ? 'All Course Curriculum Subjects' : `Semester ${selectedAcademicSemester} Subject Syllabus`}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Showing subjects for {courses.find((c: any) => c.id.toString() === selectedAcademicCourse)?.name || 'B.Tech CSE'}
                  </span>
                </div>

                {(() => {
                  const filtered = subjects.filter((s: any) => {
                    const matchCourse = !selectedAcademicCourse || selectedAcademicCourse === 'all' || s.course_id?.toString() === selectedAcademicCourse;
                    const matchSem = !selectedAcademicSemester || selectedAcademicSemester === 'all' || s.semester?.toString() === selectedAcademicSemester;
                    const matchType = !academicSubjectTypeFilter || s.type === academicSubjectTypeFilter;
                    return matchCourse && matchSem && matchType;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl space-y-3">
                        <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-300">No subjects found for Semester {selectedAcademicSemester}</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">Click '+ Add New Subject' to add subjects for this semester.</p>
                        <button
                          onClick={() => setIsAddSubjectOpen(true)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Subject to Semester {selectedAcademicSemester}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map((s: any) => {
                        const allocatedFac = allocations.find((a: any) => a.subject_code === s.code || a.subject_name === s.name);
                        return (
                          <div key={s.id} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-mono font-bold">
                                  {s.code}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md text-[10px] font-semibold">
                                    Sem {s.semester}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                    s.type === 'practical' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    {s.type === 'practical' ? 'Practical / Lab' : 'Theory'}
                                  </span>
                                </div>
                              </div>
                              <h4 className="font-bold text-white text-sm leading-snug">{s.name}</h4>
                              <p className="text-[11px] text-slate-400">{s.course_name || 'B.Tech Computer Science'}</p>
                            </div>

                            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                                <span className="truncate max-w-[140px]">
                                  {allocatedFac ? allocatedFac.faculty_name : 'No Faculty Assigned'}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedSubjectId(s.id.toString());
                                  setIsAddMaterialOpen(true);
                                }}
                                className="text-indigo-400 hover:text-indigo-300 text-[11px] font-bold flex items-center gap-1"
                              >
                                Upload Material →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Study Materials & Timetable Sub-sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Study Materials */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <FileUp className="w-5 h-5 text-indigo-400" /> Uploaded Study Materials & Notes
                    </h3>
                    <button
                      onClick={() => setIsAddMaterialOpen(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Upload Material
                    </button>
                  </div>
                  <div className="space-y-3 text-xs">
                    {studyMaterials.length > 0 ? (
                      studyMaterials.map((m: any) => (
                        <div key={m.id} className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-white">{m.title}</p>
                            <p className="text-slate-400 text-[11px] mt-0.5">{m.description || 'Lecture notes and reference material'}</p>
                            <span className="text-[10px] text-indigo-400 font-medium mt-1 inline-block">{m.subject_name || 'Data Structures'} ({m.course_code || 'CS101'})</span>
                          </div>
                          <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-md text-[10px] font-mono font-bold uppercase shrink-0">
                            {m.file_type || 'PDF'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-center py-6">No study materials uploaded yet.</p>
                    )}
                  </div>
                </div>

                {/* Faculty Subject Allocations */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-400" /> Faculty Subject Allocations
                    </h3>
                    <button
                      onClick={() => setIsReassignFacultyOpen(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" /> Reassign
                    </button>
                  </div>
                  <div className="space-y-3 text-xs">
                    {allocations.length > 0 ? (
                      allocations.map((a: any) => (
                        <div key={a.id} className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-white">{a.faculty_name} <span className="text-slate-500 font-mono text-[10px]">({a.employee_id})</span></p>
                            <span className="text-slate-400 text-[11px]">{a.subject_name} ({a.subject_code})</span>
                          </div>
                          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[10px] font-semibold">
                            {a.section_name || 'Section A'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-center py-6">No faculty allocations recorded.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 4. ATTENDANCE MANAGEMENT */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-400">Filter Date:</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setIsAddLeaveOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Add Leave Record
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-base font-bold text-white">Daily Attendance Breakdown</h3>
                  <div className="space-y-3">
                    {(() => {
                      const groups: Record<string, { total: number; present: number }> = {};
                      attendanceLogs.forEach((l: any) => {
                        const sec = l.section_name || l.course_name || 'CS - Section A';
                        if (!groups[sec]) groups[sec] = { total: 0, present: 0 };
                        groups[sec].total += 1;
                        if (l.status === 'present') groups[sec].present += 1;
                      });
                      const rows = Object.keys(groups).length > 0
                        ? Object.entries(groups).map(([sec, g]) => ({
                            class: sec, total: g.total, present: g.present, pct: Math.round((g.present / g.total) * 100)
                          }))
                        : [
                            { class: 'B.Tech CS (Sem 1)', total: students.length || 2, present: Math.round((students.length || 2) * 0.9), pct: 90 },
                            { class: 'B.Tech ECE (Sem 1)', total: 10, present: 8, pct: 80 }
                          ];
                      return rows.map((row, i) => (
                        <div key={i} className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-white">{row.class}</p>
                            <span className="text-slate-400">{row.present} of {row.total} Present</span>
                          </div>
                          <span className="text-sm font-extrabold text-emerald-400">{row.pct}%</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-base font-bold text-white">Subject-wise Attendance</h3>
                  <div className="space-y-3">
                    {(() => {
                      const subGroups: Record<string, { subject: string; class: string; total: number; present: number }> = {};
                      attendanceLogs.forEach((l: any) => {
                        const subKey = l.subject_name || 'Data Structures';
                        if (!subGroups[subKey]) subGroups[subKey] = { subject: subKey, class: l.section_name || 'Sem 1', total: 0, present: 0 };
                        subGroups[subKey].total += 1;
                        if (l.status === 'present') subGroups[subKey].present += 1;
                      });
                      const rows = Object.keys(subGroups).length > 0
                        ? Object.values(subGroups).map(g => ({
                            subject: g.subject, class: g.class, pct: Math.round((g.present / g.total) * 100)
                          }))
                        : [
                            { subject: 'Data Structures & Algorithms', class: 'CS-Sem 1', pct: 90 },
                            { subject: 'Digital Electronics', class: 'ECE-Sem 1', pct: 82 }
                          ];
                      return rows.map((row, i) => (
                        <div key={i} className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-white">{row.subject}</p>
                            <span className="text-slate-400">{row.class}</span>
                          </div>
                          <span className="text-sm font-extrabold text-indigo-400">{row.pct}%</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Leave Records */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white">Leave Records & Applications</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3 rounded-l-xl">Applicant</th>
                        <th className="p-3">From Date</th>
                        <th className="p-3">To Date</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3 rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {leaveRecords.map((l: any) => (
                        <tr key={l.id}>
                          <td className="p-3 font-semibold text-white">{l.applicant_name || 'Student'}</td>
                          <td className="p-3">{l.start_date}</td>
                          <td className="p-3">{l.end_date}</td>
                          <td className="p-3">{l.reason}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. ACADEMICS */}
          {activeTab === 'academics' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Course Subjects & Study Materials</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsAddSubjectOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <Plus className="w-4 h-4" /> Add Subject
                  </button>
                  <button
                    onClick={() => setIsAddMaterialOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add Course Material
                  </button>
                </div>
              </div>

              {/* Subject List & Materials Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-white">Subjects Catalog</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Code</th>
                          <th className="p-3">Name</th>
                          <th className="p-3">Semester</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {subjects.map((sub: any) => (
                          <tr key={sub.id}>
                            <td className="p-3 font-mono font-bold text-indigo-400">{sub.code}</td>
                            <td className="p-3 font-semibold text-white">{sub.name}</td>
                            <td className="p-3">Semester {sub.semester}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-white">Faculty Subject Allocation</h4>
                  <div className="space-y-3 text-xs">
                    {faculty.map((fac: any) => (
                      <div key={fac.id} className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white">{fac.name}</p>
                          <span className="text-[10px] text-slate-400">{fac.department_name || 'Computer Science'}</span>
                        </div>
                        <button
                          onClick={() => handleOpenReassignModal(fac)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg font-semibold text-[10px]"
                        >
                          Reassign
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timetable Section */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-base font-bold text-white">Weekly Class Timetable Matrix</h4>
                  <select
                    value={timetableSection}
                    onChange={(e) => setTimetableSection(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none"
                  >
                    <option value="1">Section A (CS-Sem 1)</option>
                    <option value="2">Section B (ECE-Sem 1)</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs border-collapse">
                    <thead className="bg-slate-800 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3 border border-slate-800">Day</th>
                        <th className="p-3 border border-slate-800">09:00 - 10:00</th>
                        <th className="p-3 border border-slate-800">10:00 - 11:00</th>
                        <th className="p-3 border border-slate-800">11:00 - 12:00</th>
                        <th className="p-3 border border-slate-800">12:00 - 13:00</th>
                        <th className="p-3 border border-slate-800">13:00 - 14:00</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                        <tr key={day}>
                          <td className="p-3 border border-slate-800 font-bold bg-slate-800/40 text-left text-white">{day}</td>
                          <td className="p-3 border border-slate-800 bg-indigo-500/5 text-indigo-300 font-semibold">CS101 (LHC-101)</td>
                          <td className="p-3 border border-slate-800 bg-indigo-500/5 text-indigo-300 font-semibold">MA101 (LHC-102)</td>
                          <td className="p-3 border border-slate-800 text-slate-500 font-mono">Break</td>
                          <td className="p-3 border border-slate-800 bg-emerald-500/5 text-emerald-300 font-semibold">PH101 (Physics Lab)</td>
                          <td className="p-3 border border-slate-800 bg-purple-500/5 text-purple-300 font-semibold">CS102 (LHC-101)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. EXAMINATIONS & MARKS */}
          {activeTab === 'exams' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Examinations & Result Analysis</h3>
                <button
                  onClick={() => setIsAddExamOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Add Exam Schedule
                </button>
              </div>

              {/* Exam Selection & Enter Marks Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-white">Exams Schedule</h4>
                  <div className="space-y-3 text-xs">
                    {examsList.map((ex: any) => (
                      <div
                        key={ex.id}
                        onClick={() => setSelectedExamId(ex.id.toString())}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selectedExamId === ex.id.toString()
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <p className="font-bold text-sm">{ex.name}</p>
                        <span className="text-[10px] text-slate-400">Date: {ex.date} | Type: {ex.type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" /> Enter Marks Entry Sheet
                      </h4>
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none"
                      >
                        {subjects.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                    </div>

                    <form onSubmit={handleSaveMarks} className="space-y-4">
                      <div className="max-h-[380px] overflow-y-auto custom-scrollbar border border-slate-800/80 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] sticky top-0 backdrop-blur">
                            <tr>
                              <th className="p-3">Student Name</th>
                              <th className="p-3">Roll No</th>
                              <th className="p-3">Theory Marks (100)</th>
                              <th className="p-3">Practical Marks (50)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {examMarksEntries.map((row: any, idx: number) => (
                              <tr key={row.student_id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-3 font-semibold text-white">{row.first_name} {row.last_name}</td>
                                <td className="p-3 font-mono text-indigo-300 font-bold">{row.roll_no}</td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={row.theory_marks || 0}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setExamMarksEntries(prev => {
                                        const next = [...prev];
                                        next[idx].theory_marks = val;
                                        return next;
                                      });
                                    }}
                                    className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-indigo-500 font-mono font-bold"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={row.practical_marks || 0}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setExamMarksEntries(prev => {
                                        const next = [...prev];
                                        next[idx].practical_marks = val;
                                        return next;
                                      });
                                    }}
                                    className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-indigo-500 font-mono font-bold"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Total {examMarksEntries.length} student(s) in evaluation list</span>
                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                        >
                          <CheckCircle className="w-4 h-4" /> Save Marks Sheet
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              {/* Result Analysis Tabs */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
                  <button
                    onClick={() => setResultAnalysisTab('results')}
                    className={`pb-2 border-b-2 transition-all ${
                      resultAnalysisTab === 'results' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400'
                    }`}
                  >
                    Results Overview
                  </button>
                  <button
                    onClick={() => setResultAnalysisTab('gradecard')}
                    className={`pb-2 border-b-2 transition-all ${
                      resultAnalysisTab === 'gradecard' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400'
                    }`}
                  >
                    Grade Card Preview
                  </button>
                  <button
                    onClick={() => setResultAnalysisTab('analysis')}
                    className={`pb-2 border-b-2 transition-all ${
                      resultAnalysisTab === 'analysis' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400'
                    }`}
                  >
                    Overall Pass % & SGPA Stats
                  </button>
                </div>

                {resultAnalysisTab === 'results' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                    <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800">
                      <p className="text-xs text-slate-400">Overall Pass Percentage</p>
                      <h4 className="text-2xl font-bold text-emerald-400 mt-1">{resultAnalysisData?.pass_percentage || 100}%</h4>
                    </div>
                    <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800">
                      <p className="text-xs text-slate-400">Class Average Score</p>
                      <h4 className="text-2xl font-bold text-indigo-400 mt-1">84.5%</h4>
                    </div>
                    <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800">
                      <p className="text-xs text-slate-400">Top Performing Student</p>
                      <h4 className="text-2xl font-bold text-amber-400 mt-1">
                        {resultAnalysisData?.toppers?.[0]?.name || (students.length > 0 ? `${students[0].first_name} ${students[0].last_name}` : 'Alice Johnson')}
                      </h4>
                    </div>
                  </div>
                )}

                {resultAnalysisTab === 'gradecard' && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Student for Grade Card Preview</h5>
                      <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <Printer className="w-3.5 h-3.5" /> Print Marksheet
                      </button>
                    </div>
                    <div className="bg-white text-slate-900 p-6 rounded-xl font-serif text-xs space-y-4">
                      <div className="text-center border-b pb-3 font-sans">
                        <h3 className="text-base font-extrabold text-indigo-950 uppercase tracking-wide">CAMPUS LEDGER INSTITUTE OF TECHNOLOGY</h3>
                        <p className="text-[10px] text-slate-500">Official Semester Examination Grade Card & Marksheet</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 font-sans font-semibold text-xs border-b pb-3">
                        <p>Student Name: <span className="font-bold text-indigo-900">{students[0] ? `${students[0].first_name} ${students[0].last_name}` : 'Alice Johnson'}</span></p>
                        <p>Roll Number: <span className="font-mono">{students[0]?.roll_no || '101'}</span></p>
                        <p>Course: <span>{students[0]?.course_name || 'B.Tech Computer Science'}</span></p>
                        <p>Academic Session: <span>2025-26</span></p>
                      </div>
                      <table className="w-full text-left font-sans text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b text-[11px]">
                            <th className="p-2">Code</th>
                            <th className="p-2">Subject Name</th>
                            <th className="p-2">Theory</th>
                            <th className="p-2">Practical</th>
                            <th className="p-2">Total Obtained</th>
                            <th className="p-2">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700">
                          <tr>
                            <td className="p-2 font-mono font-bold">CS101</td>
                            <td className="p-2">Data Structures & Algorithms</td>
                            <td className="p-2">85 / 100</td>
                            <td className="p-2">42 / 50</td>
                            <td className="p-2 font-bold text-slate-900">127 / 150</td>
                            <td className="p-2 font-bold text-emerald-700">A+</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-mono font-bold">CS102</td>
                            <td className="p-2">Database Management Systems</td>
                            <td className="p-2">78 / 100</td>
                            <td className="p-2">40 / 50</td>
                            <td className="p-2 font-bold text-slate-900">118 / 150</td>
                            <td className="p-2 font-bold text-indigo-700">A</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between font-sans text-xs font-bold text-indigo-950">
                        <span>Overall Aggregate: 81.6%</span>
                        <span>Result Status: PASS</span>
                        <span>SGPA: 8.42</span>
                      </div>
                    </div>
                  </div>
                )}

                {resultAnalysisTab === 'analysis' && (
                  <div className="space-y-4 pt-2">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Class Pass % & Subject-wise Performance Analysis</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2">
                        <p className="text-xs font-bold text-white">Class Top Performers (Rankers)</p>
                        <div className="space-y-2 pt-1 text-xs">
                          {(resultAnalysisData?.toppers?.length > 0 ? resultAnalysisData.toppers : [
                            { name: 'Alice Johnson', roll_no: '101', percentage: 92.5 },
                            { name: 'Karan Mehta', roll_no: '109', percentage: 88.0 },
                            { name: 'Varun Dhawan', roll_no: '117', percentage: 85.4 }
                          ]).map((t: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                              <span className="font-semibold text-white">#{idx+1} {t.name} (Roll: {t.roll_no})</span>
                              <span className="font-bold text-amber-400 font-mono">{Math.round(t.percentage || 85)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2">
                        <p className="text-xs font-bold text-white">Subject Average Score Breakdown</p>
                        <div className="space-y-2 pt-1 text-xs">
                          {(resultAnalysisData?.averages?.length > 0 ? resultAnalysisData.averages : [
                            { subject: 'Data Structures & Algorithms', average: 82.4 },
                            { subject: 'Database Management Systems', average: 79.1 }
                          ]).map((avg: any, idx: number) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-300 font-semibold">{avg.subject}</span>
                                <span className="text-indigo-400 font-bold font-mono">{avg.average} avg</span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1.5">
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, avg.average)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. FEES & LEDGER */}
          {activeTab === 'fees' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-indigo-400" /> Fees & Financial Ledger
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Manage fee structures, collect payments, track student dues, and award scholarships.</p>
                </div>
                <button onClick={() => setIsCollectFeeOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20">
                  <Plus className="w-4 h-4" /> Collect Fee
                </button>
              </div>

              {/* Dynamic Financial Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Collected</p>
                  <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">₹{(feeSummaryData?.total_collected || allFeeCollections.reduce((s: number, c: any) => s + (c.amount_paid || 0), 0)).toLocaleString('en-IN')}</h3>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Outstanding Dues</p>
                  <h3 className="text-2xl font-extrabold text-amber-400 mt-1">₹{(feeSummaryData?.outstanding_dues || 0).toLocaleString('en-IN')}</h3>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Scholarships</p>
                  <h3 className="text-2xl font-extrabold text-indigo-400 mt-1">₹{(feeSummaryData?.total_scholarships || scholarshipsList.reduce((s: number, c: any) => s + (c.amount || 0), 0)).toLocaleString('en-IN')}</h3>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Collection Rate</p>
                  <h3 className="text-2xl font-extrabold text-cyan-400 mt-1">{feeSummaryData?.collection_rate || 0}%</h3>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2"><div className="bg-cyan-400 h-1.5 rounded-full transition-all" style={{ width: `${feeSummaryData?.collection_rate || 0}%` }} /></div>
                </div>
              </div>

              {/* STUDENT FEE LEDGER ACCOUNT STATEMENT VIEWER */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" /> Student Fee Ledger Account Statement
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Inspect running Debit/Credit account ledger & print official fee statement for any student.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedLedgerStudentId}
                      onChange={(e) => handleSelectLedgerStudent(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl outline-none focus:border-indigo-500 font-semibold"
                    >
                      {students.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name} (Roll: {s.roll_no} | {s.course_name || 'Course'})
                        </option>
                      ))}
                    </select>
                    <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20">
                      <Printer className="w-4 h-4" /> Print Ledger
                    </button>
                  </div>
                </div>

                {/* Ledger View Container */}
                {selectedLedgerDues && (
                  <div className="bg-white text-slate-900 p-6 rounded-2xl space-y-5 font-sans">
                    {/* College Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <div>
                        <h3 className="text-base font-extrabold text-indigo-950 uppercase tracking-wide">CAMPUS LEDGER INSTITUTE OF TECHNOLOGY</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Central Accounts Office • Official Student Account Fee Ledger</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 px-2.5 py-1 rounded-lg">
                          OFFICIAL FEE LEDGER
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">{new Date().toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Student Information Bar */}
                    {(() => {
                      const curStudent = students.find(s => s.id.toString() === selectedLedgerStudentId) || students[0];
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs border border-slate-200/80 font-medium">
                          <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Student Name</span><span className="font-bold text-slate-900">{curStudent?.first_name} {curStudent?.last_name}</span></div>
                          <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Roll Number</span><span className="font-mono font-bold text-indigo-900">{curStudent?.roll_no}</span></div>
                          <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Admission No</span><span className="font-mono">{curStudent?.admission_no}</span></div>
                          <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Course / Sem</span><span>{curStudent?.course_name || 'B.Tech CS'} (Sem {curStudent?.semester || 1})</span></div>
                        </div>
                      );
                    })()}

                    {/* Ledger Financial Summary Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Total Fee Charged (Debit)</span>
                        <p className="text-base font-extrabold text-slate-900 mt-0.5 font-mono">₹{(selectedLedgerDues.total_fee || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase">Total Paid (Credit)</span>
                        <p className="text-base font-extrabold text-emerald-700 mt-0.5 font-mono">₹{(selectedLedgerDues.paid || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <span className="text-[10px] font-bold text-amber-800 uppercase">Scholarship (Credit)</span>
                        <p className="text-base font-extrabold text-amber-700 mt-0.5 font-mono">₹{(selectedLedgerDues.scholarship || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className={`p-3 rounded-xl border ${selectedLedgerDues.balance === 0 ? 'bg-emerald-100 border-emerald-300' : 'bg-rose-50 border-rose-200'}`}>
                        <span className="text-[10px] font-bold text-slate-700 uppercase">Closing Dues Balance</span>
                        <p className={`text-base font-extrabold mt-0.5 font-mono ${selectedLedgerDues.balance === 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                          ₹{(selectedLedgerDues.balance || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Ledger Debit / Credit Transactions Table */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Debit / Credit Account Ledger Transactions</h5>
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5">Particulars / Ref</th>
                              <th className="p-2.5 text-right">Debit (+₹)</th>
                              <th className="p-2.5 text-right">Credit (-₹)</th>
                              <th className="p-2.5 text-right">Running Balance (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-800">
                            {/* Row 1: Fee Structure Invoiced (Debit) */}
                            <tr className="bg-slate-50/50">
                              <td className="p-2.5 font-mono text-[11px]">2026-07-01</td>
                              <td className="p-2.5"><span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[9px] uppercase">DEBIT (FEE)</span></td>
                              <td className="p-2.5 font-medium">{selectedLedgerDues.fee_structure?.name || 'Semester Course Fee Invoiced'}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-rose-700">₹{(selectedLedgerDues.total_fee || 0).toLocaleString('en-IN')}</td>
                              <td className="p-2.5 text-right font-mono text-slate-400">—</td>
                              <td className="p-2.5 text-right font-mono font-bold">₹{(selectedLedgerDues.total_fee || 0).toLocaleString('en-IN')}</td>
                            </tr>

                            {/* Row 2: Scholarship Adjusted if any */}
                            {selectedLedgerDues.scholarship > 0 && (
                              <tr className="bg-amber-50/30">
                                <td className="p-2.5 font-mono text-[11px]">2026-07-02</td>
                                <td className="p-2.5"><span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[9px] uppercase">CREDIT (WAIVER)</span></td>
                                <td className="p-2.5 font-medium">Merit Scholarship Fee Waiver Adjusted</td>
                                <td className="p-2.5 text-right font-mono text-slate-400">—</td>
                                <td className="p-2.5 text-right font-mono font-bold text-amber-700">₹{selectedLedgerDues.scholarship.toLocaleString('en-IN')}</td>
                                <td className="p-2.5 text-right font-mono font-bold">₹{(selectedLedgerDues.total_fee - selectedLedgerDues.scholarship).toLocaleString('en-IN')}</td>
                              </tr>
                            )}

                            {/* Payment Receipt Rows */}
                            {selectedLedgerPayments.map((pay: any, idx: number) => {
                              const priorPaid = selectedLedgerPayments.slice(0, idx + 1).reduce((s, p) => s + (p.amount_paid || 0), 0);
                              const runBal = Math.max(0, selectedLedgerDues.total_fee - selectedLedgerDues.scholarship - priorPaid);
                              return (
                                <tr key={pay.id}>
                                  <td className="p-2.5 font-mono text-[11px]">{pay.payment_date}</td>
                                  <td className="p-2.5"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px] uppercase">CREDIT (PAYMENT)</span></td>
                                  <td className="p-2.5">
                                    <p className="font-semibold text-indigo-950">Receipt: {pay.receipt_no}</p>
                                    <p className="text-[10px] text-slate-500">Mode: {pay.payment_mode} {pay.transaction_id ? `(${pay.transaction_id})` : ''}</p>
                                  </td>
                                  <td className="p-2.5 text-right font-mono text-slate-400">—</td>
                                  <td className="p-2.5 text-right font-mono font-bold text-emerald-700">₹{pay.amount_paid?.toLocaleString('en-IN')}</td>
                                  <td className="p-2.5 text-right font-mono font-bold">₹{runBal.toLocaleString('en-IN')}</td>
                                </tr>
                              );
                            })}

                            {selectedLedgerPayments.length === 0 && selectedLedgerDues.scholarship === 0 && (
                              <tr>
                                <td colSpan={6} className="p-4 text-center text-slate-400 font-sans italic">
                                  No payment collections recorded yet for this student.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fee Structures */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-400" /> Fee Structures by Course & Semester</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                      <tr><th className="p-3">Course</th><th className="p-3">Semester</th><th className="p-3">Structure Name</th><th className="p-3">Total Fee</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {feeStructures.map((fs: any) => (
                        <tr key={fs.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-semibold text-white">{fs.course_name || fs.course_code}</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded text-[10px] font-bold border border-indigo-500/20">Sem {fs.semester}</span></td>
                          <td className="p-3">{fs.name}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">₹{fs.total_amount?.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scholarships */}
              {scholarshipsList.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><Award className="w-4 h-4 text-amber-400" /> Scholarships & Fee Waivers</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                        <tr><th className="p-3">Student</th><th className="p-3">Scholarship</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {scholarshipsList.map((s: any) => (
                          <tr key={s.id}>
                            <td className="p-3 font-semibold text-white">{s.first_name} {s.last_name}</td>
                            <td className="p-3">{s.name}</td>
                            <td className="p-3 font-mono font-bold text-amber-400">₹{s.amount?.toLocaleString('en-IN')}</td>
                            <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.adjusted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>{s.adjusted ? '✓ Adjusted' : 'Pending'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment Transactions */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2"><History className="w-4 h-4 text-indigo-400" /> Payment Transaction History</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                      <tr><th className="p-3">Receipt</th><th className="p-3">Student</th><th className="p-3">Date</th><th className="p-3">Amount</th><th className="p-3">Mode</th><th className="p-3">Remarks</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {allFeeCollections.map((col: any) => (
                        <tr key={col.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-indigo-400">{col.receipt_no}</td>
                          <td className="p-3 font-semibold text-white">{col.first_name} {col.last_name}</td>
                          <td className="p-3 font-mono">{col.payment_date}</td>
                          <td className="p-3 font-bold text-emerald-400">₹{col.amount_paid?.toLocaleString('en-IN')}</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-medium">{col.payment_mode}</span></td>
                          <td className="p-3 text-slate-500 text-[10px]">{col.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* EXPENSES & BUDGET */}
          {activeTab === 'expenses' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-amber-400" /> Institutional Expense & Budget Tracker
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Track college expenditures, manage budgets, and monitor spending by category.</p>
                </div>
                <button onClick={() => setIsAddExpenseOpen(true)} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-600/20">
                  <Plus className="w-4 h-4" /> Add Expense
                </button>
              </div>

              {/* Expense Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">This Month</p>
                  <h3 className="text-2xl font-extrabold text-rose-400 mt-1">₹{(expenseSummary?.this_month || 0).toLocaleString('en-IN')}</h3>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">This Year</p>
                  <h3 className="text-2xl font-extrabold text-amber-400 mt-1">₹{(expenseSummary?.this_year || 0).toLocaleString('en-IN')}</h3>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Budget Remaining</p>
                  <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">₹{(expenseSummary?.budget_remaining || 0).toLocaleString('en-IN')}</h3>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pending Approvals</p>
                  <h3 className="text-2xl font-extrabold text-indigo-400 mt-1">{expenseSummary?.pending_count || 0}</h3>
                </div>
              </div>

              {/* Category Breakdown Cards */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white">Expense Category Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {expenseCategories.map((cat: any) => (
                    <div key={cat.id} className="bg-slate-800/60 border border-slate-700/50 p-3 rounded-xl hover:border-slate-600 transition-all cursor-pointer"
                      onClick={() => setExpenseCategoryFilter(expenseCategoryFilter === cat.id.toString() ? '' : cat.id.toString())}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-300 truncate">{cat.name}</span>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      </div>
                      <p className="text-sm font-extrabold text-white">₹{(cat.total_spent || 0).toLocaleString('en-IN')}</p>
                      {cat.budget_allocated > 0 && (
                        <div className="mt-1.5">
                          <div className="w-full bg-slate-700 rounded-full h-1"><div className="h-1 rounded-full transition-all" style={{ width: `${Math.min(100, (cat.total_spent / cat.budget_allocated) * 100)}%`, backgroundColor: cat.color }} /></div>
                          <p className="text-[9px] text-slate-500 mt-0.5">{Math.round((cat.total_spent / cat.budget_allocated) * 100)}% of ₹{cat.budget_allocated.toLocaleString('en-IN')}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Expense Registry Table */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h4 className="text-sm font-bold text-white">Expense Registry</h4>
                  <div className="flex gap-2 flex-wrap">
                    <select value={expenseCategoryFilter} onChange={e => setExpenseCategoryFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-[10px] px-2 py-1.5 rounded-lg">
                      <option value="">All Categories</option>
                      {expenseCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={expenseStatusFilter} onChange={e => setExpenseStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-[10px] px-2 py-1.5 rounded-lg">
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="paid">Paid</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                      <tr><th className="p-3">Date</th><th className="p-3">Title</th><th className="p-3">Category</th><th className="p-3">Amount</th><th className="p-3">Vendor</th><th className="p-3">Mode</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {expensesList
                        .filter((e: any) => !expenseCategoryFilter || e.category_id?.toString() === expenseCategoryFilter)
                        .filter((e: any) => !expenseStatusFilter || e.status === expenseStatusFilter)
                        .map((exp: any) => (
                        <tr key={exp.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-[10px]">{exp.expense_date}</td>
                          <td className="p-3"><p className="font-semibold text-white">{exp.title}</p><p className="text-[9px] text-slate-500">{exp.receipt_no}</p></td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ borderColor: exp.category_color + '40', color: exp.category_color, backgroundColor: exp.category_color + '15' }}>{exp.category_name}</span></td>
                          <td className="p-3 font-mono font-bold text-rose-400">₹{exp.amount?.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-[10px]">{exp.vendor_name || '—'}</td>
                          <td className="p-3 text-[10px]">{exp.payment_mode}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              exp.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              exp.status === 'approved' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              exp.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>{exp.status}</span>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {exp.status === 'pending' && (
                                <>
                                  <button onClick={() => handleApproveExpense(exp.id, 'approved')} className="px-2 py-1 bg-emerald-600/20 text-emerald-400 rounded text-[10px] font-bold hover:bg-emerald-600/30">✓</button>
                                  <button onClick={() => handleApproveExpense(exp.id, 'rejected')} className="px-2 py-1 bg-rose-600/20 text-rose-400 rounded text-[10px] font-bold hover:bg-rose-600/30">✗</button>
                                </>
                              )}
                              {exp.status === 'approved' && (
                                <button onClick={() => handleApproveExpense(exp.id, 'paid')} className="px-2 py-1 bg-indigo-600/20 text-indigo-400 rounded text-[10px] font-bold hover:bg-indigo-600/30">Mark Paid</button>
                              )}
                              <button onClick={() => handleDeleteExpense(exp.id)} className="px-2 py-1 bg-slate-700/50 text-slate-400 rounded text-[10px] hover:bg-rose-600/20 hover:text-rose-400">🗑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 7. LIBRARY MANAGEMENT */}
          {activeTab === 'library' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpenCheck className="w-5 h-5 text-indigo-400" /> College Library Management & Book Issue Registry
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Issue library books to students, track due dates, handle returns, and dispatch fine warning alerts.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={async () => {
                      try {
                        const res: any = await api.post('/library/send-overdue-reminders', {});
                        alert(res.message || 'Overdue warning alerts sent to student portals!');
                      } catch (e: any) {
                        alert(e.message);
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-600/20"
                  >
                    <AlertTriangle className="w-4 h-4" /> Send Overdue Warnings
                  </button>
                  <button
                    onClick={() => setIsAddBookOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    <Plus className="w-4 h-4" /> Add Book
                  </button>
                  <button
                    onClick={handleOpenIssueBookModal}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <Plus className="w-4 h-4" /> Issue Book
                  </button>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button onClick={() => setLibraryViewMode('catalog')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${libraryViewMode === 'catalog' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  📚 Book Catalog ({books.length})
                </button>
                <button onClick={() => setLibraryViewMode('issues')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${libraryViewMode === 'issues' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  📋 Issue Logs ({libraryIssues.length})
                </button>
              </div>

              {/* Library Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Books</p>
                    <h4 className="text-2xl font-extrabold text-white mt-1">{libraryStats?.total_titles || books.length}</h4>
                    <p className="text-[9px] text-slate-500">{libraryStats?.total_copies || 0} total copies</p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400"><BookOpen className="w-5 h-5" /></div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Loans</p>
                    <h4 className="text-2xl font-extrabold text-indigo-400 mt-1">{libraryIssues.filter((i: any) => i.status === 'issued').length}</h4>
                  </div>
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400"><BookOpen className="w-5 h-5" /></div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Overdue Alerts</p>
                    <h4 className="text-2xl font-extrabold text-amber-400 mt-1">{libraryIssues.filter((i: any) => i.is_overdue).length}</h4>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400"><AlertTriangle className="w-5 h-5" /></div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Overdue Fines</p>
                    <h4 className="text-2xl font-extrabold text-rose-400 mt-1">₹{libraryIssues.reduce((acc: number, curr: any) => acc + (curr.estimated_fine || curr.fine_amount || 0), 0)}</h4>
                  </div>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400"><CreditCard className="w-5 h-5" /></div>
                </div>
              </div>

              {/* BOOK CATALOG VIEW */}
              {libraryViewMode === 'catalog' && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <h4 className="text-sm font-bold text-white">📚 Book Inventory Catalog</h4>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Search books..." value={librarySearchQuery} onChange={e => setLibrarySearchQuery(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-lg w-48 focus:border-indigo-500 outline-none" />
                      <select value={libraryCategoryFilter} onChange={e => setLibraryCategoryFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-[10px] px-2 py-1.5 rounded-lg">
                        <option value="">All Categories</option>
                        {[...new Set(books.map((b: any) => b.category))].map((cat: any) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                        <tr><th className="p-3">Title & Author</th><th className="p-3">ISBN</th><th className="p-3">Category</th><th className="p-3">Total</th><th className="p-3">Available</th><th className="p-3">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {books
                          .filter((b: any) => !librarySearchQuery || b.title.toLowerCase().includes(librarySearchQuery.toLowerCase()) || b.author.toLowerCase().includes(librarySearchQuery.toLowerCase()))
                          .filter((b: any) => !libraryCategoryFilter || b.category === libraryCategoryFilter)
                          .map((book: any) => (
                          <tr key={book.id} className="hover:bg-slate-800/40">
                            <td className="p-3"><p className="font-semibold text-white">{book.title}</p><p className="text-[10px] text-slate-500">{book.author}</p></td>
                            <td className="p-3 font-mono text-[10px] text-slate-500">{book.isbn || '—'}</td>
                            <td className="p-3"><span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded text-[10px] font-bold border border-indigo-500/20">{book.category}</span></td>
                            <td className="p-3 font-bold">{book.total_copies}</td>
                            <td className="p-3 font-bold">{book.available_copies}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                book.available_copies === 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                book.available_copies <= 2 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>{book.available_copies === 0 ? 'Out of Stock' : book.available_copies <= 2 ? 'Low Stock' : 'Available'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ISSUE LOGS VIEW */}
              {libraryViewMode === 'issues' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white">Book Issue Logs & Fine Tracking Registry</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Book Title & Author</th>
                        <th className="p-3">Student Name / Roll</th>
                        <th className="p-3">Issue Date</th>
                        <th className="p-3">Return Due Date</th>
                        <th className="p-3">Fine Status</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {libraryIssues.map((iss: any) => (
                        <tr key={iss.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3">
                            <p className="font-bold text-white">{iss.book_title || 'Introduction to Algorithms'}</p>
                            <span className="text-[10px] text-slate-500">{iss.book_author || 'Author'}</span>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-slate-200">{iss.first_name} {iss.last_name}</p>
                            <span className="text-[10px] font-mono text-indigo-400">Roll: {iss.roll_no} (Card: {iss.card_number})</span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono">{iss.issue_date}</span>
                            <span className="text-[10px] text-slate-500 block">({iss.days_issued || 1} days ago)</span>
                          </td>
                          <td className="p-3">
                            <span className={`font-mono font-bold ${iss.is_overdue ? 'text-amber-400' : 'text-slate-300'}`}>
                              {iss.due_date}
                            </span>
                            <span className={`text-[10px] block font-bold ${iss.is_overdue ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {iss.is_overdue ? `🔴 ${iss.days_overdue} Days Overdue` : `${iss.days_remaining} days remaining`}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold">
                            {iss.is_overdue ? (
                              <span className="text-rose-400">₹{iss.estimated_fine} (₹10/day)</span>
                            ) : iss.fine_amount > 0 ? (
                              <span className="text-amber-400">₹{iss.fine_amount} ({iss.fine_paid ? 'Paid' : 'Unpaid'})</span>
                            ) : (
                              <span className="text-slate-500">₹0</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              iss.status === 'returned' 
                                ? 'bg-slate-800 text-slate-400 border border-slate-700' 
                                : iss.is_overdue
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {iss.status === 'returned' ? '✓ Returned' : iss.is_overdue ? 'Overdue' : 'Active Loan'}
                            </span>
                          </td>
                          <td className="p-3">
                            {iss.status !== 'returned' && (
                              <button
                                onClick={() => handleReturnBook(iss.id)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/20"
                              >
                                Return & Settle
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          )}

          {/* 8. COMMUNICATION */}
          {activeTab === 'notices' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Notice Board & Announcements</h3>
                <button
                  onClick={() => setIsComposeNoticeOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Compose Notice
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {notices.map((n: any) => (
                  <div key={n.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-white text-base">{n.title}</h4>
                      <span className="text-[10px] text-slate-400">{n.created_at || 'Just now'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{n.content}</p>
                    <div className="pt-2 flex gap-2">
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px]">Audience: All</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. REPORTS & CERTIFICATES */}
          {activeTab === 'reports' && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white">Student Selection & Document Generation</h3>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedReportStudentId}
                    onChange={(e) => setSelectedReportStudentId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-4 py-2 focus:outline-none w-72"
                  >
                    <option value="">Select Student for Reports...</option>
                    {students.map((s: any) => (
                      <option key={s.id} value={s.id.toString()}>{s.first_name} {s.last_name} (Roll: {s.roll_no})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid of 9 PDF Report Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { type: 'profile', title: 'Student Profile Card', desc: 'Detailed student record and demographics' },
                  { type: 'attendance', title: 'Attendance Report PDF', desc: 'Summary of attendance records' },
                  { type: 'fee', title: 'Fee Statement Report', desc: 'Summary of payments and dues' },
                  { type: 'marksheet', title: 'Semester Marksheet', desc: 'Official marksheet and grades' },
                  { type: 'idcard', title: 'Digital ID Card', desc: 'Student Identity badge' },
                  { type: 'libcard', title: 'Library Card PDF', desc: 'Library membership card' },
                  { type: 'bonafide', title: 'Bonafide Certificate', desc: 'Official student bonafide slip' },
                  { type: 'transfer', title: 'Transfer Certificate', desc: 'TC document for passing out' },
                  { type: 'character', title: 'Character Certificate', desc: 'Good conduct & character certificate' }
                ].map((doc, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                    <div>
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit mb-3">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-white text-sm">{doc.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{doc.desc}</p>
                    </div>
                    <button
                      onClick={() => handleOpenDocumentPreview(doc.type, doc.title)}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-400 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> View / Print PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. SYSTEM BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Database Operations & Checkpoints</h3>
                    <p className="text-xs text-slate-400 mt-1">Manage SQLite database snapshots and restore points.</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.post('/admin/backup', {});
                          alert('Database Backup Created Successfully!');
                          loadDataForTab();
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                    >
                      <Database className="w-4 h-4" /> Trigger Backup Now
                    </button>
                    <button
                      onClick={handleRestoreBackup}
                      className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-amber-600/20"
                    >
                      <RefreshCw className="w-4 h-4" /> Restore Last Backup
                    </button>
                  </div>
                </div>
              </div>

              {/* Audit Logs Table */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white">System Audit & Security Logs</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3 rounded-l-xl">Timestamp</th>
                        <th className="p-3">User</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Target Table</th>
                        <th className="p-3 rounded-r-xl">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {auditLogs.map((log: any) => (
                        <tr key={log.id}>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 font-semibold text-white">{log.user_email || 'System'}</td>
                          <td className="p-3 uppercase text-[10px] font-bold text-indigo-400">{log.user_role || 'admin'}</td>
                          <td className="p-3 font-bold text-emerald-400">{log.action}</td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{log.target_table}</td>
                          <td className="p-3 text-slate-300">{log.details}</td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500">No audit log entries recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 11. ROLES & PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" /> System User Access Matrix
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Manage sub-admin credentials, custom roles, and module access permissions.</p>
                </div>
                <button
                  onClick={() => setIsCreateUserOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Create User Account
                </button>
              </div>

              {/* Role Standard Permissions Legend */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-cyan-950/40 border border-cyan-500/30 p-3.5 rounded-xl space-y-1">
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 font-bold rounded text-[10px] uppercase border border-cyan-500/30">
                    👨‍🏫 Faculty Role
                  </span>
                  <p className="text-[11px] font-semibold text-slate-200 mt-1">Attendance Roll Call, Grading & Materials</p>
                  <p className="text-[9px] text-cyan-300/80">Modules: Overview, Attendance, Study Notes, Exams Marks, Notices, Leaves</p>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl space-y-1">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded text-[10px] uppercase border border-emerald-500/30">
                    🎓 Student Role
                  </span>
                  <p className="text-[11px] font-semibold text-slate-200 mt-1">Personal Attendance, Marks, Dues & Library</p>
                  <p className="text-[9px] text-emerald-300/80">Modules: Overview, Study Notes, Exam Results, Fee Dues, Library, Notices</p>
                </div>

                <div className="bg-amber-950/40 border border-amber-500/30 p-3.5 rounded-xl space-y-1">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded text-[10px] uppercase border border-amber-500/30">
                    👨‍👩‍👧 Parent Role
                  </span>
                  <p className="text-[11px] font-semibold text-slate-200 mt-1">Child Monitoring & Fee Receipts</p>
                  <p className="text-[9px] text-amber-300/80">Modules: Overview, Attendance %, Exam Results, Fee Payments, Notices</p>
                </div>

                <div className="bg-indigo-950/40 border border-indigo-500/30 p-3.5 rounded-xl space-y-1">
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-bold rounded text-[10px] uppercase border border-indigo-500/30">
                    👑 Admin Role
                  </span>
                  <p className="text-[11px] font-semibold text-slate-200 mt-1">Full Central Control & Backups</p>
                  <p className="text-[9px] text-indigo-300/80">Modules: All System Modules (Admissions, Fees, Exams, System Ops)</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3 rounded-l-xl">Email Account</th>
                        <th className="p-3">Assigned Role</th>
                        <th className="p-3">Granted Dashboard Modules</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 rounded-r-xl text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {systemUsers.map((u: any) => {
                        const roleInfo = ROLE_DEFAULT_PERMISSIONS[u.role?.toLowerCase()] || ROLE_DEFAULT_PERMISSIONS['admin'];
                        return (
                          <tr key={u.id} className="hover:bg-slate-800/40">
                            <td className="p-3 font-semibold text-white">
                              {u.email}
                              <span className="block text-[10px] text-slate-500 font-normal">{roleInfo.desc}</span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${roleInfo.badge}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1 max-w-md">
                                {(Array.isArray(u.permissions) ? u.permissions : []).map((p: string) => (
                                  <span key={p} className="px-2 py-0.5 bg-slate-800 text-indigo-300 border border-slate-700 rounded text-[10px] font-mono">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'inactive' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {u.status || 'active'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEditPermsModal(u)}
                                  className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-500/30 transition-all"
                                >
                                  Edit Perms
                                </button>
                                {u.email !== 'admin@college.com' && (
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all border border-rose-500/20"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* SLIDE-OVER DRAWERS FOR ALL FORMS */}

      {/* Add Student Drawer */}
      <Drawer
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        title="Student Admission & Registration"
        subtitle="Enroll a new student into the college management directory"
      >
        <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
          
          {/* Account Credentials */}
          <div className="space-y-3">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Student Account Login</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Student Login Email *</label>
                <input
                  type="email"
                  required
                  placeholder="student@college.com"
                  value={admitForm.email}
                  onChange={(e) => setAdmitForm({ ...admitForm, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Initial Password *</label>
                <input
                  type="text"
                  required
                  value={admitForm.password}
                  onChange={(e) => setAdmitForm({ ...admitForm, password: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>
          </div>

          {/* Personal Details */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Personal Information</h4>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Full Name *</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="First Name"
                  required
                  value={admitForm.first_name}
                  onChange={(e) => setAdmitForm({ ...admitForm, first_name: e.target.value })}
                  className="bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  required
                  value={admitForm.last_name}
                  onChange={(e) => setAdmitForm({ ...admitForm, last_name: e.target.value })}
                  className="bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Admission No *</label>
                <input
                  type="text"
                  required
                  value={admitForm.admission_no}
                  onChange={(e) => setAdmitForm({ ...admitForm, admission_no: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Roll Number *</label>
                <input
                  type="text"
                  required
                  value={admitForm.roll_no}
                  onChange={(e) => setAdmitForm({ ...admitForm, roll_no: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Father's Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Father's Name"
                  value={admitForm.father_name}
                  onChange={(e) => setAdmitForm({ ...admitForm, father_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Mother's Name</label>
                <input
                  type="text"
                  placeholder="Mother's Name"
                  value={admitForm.mother_name}
                  onChange={(e) => setAdmitForm({ ...admitForm, mother_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={admitForm.dob}
                  onChange={(e) => setAdmitForm({ ...admitForm, dob: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Gender *</label>
                <select
                  value={admitForm.gender}
                  onChange={(e) => setAdmitForm({ ...admitForm, gender: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Blood Group</label>
                <input
                  type="text"
                  value={admitForm.blood_group}
                  onChange={(e) => setAdmitForm({ ...admitForm, blood_group: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                <select
                  value={admitForm.category}
                  onChange={(e) => setAdmitForm({ ...admitForm, category: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Aadhaar Card No *</label>
                <input
                  type="text"
                  required
                  placeholder="12-digit Aadhaar Number"
                  value={admitForm.aadhaar}
                  onChange={(e) => setAdmitForm({ ...admitForm, aadhaar: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Contact Details</h4>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Student Mobile Number *</label>
              <input
                type="text"
                required
                placeholder="Mobile number"
                value={admitForm.mobile}
                onChange={(e) => setAdmitForm({ ...admitForm, mobile: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Permanent Address</label>
              <input
                type="text"
                placeholder="Full address"
                value={admitForm.address_permanent}
                onChange={(e) => setAdmitForm({ ...admitForm, address_permanent: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
              />
            </div>
          </div>

          {/* Academic Enrollment */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Academic Enrollment</h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Course</label>
                <select
                  value={admitForm.course_id}
                  onChange={(e) => setAdmitForm({ ...admitForm, course_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  {courses.length > 0 ? (
                    courses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  ) : (
                    <option value="1">B.Tech Computer Science</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Section</label>
                <select
                  value={admitForm.section_id}
                  onChange={(e) => setAdmitForm({ ...admitForm, section_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  {sections.length > 0 ? (
                    sections.map((sec: any) => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))
                  ) : (
                    <option value="1">CSE-A</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Semester</label>
                <select
                  value={admitForm.semester}
                  onChange={(e) => setAdmitForm({ ...admitForm, semester: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Previous Qualification</label>
              <input
                type="text"
                placeholder="e.g. High School - 92%"
                value={admitForm.previous_qualification}
                onChange={(e) => setAdmitForm({ ...admitForm, previous_qualification: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
              />
            </div>
          </div>

          {/* Parents & Guardian Details */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Parents / Guardian Access Account</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Parent / Guardian Name</label>
                <input
                  type="text"
                  placeholder="e.g. Richard Johnson"
                  value={(admitForm as any).parent_name || ''}
                  onChange={(e) => setAdmitForm({ ...admitForm, parent_name: e.target.value } as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Relation</label>
                <select
                  value={(admitForm as any).parent_relation || 'Father'}
                  onChange={(e) => setAdmitForm({ ...admitForm, parent_relation: e.target.value } as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Parent Mobile Number</label>
                <input
                  type="text"
                  placeholder="Parent phone number"
                  value={(admitForm as any).parent_mobile || ''}
                  onChange={(e) => setAdmitForm({ ...admitForm, parent_mobile: e.target.value } as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Parent Login Email</label>
                <input
                  type="email"
                  placeholder="parent@college.com"
                  value={(admitForm as any).parent_email || ''}
                  onChange={(e) => setAdmitForm({ ...admitForm, parent_email: e.target.value } as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>
          </div>

          {/* Document Verification & Submission Checklist */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Document Verification & Submission Checklist</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
              {ALL_STANDARD_DOCS.map((doc) => {
                const isChecked = (admitForm as any).submitted_documents?.includes(doc.type);
                return (
                  <label key={doc.type} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 cursor-pointer border border-slate-700/50 transition-all">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const currentDocs = (admitForm as any).submitted_documents || [];
                        const updatedDocs = e.target.checked
                          ? [...currentDocs, doc.type]
                          : currentDocs.filter((d: string) => d !== doc.type);
                        setAdmitForm({ ...admitForm, submitted_documents: updatedDocs } as any);
                      }}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4"
                    />
                    <span className="text-[11px] font-medium text-slate-200">{doc.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddStudentOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20"
            >
              Admit & Save Student
            </button>
          </div>
        </form>
      </Drawer>

      {/* Edit Student Drawer */}
      <Drawer
        isOpen={isEditStudentOpen}
        onClose={() => setIsEditStudentOpen(false)}
        title="Edit Student Profile"
        subtitle={`Update details for ${editingStudent?.first_name || ''} ${editingStudent?.last_name || ''}`}
      >
        <form onSubmit={handleEditStudentSubmit} className="space-y-4 text-xs">
          <div className="space-y-3">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Personal Information</h4>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Full Name</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="First Name"
                  required
                  value={editStudentForm.first_name}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, first_name: e.target.value })}
                  className="bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  required
                  value={editStudentForm.last_name}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, last_name: e.target.value })}
                  className="bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Roll Number</label>
                <input
                  type="text"
                  required
                  value={editStudentForm.roll_no}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, roll_no: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Account Status</label>
                <select
                  value={editStudentForm.status}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, status: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Father's Name</label>
                <input
                  type="text"
                  value={editStudentForm.father_name}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, father_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Mother's Name</label>
                <input
                  type="text"
                  value={editStudentForm.mother_name}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, mother_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Date of Birth</label>
                <input
                  type="date"
                  value={editStudentForm.dob}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, dob: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Gender</label>
                <select
                  value={editStudentForm.gender}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, gender: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Blood Group</label>
                <input
                  type="text"
                  value={editStudentForm.blood_group}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, blood_group: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                <select
                  value={editStudentForm.category}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, category: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Aadhaar Card No</label>
                <input
                  type="text"
                  value={editStudentForm.aadhaar}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, aadhaar: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Contact Details</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Mobile Number</label>
                <input
                  type="text"
                  value={editStudentForm.mobile}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, mobile: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Student Email</label>
                <input
                  type="email"
                  value={editStudentForm.email}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Permanent Address</label>
              <input
                type="text"
                value={editStudentForm.address_permanent}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, address_permanent: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Current Address</label>
              <input
                type="text"
                value={editStudentForm.address_current}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, address_current: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Parents & Guardian Details</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Primary Guardian / Parent Name</label>
                <input
                  type="text"
                  placeholder="e.g. Richard Johnson"
                  value={editStudentForm.parent_name}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, parent_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Relation</label>
                <select
                  value={editStudentForm.parent_relation}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, parent_relation: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Parent Contact Mobile</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={editStudentForm.parent_mobile}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, parent_mobile: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Parent Login Email</label>
                <input
                  type="email"
                  placeholder="e.g. parent@college.com"
                  value={editStudentForm.parent_email}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, parent_email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Academic Details</h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Course</label>
                <select
                  value={editStudentForm.course_id}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, course_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  {courses.length > 0 ? (
                    courses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  ) : (
                    <option value="1">B.Tech Computer Science</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Section</label>
                <select
                  value={editStudentForm.section_id}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, section_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  {sections.length > 0 ? (
                    sections.map((sec: any) => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))
                  ) : (
                    <option value="1">CSE-A</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Semester</label>
                <select
                  value={editStudentForm.semester}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, semester: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Previous Qualification</label>
              <input
                type="text"
                value={editStudentForm.previous_qualification}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, previous_qualification: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
              />
            </div>
          </div>

          {/* Document Verification & Submission Checklist */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Document Verification & Submission Checklist</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
              {ALL_STANDARD_DOCS.map((doc) => {
                const isChecked = editStudentForm.submitted_documents?.includes(doc.type);
                return (
                  <label key={doc.type} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 cursor-pointer border border-slate-700/50 transition-all">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const currentDocs = editStudentForm.submitted_documents || [];
                        const updatedDocs = e.target.checked
                          ? [...currentDocs, doc.type]
                          : currentDocs.filter((d: string) => d !== doc.type);
                        setEditStudentForm({ ...editStudentForm, submitted_documents: updatedDocs });
                      }}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4"
                    />
                    <span className="text-[11px] font-medium text-slate-200">{doc.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditStudentOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20"
            >
              Save Student Changes
            </button>
          </div>
        </form>
      </Drawer>

      {/* Add Leave Drawer */}
      <Drawer
        isOpen={isAddLeaveOpen}
        onClose={() => setIsAddLeaveOpen(false)}
        title="Add Leave Record"
        subtitle="Submit leave request for student"
      >
        <form onSubmit={handleAddLeave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Select Student</label>
            <select
              value={leaveForm.student_id}
              onChange={(e) => setLeaveForm({ ...leaveForm, student_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            >
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">From Date</label>
              <input
                type="date"
                value={leaveForm.start_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">To Date</label>
              <input
                type="date"
                value={leaveForm.end_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Reason</label>
            <textarea
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsAddLeaveOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">Save Leave</button>
          </div>
        </form>
      </Drawer>

      {/* Add Subject Drawer */}
      <Drawer
        isOpen={isAddSubjectOpen}
        onClose={() => setIsAddSubjectOpen(false)}
        title="Add Subject"
        subtitle="Create a new academic subject"
      >
        <form onSubmit={handleAddSubject} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Subject Name</label>
            <input
              type="text"
              required
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Subject Code</label>
            <input
              type="text"
              required
              value={subjectForm.code}
              onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsAddSubjectOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">Save Subject</button>
          </div>
        </form>
      </Drawer>

      {/* Add Material Drawer */}
      <Drawer
        isOpen={isAddMaterialOpen}
        onClose={() => setIsAddMaterialOpen(false)}
        title="Add Course Material"
        subtitle="Upload or link study notes"
      >
        <form onSubmit={handleAddMaterial} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Title</label>
            <input
              type="text"
              required
              value={materialForm.title}
              onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">File URL / Link</label>
            <input
              type="text"
              required
              value={materialForm.file_path}
              onChange={(e) => setMaterialForm({ ...materialForm, file_path: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsAddMaterialOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">Save Material</button>
          </div>
        </form>
      </Drawer>

      {/* Reassign Faculty Drawer */}
      <Drawer
        isOpen={isReassignFacultyOpen}
        onClose={() => setIsReassignFacultyOpen(false)}
        title="Reassign Faculty Subjects"
        subtitle={`Select subjects for ${selectedFacultyForReassign?.name || 'Faculty'}`}
      >
        <div className="space-y-4 text-xs">
          <div className="space-y-2">
            {subjects.map((sub: any) => (
              <label key={sub.id} className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={facultyAssignedSubjects.includes(sub.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFacultyAssignedSubjects(prev => [...prev, sub.id]);
                    } else {
                      setFacultyAssignedSubjects(prev => prev.filter(id => id !== sub.id));
                    }
                  }}
                  className="rounded text-indigo-600"
                />
                <div>
                  <p className="font-bold text-white">{sub.name}</p>
                  <span className="text-[10px] text-slate-400">Code: {sub.code}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button onClick={() => setIsReassignFacultyOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
            <button onClick={handleSaveFacultyReassign} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">Update Faculty</button>
          </div>
        </div>
      </Drawer>

      {/* Add Exam Drawer */}
      <Drawer
        isOpen={isAddExamOpen}
        onClose={() => setIsAddExamOpen(false)}
        title="Schedule Exam / Test"
        subtitle="Schedule a weekly test, monthly exam, or semester examination"
      >
        <form onSubmit={handleAddExam} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Exam Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Weekly Test 1 - Data Structures"
              value={examForm.name}
              onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Exam Category / Type *</label>
              <select
                value={examForm.type}
                onChange={(e) => setExamForm({ ...examForm, type: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
              >
                <option value="weekly_test">Weekly Test</option>
                <option value="monthly_test">Monthly Assessment</option>
                <option value="unit_test">Unit Test</option>
                <option value="quiz">Surprise Quiz</option>
                <option value="mid_term">Mid-Term Exam</option>
                <option value="pre_final">Pre-Final Exam</option>
                <option value="semester_final">Semester Final</option>
                <option value="practical">Practical / Lab Exam</option>
                <option value="viva">Viva Voice</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Max Marks *</label>
              <input
                type="number"
                required
                min="5"
                max="500"
                value={examForm.max_marks}
                onChange={(e) => setExamForm({ ...examForm, max_marks: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Subject (Optional)</label>
              <select
                value={examForm.subject_id}
                onChange={(e) => setExamForm({ ...examForm, subject_id: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
              >
                <option value="">All Subjects / Combined</option>
                {subjects.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Exam Date *</label>
              <input
                type="date"
                required
                value={examForm.date}
                onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsAddExamOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20">Schedule Exam</button>
          </div>
        </form>
      </Drawer>

      {/* Collect Fee Drawer */}
      <Drawer
        isOpen={isCollectFeeOpen}
        onClose={() => setIsCollectFeeOpen(false)}
        title="Collect Fee Payment"
        subtitle="Record fee collection & generate receipt"
      >
        <form onSubmit={handleCollectFeeSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1.5 font-bold uppercase text-[10px]">Select Student *</label>
            <select
              required
              value={feeForm.student_id}
              onChange={(e) => handleStudentSelectForFee(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
            >
              <option value="">Choose Student from Roster...</option>
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} (Roll: {s.roll_no} | {s.course_name || 'Course'})
                </option>
              ))}
            </select>
          </div>

          {/* Student Dues Record Summary Box */}
          {studentDues && (
            <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <span className="font-bold text-white text-xs">Fee Ledger Summary</span>
                <span className="text-[10px] text-indigo-400 font-mono font-bold">{studentDues.fee_structure?.name || 'Semester Fee'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-900/60 p-2.5 rounded-lg">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Total Course Fee</span>
                  <span className="font-bold text-white font-mono text-xs">₹{(studentDues.total_fee || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Total Paid So Far</span>
                  <span className="font-bold text-emerald-400 font-mono text-xs">₹{(studentDues.paid || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Scholarship Adjusted</span>
                  <span className="font-bold text-amber-400 font-mono text-xs">₹{(studentDues.scholarship || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-indigo-950/60 border border-indigo-500/30 p-2.5 rounded-lg">
                  <span className="text-indigo-300 block text-[9px] uppercase font-bold">Remaining Dues Balance</span>
                  <span className="font-extrabold text-amber-300 font-mono text-sm">₹{(studentDues.balance || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Status Banner */}
              {studentDues.balance === 0 ? (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-[11px] font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>✓ All fee dues for this student are fully cleared!</span>
                </div>
              ) : (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Maximum payable balance remaining: <strong>₹{studentDues.balance.toLocaleString('en-IN')}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Overpayment Validation Banner */}
          {studentDues && studentDues.balance > 0 && parseFloat(feeForm.amount_paid || '0') > studentDues.balance && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold">⚠️ Overpayment Error!</p>
                <p className="text-[11px] mt-0.5">Amount ₹{parseFloat(feeForm.amount_paid).toLocaleString('en-IN')} exceeds remaining dues balance ₹{studentDues.balance.toLocaleString('en-IN')}. Please enter an amount up to ₹{studentDues.balance.toLocaleString('en-IN')}.</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Amount to Collect (₹) *</label>
            <input
              type="number"
              required
              min="1"
              max={studentDues ? studentDues.balance : undefined}
              disabled={studentDues?.balance === 0}
              value={feeForm.amount_paid}
              onChange={(e) => setFeeForm({ ...feeForm, amount_paid: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 font-extrabold text-sm focus:border-indigo-500 outline-none"
              placeholder="Enter payment amount..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Payment Mode *</label>
              <select
                value={feeForm.payment_mode}
                onChange={(e) => setFeeForm({ ...feeForm, payment_mode: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
              >
                {['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Debit/Credit Card', 'Online Gateway'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Transaction / Ref ID</label>
              <input
                type="text"
                value={feeForm.transaction_id}
                onChange={(e) => setFeeForm({ ...feeForm, transaction_id: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
                placeholder="TXN-987654"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Remarks / Notes</label>
            <input
              type="text"
              value={feeForm.remarks}
              onChange={(e) => setFeeForm({ ...feeForm, remarks: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
              placeholder="e.g. 1st Installment Paid"
            />
          </div>

          {/* Past Payment Installments History Timeline */}
          {selectedStudentPayments.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/60 p-3.5 rounded-xl space-y-2">
              <h5 className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-400" /> Past Installments Payment History ({selectedStudentPayments.length})
              </h5>
              <div className="max-h-36 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-900/60 text-slate-400 uppercase">
                    <tr>
                      <th className="p-2">Receipt</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Amount</th>
                      <th className="p-2">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {selectedStudentPayments.map((p: any) => (
                      <tr key={p.id}>
                        <td className="p-2 font-mono font-bold text-indigo-400">{p.receipt_no}</td>
                        <td className="p-2 font-mono">{p.payment_date}</td>
                        <td className="p-2 font-bold text-emerald-400">₹{p.amount_paid?.toLocaleString('en-IN')}</td>
                        <td className="p-2">{p.payment_mode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsCollectFeeOpen(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700">Cancel</button>
            <button
              type="submit"
              disabled={studentDues?.balance === 0 || (studentDues && parseFloat(feeForm.amount_paid || '0') > studentDues.balance)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
            >
              <CheckCircle className="w-4 h-4" /> Confirm Payment & Receipt
            </button>
          </div>
        </form>
      </Drawer>

      {/* Add Book Drawer */}
      <Drawer
        isOpen={isAddBookOpen}
        onClose={() => setIsAddBookOpen(false)}
        title="Add New Book to Library"
        subtitle="Add a new book entry to the library catalog"
      >
        <form onSubmit={handleAddBookSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Book Title *</label>
            <input type="text" required value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none" placeholder="e.g. Data Structures and Algorithms" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Author *</label>
            <input type="text" required value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none" placeholder="e.g. Thomas H. Cormen" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">ISBN</label>
              <input type="text" value={bookForm.isbn} onChange={e => setBookForm({...bookForm, isbn: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none" placeholder="978-0-262-03384-8" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Total Copies *</label>
              <input type="number" required min="1" value={bookForm.total_copies} onChange={e => setBookForm({...bookForm, total_copies: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Category *</label>
            <select value={bookForm.category} onChange={e => setBookForm({...bookForm, category: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none">
              {['Computer Science', 'Mathematics', 'Physics', 'Electronics', 'Literature', 'Management', 'Economics', 'History', 'General', 'Reference'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all">
            Add Book to Library
          </button>
        </form>
      </Drawer>

      {/* Add Expense Drawer */}
      <Drawer
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title="Record New Expense"
        subtitle="Add a new institutional expense entry"
      >
        <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Category *</label>
            <select required value={expenseForm.category_id} onChange={e => setExpenseForm({...expenseForm, category_id: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none">
              {expenseCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Expense Title *</label>
            <input type="text" required value={expenseForm.title} onChange={e => setExpenseForm({...expenseForm, title: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none" placeholder="e.g. Lab Computers Purchase" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Description</label>
            <textarea value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none" rows={2} placeholder="Brief description of expense..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Amount (₹) *</label>
              <input type="number" required min="1" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none" placeholder="25000" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Expense Date *</label>
              <input type="date" required value={expenseForm.expense_date} onChange={e => setExpenseForm({...expenseForm, expense_date: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Payment Mode</label>
              <select value={expenseForm.payment_mode} onChange={e => setExpenseForm({...expenseForm, payment_mode: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none">
                {['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Other'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Receipt/Invoice No</label>
              <input type="text" value={expenseForm.receipt_no} onChange={e => setExpenseForm({...expenseForm, receipt_no: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none" placeholder="INV-2026-001" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Vendor / Supplier Name</label>
            <input type="text" value={expenseForm.vendor_name} onChange={e => setExpenseForm({...expenseForm, vendor_name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none" placeholder="e.g. Dell Technologies" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Remarks</label>
            <input type="text" value={expenseForm.remarks} onChange={e => setExpenseForm({...expenseForm, remarks: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none" placeholder="Any additional notes..." />
          </div>
          <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-amber-600/20 transition-all">
            Record Expense
          </button>
        </form>
      </Drawer>

      {/* Issue Book Drawer */}
      <Drawer
        isOpen={isIssueBookOpen}
        onClose={() => setIsIssueBookOpen(false)}
        title="Issue Library Book"
        subtitle="Issue a book loan to a student with return due date"
      >
        <form onSubmit={handleIssueBookSubmit} className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-400 font-semibold">Select Book(s) to Issue *</label>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30">
                {issueForm.book_ids?.length || 0} Book(s) Selected
              </span>
            </div>
            
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 bg-slate-800/40 p-2 rounded-xl border border-slate-800">
              {books.map((b: any) => {
                const isSelected = issueForm.book_ids?.includes(b.id.toString());
                return (
                  <label 
                    key={b.id} 
                    className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all text-xs ${
                      isSelected 
                        ? 'bg-indigo-600/20 border-indigo-500/80 text-white' 
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const idStr = b.id.toString();
                          const currentIds = issueForm.book_ids || [];
                          const updatedIds = e.target.checked
                            ? [...currentIds, idStr]
                            : currentIds.filter(id => id !== idStr);
                          setIssueForm({ ...issueForm, book_ids: updatedIds, book_id: updatedIds[0] || '' });
                        }}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4"
                      />
                      <div>
                        <span className="font-bold block leading-snug">{b.title}</span>
                        <span className="text-[10px] text-slate-400">Author: {b.author}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      b.available_copies > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {b.available_copies} available
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Select Student *</label>
            <select
              value={issueForm.student_id}
              onChange={(e) => setIssueForm({ ...issueForm, student_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 font-medium"
            >
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name} (Roll: {s.roll_no || s.admission_no})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Quick Loan Duration Preset</label>
              <select
                value={issueForm.loan_days || '14'}
                onChange={(e) => {
                  const days = parseInt(e.target.value, 10);
                  if (!isNaN(days)) {
                    const newDueDate = new Date();
                    newDueDate.setDate(newDueDate.getDate() + days);
                    const year = newDueDate.getFullYear();
                    const month = String(newDueDate.getMonth() + 1).padStart(2, '0');
                    const day = String(newDueDate.getDate()).padStart(2, '0');
                    setIssueForm({ ...issueForm, loan_days: e.target.value, due_date: `${year}-${month}-${day}` });
                  }
                }}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
              >
                <option value="14">14 Days (Standard 2 Weeks)</option>
                <option value="7">7 Days (1 Week)</option>
                <option value="21">21 Days (3 Weeks)</option>
                <option value="30">30 Days (1 Month)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Expected Return Due Date *</label>
              <input
                type="date"
                required
                value={issueForm.due_date}
                onChange={(e) => setIssueForm({ ...issueForm, due_date: e.target.value })}
                className="w-full bg-slate-800 border border-indigo-500/50 text-white rounded-xl p-2.5 font-mono font-bold"
              />
            </div>
          </div>

          {/* Book Loan Summary Box */}
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-800 space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span>📅 Issue Date: <strong className="text-white font-mono">{issueForm.issue_date}</strong></span>
              <span>⏰ Return Due Date: <strong className="text-indigo-400 font-mono font-bold">{issueForm.due_date}</strong></span>
            </div>
            <p className="text-[10px] text-amber-400 font-medium">
              💡 Note: If the student does not return the book by <strong className="text-white">{issueForm.due_date}</strong>, a fine of ₹10 per day will automatically apply and overdue alert notifications will be sent to the student portal.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsIssueBookOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20">
              Confirm & Issue Book
            </button>
          </div>
        </form>
      </Drawer>

      {/* Compose Notice Drawer */}
      <Drawer
        isOpen={isComposeNoticeOpen}
        onClose={() => setIsComposeNoticeOpen(false)}
        title="Compose Notice Announcement"
        subtitle="Publish notice to board and dispatch notifications"
      >
        <form onSubmit={handleComposeNoticeSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Notice Title</label>
            <input
              type="text"
              required
              value={noticeForm.title}
              onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Message Content</label>
            <textarea
              required
              rows={4}
              value={noticeForm.content}
              onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsComposeNoticeOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">Send Notice</button>
          </div>
        </form>
      </Drawer>

      {/* Document PDF Preview Modal */}
      {selectedDocumentPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 max-w-2xl w-full p-8 rounded-3xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">{selectedDocumentPreview.title}</h3>
              <button
                onClick={() => setSelectedDocumentPreview(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-white text-slate-900 rounded-2xl space-y-4 font-serif">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold uppercase tracking-wider text-indigo-900">Campus Ledger Institute of Technology</h2>
                <p className="text-xs text-slate-600 font-sans mt-1">Official Academic & Institutional Document</p>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <p className="leading-relaxed">
                  {selectedDocumentPreview.data?.text || `This is an official ${selectedDocumentPreview.title} issued for student ${selectedDocumentPreview.data?.student?.first_name || 'Enrolled Student'} (${selectedDocumentPreview.data?.student?.roll_no || 'Roll No 101'}). All details are verified.`}
                </p>
              </div>

              <div className="pt-8 flex justify-between items-end font-sans text-[10px] text-slate-500">
                <div>Date: {new Date().toLocaleDateString()}</div>
                <div className="text-center border-t border-slate-400 pt-1 w-36 font-bold text-slate-800">Registrar Signature</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print PDF Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL 360-DEGREE STUDENT PROFILE INSPECTOR MODAL */}
      {selectedStudentForProfile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 max-w-3xl w-full p-8 rounded-3xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-5">
              <div className="flex items-center gap-4">
                <img 
                  src={selectedStudentForProfile.photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-lg shadow-indigo-500/20" 
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-white">{selectedStudentForProfile.first_name} {selectedStudentForProfile.last_name}</h3>
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase">
                      {selectedStudentForProfile.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                    <span>Roll No: <strong className="text-white font-mono">{selectedStudentForProfile.roll_no}</strong></span>
                    <span>•</span>
                    <span>Admission No: <strong className="text-white font-mono">{selectedStudentForProfile.admission_no}</strong></span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedStudentForProfile(null);
                  setStudentFullDetails(null);
                }} 
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* Personal Details */}
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Personal Information
                </h4>
                <div className="space-y-2 text-slate-300">
                  <p><span className="text-slate-500 font-semibold">Father's Name:</span> <strong className="text-white">{selectedStudentForProfile.father_name}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Mother's Name:</span> <strong className="text-white">{selectedStudentForProfile.mother_name || 'N/A'}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Date of Birth:</span> <strong className="text-white">{selectedStudentForProfile.dob}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Gender & Category:</span> <strong className="text-white">{selectedStudentForProfile.gender} ({selectedStudentForProfile.category})</strong></p>
                  <p><span className="text-slate-500 font-semibold">Blood Group:</span> <strong className="text-red-400 font-bold">{selectedStudentForProfile.blood_group || 'O+'}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Aadhaar Card:</span> <strong className="text-white font-mono">{selectedStudentForProfile.aadhaar || 'Verified Encryption'}</strong></p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Contact & Guardian Details
                </h4>
                <div className="space-y-2 text-slate-300">
                  <p><span className="text-slate-500 font-semibold">Student Email:</span> <strong className="text-white font-mono">{selectedStudentForProfile.email}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Student Mobile:</span> <strong className="text-white font-mono">{selectedStudentForProfile.mobile}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Guardian / Parent:</span> <strong className="text-white">{selectedStudentForProfile.parent_name || selectedStudentForProfile.father_name} ({selectedStudentForProfile.parent_relation || 'Father'})</strong></p>
                  {selectedStudentForProfile.parent_mobile && (
                    <p><span className="text-slate-500 font-semibold">Parent Contact:</span> <strong className="text-white font-mono">{selectedStudentForProfile.parent_mobile}</strong></p>
                  )}
                  {selectedStudentForProfile.parent_email && (
                    <p><span className="text-slate-500 font-semibold">Parent Email:</span> <strong className="text-white font-mono">{selectedStudentForProfile.parent_email}</strong></p>
                  )}
                  <p><span className="text-slate-500 font-semibold">Permanent Address:</span> <strong className="text-white">{selectedStudentForProfile.address_permanent}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Current Address:</span> <strong className="text-white">{selectedStudentForProfile.address_current || selectedStudentForProfile.address_permanent}</strong></p>
                </div>
              </div>

              {/* Academic Roster */}
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Academic Record
                </h4>
                <div className="space-y-2 text-slate-300">
                  <p><span className="text-slate-500 font-semibold">Course:</span> <strong className="text-white">{selectedStudentForProfile.course_name || 'B.Tech Computer Science'}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Section / Branch:</span> <strong className="text-white">{selectedStudentForProfile.section_name || 'CSE-A'}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Current Semester:</span> <strong className="text-indigo-400 font-bold">Semester {selectedStudentForProfile.semester}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Academic Session:</span> <strong className="text-white">{selectedStudentForProfile.session_name || '2025-26'}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Admission Date:</span> <strong className="text-white">{selectedStudentForProfile.admission_date}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Previous Qualification:</span> <strong className="text-white">{selectedStudentForProfile.previous_qualification || 'High School'}</strong></p>
                  
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-500 font-semibold text-[11px] block mb-1.5">Enrolled Semester {selectedStudentForProfile.semester} Subjects:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {subjects
                        .filter((sub: any) => 
                          (sub.course_id === selectedStudentForProfile.course_id || !sub.course_id || sub.course_id === 1) && 
                          sub.semester === selectedStudentForProfile.semester
                        )
                        .map((sub: any) => (
                          <span key={sub.id} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md text-[10px] font-medium">
                            {sub.code}: {sub.name}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Ledger & Dues */}
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Financial Balance & Ledger
                </h4>
                <div className="space-y-2 text-slate-300">
                  <p><span className="text-slate-500 font-semibold">Total Fee:</span> <strong className="text-white font-bold">₹{studentFullDetails?.dues?.total_fee || 45000}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Amount Paid:</span> <strong className="text-emerald-400 font-bold">₹{studentFullDetails?.dues?.paid || 25000}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Scholarship Support:</span> <strong className="text-indigo-400 font-bold">₹{studentFullDetails?.dues?.scholarship || 10000}</strong></p>
                  <p><span className="text-slate-500 font-semibold">Outstanding Dues:</span> <strong className="text-amber-400 font-extrabold text-sm">₹{studentFullDetails?.dues?.balance || 10000}</strong></p>
                </div>
              </div>

              {/* Document Verification Checklist */}
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800 space-y-3 col-span-1 md:col-span-2">
                <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5" /> Admission Documents & Verification Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {ALL_STANDARD_DOCS.map((doc) => {
                    const docObj = (selectedStudentForProfile.documents || []).find((d: any) => d.doc_type === doc.type);
                    const isSubmitted = docObj ? docObj.is_submitted === 1 : ['10th_marksheet', '12th_marksheet', 'aadhaar_card', 'passport_photo'].includes(doc.type);
                    return (
                      <div key={doc.type} className={`p-3 rounded-xl border flex items-center justify-between ${
                        isSubmitted ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-amber-950/20 border-amber-500/30'
                      }`}>
                        <div>
                          <p className="font-semibold text-slate-200 text-[11px]">{doc.name}</p>
                          <span className={`text-[10px] font-bold uppercase mt-0.5 inline-block ${
                            isSubmitted ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {isSubmitted ? '✓ Submitted & Verified' : '⚠ Pending Collection'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Library Borrowing History & Fine Ledger */}
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800 space-y-3 col-span-1 md:col-span-2">
                <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <BookOpenCheck className="w-3.5 h-3.5" /> Library Borrowing History & Overdue Fines
                </h4>
                {(() => {
                  const studIssues = libraryIssues.filter((i: any) => 
                    i.roll_no === selectedStudentForProfile.roll_no || 
                    i.first_name === selectedStudentForProfile.first_name
                  );

                  if (studIssues.length === 0) {
                    return <p className="text-slate-500 text-xs">No active or past library book loans recorded for this student.</p>;
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                          <tr>
                            <th className="p-2">Book Title</th>
                            <th className="p-2">Issue Date</th>
                            <th className="p-2">Due Date</th>
                            <th className="p-2">Loan Status</th>
                            <th className="p-2">Fine Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {studIssues.map((iss: any) => (
                            <tr key={iss.id}>
                              <td className="p-2 font-semibold text-white">{iss.book_title}</td>
                              <td className="p-2 font-mono">{iss.issue_date}</td>
                              <td className="p-2 font-mono">{iss.due_date}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  iss.status === 'returned' ? 'bg-slate-800 text-slate-400' : iss.is_overdue ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                                }`}>
                                  {iss.status === 'returned' ? 'Returned' : iss.is_overdue ? `Overdue (${iss.days_overdue}d)` : 'Active'}
                                </span>
                              </td>
                              <td className="p-2 font-mono font-bold text-amber-400">₹{iss.estimated_fine || iss.fine_amount || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Print / Actions footer */}
            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => handleOpenEditStudent(selectedStudentForProfile)}
                className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-amber-600/20"
              >
                <Edit className="w-4 h-4" /> Edit Student Details
              </button>
              <button
                onClick={() => {
                  setSelectedReportStudentId(selectedStudentForProfile.id.toString());
                  setActiveTab('reports');
                  setSelectedStudentForProfile(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <FileText className="w-4 h-4" /> Generate Official PDF Certificates
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Drawer: Create User Account */}
      <Drawer
        isOpen={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
        title="Create Sub-Admin / Staff Account"
        subtitle="Provision user credentials and assign role-based module permissions"
      >
        <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">User Email Address *</label>
            <input
              type="email"
              required
              placeholder="e.g. staff@college.com"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Password *</label>
            <input
              type="password"
              required
              placeholder="Enter account password"
              value={newUserForm.password}
              onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Select User Role *</label>
            <select
              value={newUserForm.role}
              onChange={(e) => {
                const r = e.target.value;
                const defaultPerms = ROLE_DEFAULT_PERMISSIONS[r]?.perms || ROLE_DEFAULT_PERMISSIONS['admin'].perms;
                setNewUserForm({ ...newUserForm, role: r, permissions: defaultPerms });
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500 font-bold"
            >
              <option value="admin">Administrator / Sub-Admin</option>
              <option value="faculty">Faculty Teacher</option>
              <option value="student">Student</option>
              <option value="parent">Parent / Guardian</option>
              <option value="superadmin">Super Admin</option>
            </select>
            <p className="text-[10px] text-indigo-400 mt-1 italic">
              {ROLE_DEFAULT_PERMISSIONS[newUserForm.role]?.desc}
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">Quick Role Presets</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setNewUserForm({ ...newUserForm, role: 'faculty', permissions: ROLE_DEFAULT_PERMISSIONS['faculty'].perms })}
                className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-bold"
              >
                ⚡ Faculty Presets
              </button>
              <button
                type="button"
                onClick={() => setNewUserForm({ ...newUserForm, role: 'student', permissions: ROLE_DEFAULT_PERMISSIONS['student'].perms })}
                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold"
              >
                ⚡ Student Presets
              </button>
              <button
                type="button"
                onClick={() => setNewUserForm({ ...newUserForm, role: 'parent', permissions: ROLE_DEFAULT_PERMISSIONS['parent'].perms })}
                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold"
              >
                ⚡ Parent Presets
              </button>
              <button
                type="button"
                onClick={() => setNewUserForm({ ...newUserForm, role: 'admin', permissions: ROLE_DEFAULT_PERMISSIONS['admin'].perms })}
                className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold"
              >
                ⚡ Full Admin Access
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-2 font-semibold">Dashboard Module Permissions ({newUserForm.permissions.length} Granted)</label>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-2 bg-slate-800/40 rounded-xl border border-slate-800">
              {AVAILABLE_MODULES.map((mod) => (
                <label key={mod.id} className="flex items-center gap-2 text-slate-300 cursor-pointer hover:bg-slate-800/60 p-1.5 rounded-lg transition-all">
                  <input
                    type="checkbox"
                    checked={newUserForm.permissions.includes(mod.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewUserForm({ ...newUserForm, permissions: [...newUserForm.permissions, mod.id] });
                      } else {
                        setNewUserForm({ ...newUserForm, permissions: newUserForm.permissions.filter(p => p !== mod.id) });
                      }
                    }}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <p className="font-semibold text-white">{mod.label}</p>
                    <p className="text-[10px] text-slate-500">{mod.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateUserOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20"
            >
              Create User Account
            </button>
          </div>
        </form>
      </Drawer>

      {/* Drawer: Edit User Permissions */}
      <Drawer
        isOpen={isEditPermsOpen}
        onClose={() => setIsEditPermsOpen(false)}
        title="Edit User Permissions"
        subtitle={`Update access matrix for ${selectedUserForPerms?.email || 'User'}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">User Role</label>
            <select
              value={userPermsForm.role}
              onChange={(e) => {
                const r = e.target.value;
                const defaultPerms = ROLE_DEFAULT_PERMISSIONS[r]?.perms || ROLE_DEFAULT_PERMISSIONS['admin'].perms;
                setUserPermsForm({ ...userPermsForm, role: r, permissions: defaultPerms });
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500 font-bold"
            >
              <option value="admin">Administrator</option>
              <option value="faculty">Faculty Teacher</option>
              <option value="student">Student</option>
              <option value="parent">Parent / Guardian</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <p className="text-[10px] text-indigo-400 mt-1 italic">
              {ROLE_DEFAULT_PERMISSIONS[userPermsForm.role]?.desc}
            </p>
          </div>

          {/* Account Password Viewer & Reset Controls */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-slate-300 font-bold text-xs flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" /> Account Password (Visible to Admin)
              </label>
              <button
                type="button"
                onClick={() => setUserPermsForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                {userPermsForm.showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {userPermsForm.showPassword ? 'Hide Text' : 'Show Text'}
              </button>
            </div>

            <div className="relative">
              <input
                type={userPermsForm.showPassword ? 'text' : 'password'}
                value={userPermsForm.new_password || ''}
                onChange={(e) => setUserPermsForm({ ...userPermsForm, new_password: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold rounded-xl p-2.5 outline-none focus:border-indigo-500 pr-10 text-sm"
                placeholder="Enter or reset user password..."
              />
              <button
                type="button"
                onClick={() => setUserPermsForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {userPermsForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick Password Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setUserPermsForm({ ...userPermsForm, new_password: 'Faculty@123' })}
                className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px] font-mono"
              >
                Reset: "Faculty@123"
              </button>
              <button
                type="button"
                onClick={() => setUserPermsForm({ ...userPermsForm, new_password: 'Student@123' })}
                className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px] font-mono"
              >
                Reset: "Student@123"
              </button>
              <button
                type="button"
                onClick={() => setUserPermsForm({ ...userPermsForm, new_password: 'College@2026' })}
                className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px] font-mono"
              >
                Reset: "College@2026"
              </button>
            </div>

            {/* Shareable Credentials Card */}
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300 space-y-1 font-mono">
              <p className="font-bold text-amber-200 uppercase text-[9px]">📋 Shareable Login Credentials:</p>
              <p>Email: <span className="text-white font-bold">{selectedUserForPerms?.email}</span></p>
              <p>Password: <span className="text-amber-300 font-extrabold">{userPermsForm.new_password || '(Not Changed)'}</span></p>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Account Status</label>
            <select
              value={userPermsForm.status}
              onChange={(e) => setUserPermsForm({ ...userPermsForm, status: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">Quick Role Presets</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setUserPermsForm({ ...userPermsForm, role: 'faculty', permissions: ROLE_DEFAULT_PERMISSIONS['faculty'].perms })}
                className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-bold"
              >
                ⚡ Faculty Presets
              </button>
              <button
                type="button"
                onClick={() => setUserPermsForm({ ...userPermsForm, role: 'student', permissions: ROLE_DEFAULT_PERMISSIONS['student'].perms })}
                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold"
              >
                ⚡ Student Presets
              </button>
              <button
                type="button"
                onClick={() => setUserPermsForm({ ...userPermsForm, role: 'parent', permissions: ROLE_DEFAULT_PERMISSIONS['parent'].perms })}
                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold"
              >
                ⚡ Parent Presets
              </button>
              <button
                type="button"
                onClick={() => setUserPermsForm({ ...userPermsForm, role: 'admin', permissions: ROLE_DEFAULT_PERMISSIONS['admin'].perms })}
                className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold"
              >
                ⚡ Full Admin Access
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-2 font-semibold">Allowed Dashboard Modules ({userPermsForm.permissions.length} Granted)</label>
            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar p-2 bg-slate-800/40 rounded-xl border border-slate-800">
              {AVAILABLE_MODULES.map((mod) => (
                <label key={mod.id} className="flex items-center gap-2 text-slate-300 cursor-pointer hover:bg-slate-800/60 p-1.5 rounded-lg transition-all">
                  <input
                    type="checkbox"
                    checked={userPermsForm.permissions.includes(mod.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUserPermsForm({ ...userPermsForm, permissions: [...userPermsForm.permissions, mod.id] });
                      } else {
                        setUserPermsForm({ ...userPermsForm, permissions: userPermsForm.permissions.filter(p => p !== mod.id) });
                      }
                    }}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <p className="font-semibold text-white">{mod.label}</p>
                    <p className="text-[10px] text-slate-500">{mod.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditPermsOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveUserPerms}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20"
            >
              Save Permissions
            </button>
          </div>
        </div>
      </Drawer>

      {/* PDF Document & Certificate Preview Drawer */}
      <Drawer
        isOpen={!!selectedDocumentPreview}
        onClose={() => setSelectedDocumentPreview(null)}
        title={selectedDocumentPreview?.title || 'Document Preview'}
        subtitle={`Official document for ${selectedDocumentPreview?.data?.student?.first_name || 'Student'} ${selectedDocumentPreview?.data?.student?.last_name || ''}`}
      >
        {selectedDocumentPreview && (
          <div className="space-y-4 text-xs font-sans">
            <div className="flex justify-end">
              <button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Printer className="w-4 h-4" /> Print / Download PDF
              </button>
            </div>

            {/* Official Printable Sheet Container */}
            <div className="bg-white text-slate-900 p-8 rounded-2xl space-y-6 font-serif border border-slate-200 shadow-xl">
              {/* Header */}
              <div className="text-center border-b-2 border-indigo-900 pb-4 space-y-1 font-sans">
                <div className="flex justify-center mb-2">
                  <div className="p-3 bg-indigo-900 text-white rounded-2xl">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                </div>
                <h2 className="text-lg font-extrabold text-indigo-950 uppercase tracking-wide">CAMPUS LEDGER INSTITUTE OF TECHNOLOGY</h2>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Affiliated to State Technical University • Approved by AICTE</p>
                <p className="text-[9px] text-slate-500 font-mono">Ref No: CLIT/DOC/2026/0894 • Issue Date: {new Date().toLocaleDateString('en-IN')}</p>
              </div>

              {/* Student Demographics Bar */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans font-semibold text-xs text-slate-800">
                <p>Student Name: <span className="font-bold text-indigo-950">{selectedDocumentPreview.data.student.first_name} {selectedDocumentPreview.data.student.last_name}</span></p>
                <p>Roll Number: <span className="font-mono text-indigo-900">{selectedDocumentPreview.data.student.roll_no}</span></p>
                <p>Course: <span>{selectedDocumentPreview.data.student.course_name || 'B.Tech CS'}</span></p>
                <p>Admission No: <span className="font-mono">{selectedDocumentPreview.data.student.admission_no}</span></p>
              </div>

              {/* Certificate Text / Document View */}
              {['bonafide', 'transfer', 'character'].includes(selectedDocumentPreview.type) && (
                <div className="space-y-6 pt-2">
                  <h3 className="text-center text-sm font-extrabold text-indigo-950 uppercase tracking-wider underline">
                    {selectedDocumentPreview.title}
                  </h3>
                  <p className="text-xs text-slate-800 leading-relaxed text-justify px-2 whitespace-pre-wrap font-serif">
                    {selectedDocumentPreview.data.content}
                  </p>
                  <div className="pt-12 flex justify-between items-end text-center font-sans text-xs">
                    <div>
                      <p className="font-mono text-[10px] text-slate-400">Verified by Accounts</p>
                      <p className="font-bold text-slate-800 pt-6">Section Officer</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-indigo-600 font-bold">[ OFFICIAL SEALS ]</p>
                      <p className="font-extrabold text-indigo-950 pt-6">Registrar / Principal</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Digital ID Card Template */}
              {selectedDocumentPreview.type === 'idcard' && (
                <div className="max-w-xs mx-auto bg-gradient-to-b from-indigo-900 to-slate-900 text-white p-5 rounded-2xl space-y-3 text-center font-sans shadow-2xl border border-indigo-500/40">
                  <img src={selectedDocumentPreview.data.student.photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} className="w-20 h-20 rounded-2xl mx-auto object-cover border-2 border-indigo-400" />
                  <div>
                    <h4 className="font-bold text-base">{selectedDocumentPreview.data.student.first_name} {selectedDocumentPreview.data.student.last_name}</h4>
                    <p className="text-[10px] text-indigo-300 font-semibold">{selectedDocumentPreview.data.student.course_name || 'B.Tech CS'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 font-mono">
                    <p>Roll: {selectedDocumentPreview.data.student.roll_no}</p>
                    <p>Blood: {selectedDocumentPreview.data.student.blood_group || 'O+'}</p>
                    <p className="col-span-2">Mobile: {selectedDocumentPreview.data.student.mobile}</p>
                  </div>
                  <p className="text-[9px] text-indigo-300 tracking-widest uppercase">Valid till June 2029</p>
                </div>
              )}

              {/* Library Card PDF Template */}
              {selectedDocumentPreview.type === 'libcard' && (
                <div className="bg-slate-50 border border-slate-300 p-6 rounded-2xl space-y-4 font-sans text-xs">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h4 className="font-extrabold text-indigo-950 text-sm">CENTRAL LIBRARY MEMBERSHIP CARD</h4>
                      <p className="text-[10px] text-slate-500">Campus Ledger Institute of Technology</p>
                    </div>
                    <span className="font-mono font-bold text-indigo-900 bg-indigo-100 px-3 py-1 rounded-lg">LIB-2026-0001</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p>Member: <strong>{selectedDocumentPreview.data.student.first_name} {selectedDocumentPreview.data.student.last_name}</strong></p>
                    <p>Roll No: <strong>{selectedDocumentPreview.data.student.roll_no}</strong></p>
                    <p>Max Books Allowed: <strong>3 Books</strong></p>
                    <p>Standard Loan Period: <strong>14 Days</strong></p>
                  </div>
                </div>
              )}

              {/* Student Profile Card Template */}
              {selectedDocumentPreview.type === 'profile' && (
                <div className="space-y-4 font-sans text-xs">
                  <h4 className="font-bold text-indigo-950 text-sm border-b pb-2 uppercase">Complete Student Academic & Demographic Dossier</h4>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p>Father's Name: <strong>{selectedDocumentPreview.data.student.father_name || 'N/A'}</strong></p>
                    <p>Mother's Name: <strong>{selectedDocumentPreview.data.student.mother_name || 'N/A'}</strong></p>
                    <p>Category: <strong>{selectedDocumentPreview.data.student.category || 'General'}</strong></p>
                    <p>Gender: <strong>{selectedDocumentPreview.data.student.gender || 'Male'}</strong></p>
                    <p>Mobile: <strong>{selectedDocumentPreview.data.student.mobile}</strong></p>
                    <p>Email: <strong>{selectedDocumentPreview.data.student.email}</strong></p>
                    <p className="col-span-2">Permanent Address: <strong>{selectedDocumentPreview.data.student.address_permanent}</strong></p>
                  </div>
                </div>
              )}

              {/* Attendance & Fee Statement & Marksheet Templates */}
              {['attendance', 'fee', 'marksheet'].includes(selectedDocumentPreview.type) && (
                <div className="space-y-4 font-sans text-xs">
                  <h4 className="font-bold text-indigo-950 text-sm border-b pb-2 uppercase">{selectedDocumentPreview.title} Summary</h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    {selectedDocumentPreview.type === 'attendance' && (
                      <div className="grid grid-cols-3 gap-2 text-center font-bold">
                        <div className="p-2 bg-white rounded border"><p className="text-[10px] text-slate-500">Classes Attended</p><p className="text-emerald-600 text-lg">111</p></div>
                        <div className="p-2 bg-white rounded border"><p className="text-[10px] text-slate-500">Total Held</p><p className="text-slate-900 text-lg">120</p></div>
                        <div className="p-2 bg-white rounded border"><p className="text-[10px] text-slate-500">Attendance %</p><p className="text-indigo-600 text-lg">92.5%</p></div>
                      </div>
                    )}
                    {selectedDocumentPreview.type === 'fee' && (
                      <div className="grid grid-cols-3 gap-2 text-center font-bold">
                        <div className="p-2 bg-white rounded border"><p className="text-[10px] text-slate-500">Total Fee</p><p className="text-slate-900 text-base">₹{(selectedDocumentPreview.data.extraData?.total_fee || 85000).toLocaleString('en-IN')}</p></div>
                        <div className="p-2 bg-white rounded border"><p className="text-[10px] text-slate-500">Paid Amount</p><p className="text-emerald-600 text-base">₹{(selectedDocumentPreview.data.extraData?.paid || 30000).toLocaleString('en-IN')}</p></div>
                        <div className="p-2 bg-white rounded border"><p className="text-[10px] text-slate-500">Dues Balance</p><p className="text-amber-600 text-base">₹{(selectedDocumentPreview.data.extraData?.balance || 55000).toLocaleString('en-IN')}</p></div>
                      </div>
                    )}
                    {selectedDocumentPreview.type === 'marksheet' && (
                      <div className="p-3 bg-white rounded border space-y-2">
                        <p className="font-bold text-slate-900">Data Structures & Algorithms: 85/100 (Grade A+)</p>
                        <p className="font-bold text-slate-900">Database Management Systems: 78/100 (Grade A)</p>
                        <p className="font-extrabold text-indigo-900 pt-2 border-t">SGPA: 8.42 | Result: PASS</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

    </div>
  );
};
