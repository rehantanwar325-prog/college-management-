import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Drawer } from './Drawer';
import { 
  User, BookOpen, Calendar, Award, CreditCard, Clipboard, Bell,
  Sparkles, Download, FileText, CheckCircle2, 
  Send, History, Landmark, Printer, Clock, Upload, FileCheck, GraduationCap, X, CheckSquare, AlertTriangle, BookOpenCheck, Sun, Moon, Menu
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { profile, logout, theme, toggleTheme } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'study' | 'marks' | 'fees' | 'library' | 'leaves' | 'notices'>('overview');
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const studId = profile?.student_id || profile?.id || 1;
  const sectionId = profile?.section_id || 1;

  // States
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [marksheet, setMarksheet] = useState<any>(null);
  const [feeSummary, setFeeSummary] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [booksIssued, setBooksIssued] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [allExamsHistory, setAllExamsHistory] = useState<any[]>([]);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('Today');

  // Forms
  const [newLeave, setNewLeave] = useState({
    faculty_name: 'Dr. Ramesh Sharma (HOD - CSE)',
    category: 'Medical / Sick Leave',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    emergency_contact: '',
    reason: ''
  });
  const [submitForm, setSubmitForm] = useState({ assignment_id: '1', file_path: 'https://example.com/solution.c' });
  const [payForm, setPayForm] = useState({ amount_paid: '10000', payment_mode: 'Debit/Credit Card', card_number: '4111222233334444' });

  // Drawers / Modals
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const stud = await api.get(`/students/${studId}`);
      setStudentDetails(stud);

      const tt = await api.get(`/academics/timetable?section_id=${sectionId}`);
      setTimetable(tt || []);

      const fees = await api.get(`/fees/dues/${studId}`);
      setFeeSummary(fees);

      const pays = await api.get(`/fees/payments?student_id=${studId}`);
      setPayments(pays || []);

      const loans = await api.get(`/library/issues?student_id=${studId}`);
      setBooksIssued(loans || []);

      try {
        const facs = await api.get('/faculty');
        setFacultyList(facs || []);
      } catch(e) {}

      try {
        const nots = await api.get('/communications/notices');
        setNotices(nots || []);
      } catch(e) {}
      
      try {
        const exList = await api.get('/exams');
        setAllExamsHistory(exList || []);
      } catch(e) {}
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDataForTab = async () => {
    try {
      if (activeTab === 'study') {
        const mat = await api.get(`/study/materials?section_id=${sectionId}`);
        setMaterials(mat || []);
        const assign = await api.get(`/study/assignments?section_id=${sectionId}`);
        setAssignments(assign || []);
        const subs = await api.get('/study/submissions');
        setSubmissions(subs || []);
      } else if (activeTab === 'marks') {
        const marks = await api.get(`/exams/marksheet/${studId}`);
        setMarksheet(marks);
        const exList = await api.get('/exams');
        setAllExamsHistory(exList || []);
      } else if (activeTab === 'leaves') {
        const lvs = await api.get('/attendance/leaves');
        setLeaves(lvs || []);
        const facs = await api.get('/faculty');
        setFacultyList(facs || []);
      } else if (activeTab === 'notices') {
        const nots = await api.get('/communications/notices');
        setNotices(nots || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [profile]);

  useEffect(() => {
    loadDataForTab();
  }, [activeTab]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeave.reason.trim()) {
      alert('Please enter the reason for your leave application.');
      return;
    }

    const formalLetterText = `Addressed To: ${newLeave.faculty_name}\nCategory: ${newLeave.category}\nEmergency Contact: ${newLeave.emergency_contact || (studentDetails?.mobile || 'N/A')}\n\nFormal Application Statement:\nRespected Sir/Madam,\n${newLeave.reason}`;

    try {
      await api.post('/attendance/leaves', {
        start_date: newLeave.start_date,
        end_date: newLeave.end_date,
        reason: formalLetterText
      });
      setNewLeave({
        faculty_name: facultyList[0]?.name ? `${facultyList[0].name} (${facultyList[0].designation || 'Faculty'})` : 'Dr. Ramesh Sharma (HOD - CSE)',
        category: 'Medical / Sick Leave',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        emergency_contact: '',
        reason: ''
      });
      alert('Official Formal Leave Application submitted to Faculty!');
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/study/submissions', submitForm);
      alert('Assignment solution uploaded!');
      setIsSubmitOpen(false);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePayFeeOnline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/fees/pay-online', {
        student_id: studId,
        amount_paid: parseFloat(payForm.amount_paid),
        payment_mode: payForm.payment_mode,
        card_number: payForm.card_number
      });
      alert(`SUCCESS: Payment completed! Receipt: ${res.receipt_no}`);
      setIsPayOpen(false);
      loadStudentData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-transform duration-300 md:static md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-white">Campus Ledger</h1>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase">Student Portal</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: 'overview', label: 'Student Profile', icon: User },
            { id: 'study', label: 'Study & Assignments', icon: BookOpen },
            { id: 'marks', label: 'Marks & Examinations', icon: Award },
            { id: 'fees', label: 'Fees & Pay Dues', icon: CreditCard },
            { id: 'library', label: 'Library Loans', icon: BookOpenCheck },
            { id: 'notices', label: 'Notices & Board', icon: Bell },
            { id: 'leaves', label: 'Apply Leave', icon: Calendar }
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setIsMobileMenuOpen(false); }}
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
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/60 p-3 rounded-xl mb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-xs">
              ST
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white">{studentDetails ? `${studentDetails.first_name} ${studentDetails.last_name}` : 'Student Portal'}</p>
              <p className="text-[10px] text-slate-400 truncate">{profile?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-xs font-medium">
            Logout Portal
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
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
            <h2 className="text-sm md:text-lg font-bold text-white capitalize truncate">{activeTab.replace('_', ' ')} Space</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0"
              title="Toggle Light / Dark Mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 text-indigo-400 shrink-0" />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light Mode ☀️' : 'Dark Mode 🌙'}</span>
            </button>
            <span className="hidden sm:inline-flex text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full shrink-0">
              Student Access Active
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Profile Hero Card & Quick Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6">
                  <img src={studentDetails?.photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500 shadow-lg shadow-indigo-500/20" />
                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h3 className="text-2xl font-extrabold text-white">{studentDetails?.first_name || 'Alice'} {studentDetails?.last_name || 'Johnson'}</h3>
                      <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold">Active Student</span>
                    </div>
                    <p className="text-xs text-indigo-300 font-semibold">{studentDetails?.course_name || 'B.Tech Computer Science'} • Semester {studentDetails?.semester || 1}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
                      <div><span className="text-slate-500 block text-[9px] uppercase font-bold">Roll No</span><span className="text-white font-mono font-bold">{studentDetails?.roll_no || '101'}</span></div>
                      <div><span className="text-slate-500 block text-[9px] uppercase font-bold">Admission No</span><span className="text-white font-mono">{studentDetails?.admission_no || 'ADM-2026-001'}</span></div>
                      <div><span className="text-slate-500 block text-[9px] uppercase font-bold">Mobile</span><span className="text-white font-mono">{studentDetails?.mobile || '9876543210'}</span></div>
                    </div>
                  </div>
                </div>

                {/* Attendance Percentage Card */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Overall</p>
                      <h3 className="text-3xl font-extrabold text-emerald-400 mt-1">92.5%</h3>
                      <p className="text-[10px] text-emerald-300 font-semibold mt-1">✓ Above 75% Criteria (Eligible for Exams)</p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                      <FileCheck className="w-7 h-7" />
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 mt-4">
                    <div className="bg-emerald-400 h-2 rounded-full transition-all" style={{ width: '92.5%' }} />
                  </div>
                </div>
              </div>

              {/* Today's Schedule & Day-wise Filter */}
              {(() => {
                const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

                const mockWeeklyGrid: Record<string, Array<{ time: string; subject: string; code: string; room: string; faculty: string; type: 'lecture' | 'practical' }>> = {
                  Monday: [
                    { time: '09:00 - 10:00', subject: 'Programming in C', code: 'CS101', room: 'LHC-101', faculty: 'Dr. Ramesh Sharma', type: 'lecture' },
                    { time: '10:00 - 11:00', subject: 'Engineering Mathematics I', code: 'MATH101', room: 'LHC-102', faculty: 'Prof. Priya Verma', type: 'lecture' },
                    { time: '11:00 - 12:00', subject: 'Digital Logic Design', code: 'CS102', room: 'LHC-103', faculty: 'Prof. Amit Patel', type: 'lecture' },
                    { time: '02:00 - 04:00', subject: 'C Programming Lab', code: 'CS101P', room: 'Lab-3', faculty: 'Dr. Ramesh Sharma', type: 'practical' },
                  ],
                  Tuesday: [
                    { time: '09:00 - 10:00', subject: 'Data Structures & Algorithms', code: 'CS201', room: 'LHC-101', faculty: 'Dr. Ramesh Sharma', type: 'lecture' },
                    { time: '10:00 - 11:00', subject: 'Object Oriented C++', code: 'CS202', room: 'LHC-102', faculty: 'Prof. Priya Verma', type: 'lecture' },
                    { time: '11:00 - 12:00', subject: 'Basic Electrical Engg', code: 'EE201', room: 'LHC-104', faculty: 'Prof. Vikas Gupta', type: 'lecture' },
                    { time: '02:00 - 04:00', subject: 'Data Structures Lab', code: 'CS202P', room: 'Lab-2', faculty: 'Dr. Ramesh Sharma', type: 'practical' },
                  ],
                  Wednesday: [
                    { time: '09:00 - 10:00', subject: 'Discrete Mathematics', code: 'CS301', room: 'LHC-101', faculty: 'Prof. Priya Verma', type: 'lecture' },
                    { time: '10:00 - 11:00', subject: 'Database Management (DBMS)', code: 'CS302', room: 'LHC-102', faculty: 'Prof. Amit Patel', type: 'lecture' },
                    { time: '11:00 - 12:00', subject: 'Computer Architecture', code: 'CS303', room: 'LHC-103', faculty: 'Prof. Sunita Rao', type: 'lecture' },
                    { time: '02:00 - 04:00', subject: 'DBMS Laboratory', code: 'CS302P', room: 'Lab-1', faculty: 'Prof. Amit Patel', type: 'practical' },
                  ],
                  Thursday: [
                    { time: '09:00 - 10:00', subject: 'Programming in C', code: 'CS101', room: 'LHC-101', faculty: 'Dr. Ramesh Sharma', type: 'lecture' },
                    { time: '10:00 - 11:00', subject: 'Engineering Mathematics I', code: 'MATH101', room: 'LHC-102', faculty: 'Prof. Priya Verma', type: 'lecture' },
                    { time: '11:00 - 12:00', subject: 'Software Engineering', code: 'CS304', room: 'LHC-105', faculty: 'Prof. Vikas Gupta', type: 'lecture' },
                    { time: '02:00 - 04:00', subject: 'Programming Lab', code: 'CS101P', room: 'Lab-3', faculty: 'Dr. Ramesh Sharma', type: 'practical' },
                  ],
                  Friday: [
                    { time: '09:00 - 10:00', subject: 'Data Structures & Algorithms', code: 'CS201', room: 'LHC-101', faculty: 'Dr. Ramesh Sharma', type: 'lecture' },
                    { time: '10:00 - 11:00', subject: 'Database Management (DBMS)', code: 'CS302', room: 'LHC-102', faculty: 'Prof. Amit Patel', type: 'lecture' },
                    { time: '11:00 - 12:00', subject: 'Digital Logic Design', code: 'CS102', room: 'LHC-103', faculty: 'Prof. Sunita Rao', type: 'lecture' },
                    { time: '02:00 - 04:00', subject: 'Hardware & Logic Lab', code: 'CS102P', room: 'Lab-4', faculty: 'Prof. Amit Patel', type: 'practical' },
                  ],
                  Saturday: [
                    { time: '09:00 - 11:00', subject: 'Technical Seminar & Coding Contest', code: 'SEM101', room: 'Auditorium', faculty: 'Dr. Ramesh Sharma', type: 'lecture' },
                    { time: '11:00 - 01:00', subject: 'Project Doubt & Mentorship Session', code: 'PRJ101', room: 'LHC-101', faculty: 'Prof. Priya Verma', type: 'practical' },
                  ]
                };

                const targetDayForClasses = selectedDayFilter === 'Today' ? (daysList.includes(currentDayName) ? currentDayName : 'Friday') : selectedDayFilter;
                const todayClasses = mockWeeklyGrid[targetDayForClasses] || [];

                return (
                  <>
                    {/* Today's Live Class Schedule Card */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-400" /> Today's Scheduled Lectures ({targetDayForClasses})
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Active schedule for <span className="text-amber-300 font-semibold">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Today ({currentDayName})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        {todayClasses.map((cls, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 transition-all ${
                              cls.type === 'practical'
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                                : 'bg-indigo-950/20 border-indigo-500/30 text-indigo-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-amber-300 text-[11px]">{cls.time}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                cls.type === 'practical' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-indigo-300'
                              }`}>
                                {cls.type}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-bold text-white text-sm">{cls.subject}</h4>
                              <p className="text-[10px] text-slate-400 font-mono">Code: {cls.code}</p>
                            </div>

                            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 space-y-0.5">
                              <p>👨‍🏫 Faculty: <span className="font-semibold text-white">{cls.faculty}</span></p>
                              <p>🏫 Room / Lab: <span className="font-mono font-bold text-amber-300">{cls.room}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Weekly Class Timetable Matrix with Day Filter */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                        <div>
                          <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-400" /> Weekly Class Timetable (Mon - Sat)
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">Filter by day or view complete weekly schedule grid</p>
                        </div>

                        {/* Day Filter Buttons */}
                        <div className="flex flex-wrap gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                          <button
                            type="button"
                            onClick={() => setSelectedDayFilter('Today')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              selectedDayFilter === 'Today' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            ⭐ Today ({currentDayName})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDayFilter('All')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              selectedDayFilter === 'All' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            All Days
                          </button>
                          {daysList.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setSelectedDayFilter(d)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                selectedDayFilter === d ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Timetable Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-800 text-slate-400 uppercase text-[10px]">
                            <tr>
                              <th className="p-3 border border-slate-800 w-32">Day</th>
                              <th className="p-3 border border-slate-800">09:00 - 10:00</th>
                              <th className="p-3 border border-slate-800">10:00 - 11:00</th>
                              <th className="p-3 border border-slate-800">11:00 - 12:00</th>
                              <th className="p-3 border border-slate-800">02:00 - 04:00 (Practical Lab)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {daysList
                              .filter((d) => selectedDayFilter === 'All' || selectedDayFilter === 'Today' || selectedDayFilter === d)
                              .map((day) => {
                                const isTodayRow = day === currentDayName;
                                const slots = mockWeeklyGrid[day] || [];

                                return (
                                  <tr key={day} className={isTodayRow ? 'bg-indigo-950/40 border-y-2 border-indigo-500/50' : 'hover:bg-slate-800/30'}>
                                    <td className="p-3 border border-slate-800 font-bold text-white bg-slate-800/50">
                                      <div className="flex items-center gap-1.5">
                                        <span>{day}</span>
                                        {isTodayRow && (
                                          <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded text-[9px] font-extrabold tracking-wider uppercase shadow">
                                            ⭐ TODAY
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    {slots.map((s, idx) => (
                                      <td key={idx} className="p-3 border border-slate-800">
                                        <div className="space-y-1">
                                          <p className="font-bold text-white text-xs">{s.subject}</p>
                                          <p className="text-[10px] text-indigo-300 font-mono">{s.code} • <span className="text-amber-300">{s.room}</span></p>
                                          <p className="text-[10px] text-slate-400">👨‍🏫 {s.faculty}</p>
                                        </div>
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* STUDY */}
          {activeTab === 'study' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">Course Notes & Assignments</h3>
                <button
                  onClick={() => setIsSubmitOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  + Submit Homework Solution
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white">Study Materials</h4>
                <div className="space-y-3 text-xs">
                  {materials.map((m: any) => (
                    <div key={m.id} className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white text-sm">{m.title}</p>
                        <span className="text-slate-400">{m.description || 'Lecture Notes'}</span>
                      </div>
                      <a href={m.file_path} target="_blank" rel="noreferrer" className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg font-bold">Download</a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MARKS */}
          {activeTab === 'marks' && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-white">Semester Marksheet Report</h3>
                  <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print Marksheet
                  </button>
                </div>

                <div className="p-6 bg-white text-slate-900 rounded-2xl space-y-4 font-serif text-xs">
                  <div className="text-center border-b pb-3">
                    <h2 className="text-lg font-bold text-indigo-900">CAMPUS LEDGER INSTITUTE OF TECHNOLOGY</h2>
                    <p className="text-[10px] text-slate-500 font-sans">Official Grade Card Marksheet</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-sans font-semibold">
                    <p>Student: {marksheet?.student?.first_name || 'Alice'} {marksheet?.student?.last_name || 'Johnson'}</p>
                    <p>Roll No: {marksheet?.student?.roll_no || '101'}</p>
                    <p>Course: {marksheet?.student?.course_name || 'B.Tech CS'}</p>
                    <p>Semester: {marksheet?.student?.semester || 1}</p>
                  </div>

                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b font-bold">
                        <th className="p-2">Code</th>
                        <th className="p-2">Subject</th>
                        <th className="p-2">Theory</th>
                        <th className="p-2">Practical</th>
                        <th className="p-2">Total Marks</th>
                        <th className="p-2">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(marksheet?.results || [
                        { subject_code: 'CS101', subject_name: 'Data Structures', theory_marks: 85, practical_marks: 0, total_obtained: 85, grade: 'A' },
                        { subject_code: 'CS102', subject_name: 'Database Systems', theory_marks: 80, practical_marks: 0, total_obtained: 80, grade: 'A' }
                      ]).map((r: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2 font-mono font-bold">{r.subject_code}</td>
                          <td className="p-2">{r.subject_name}</td>
                          <td className="p-2">{r.theory_marks || 0}</td>
                          <td className="p-2">{r.practical_marks || 0}</td>
                          <td className="p-2 font-bold">{r.total_obtained}</td>
                          <td className="p-2 font-bold text-indigo-700">{r.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Weekly & Monthly Test History Timeline */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" /> Weekly & Monthly Test Performance History
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Test Title</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Max Marks</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {allExamsHistory.map((ex: any) => (
                        <tr key={ex.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-semibold text-white">{ex.name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              ex.type.includes('weekly') ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                              ex.type.includes('monthly') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}>
                              {ex.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400">{ex.subject_name || 'All Subjects'}</td>
                          <td className="p-3 font-mono">{ex.date}</td>
                          <td className="p-3 font-bold font-mono text-emerald-400">{ex.max_marks || 100} Marks</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold border border-emerald-500/20">Scheduled / Evaluated</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* FEES */}
          {activeTab === 'fees' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">Fees Ledger & Online Payment</h3>
                <button onClick={() => setIsPayOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold">
                  Pay Dues Online Now
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Total Fee</p>
                  <h3 className="text-2xl font-bold text-white mt-1">₹{feeSummary?.total_fee ?? 0}</h3>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Paid Amount</p>
                  <h3 className="text-2xl font-bold text-emerald-400 mt-1">₹{feeSummary?.paid ?? 0}</h3>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Outstanding Dues</p>
                  <h3 className="text-2xl font-bold text-amber-400 mt-1">₹{feeSummary?.balance ?? 0}</h3>
                </div>
              </div>
            </div>
          )}

          {/* LIBRARY & ISSUED BOOKS */}
          {activeTab === 'library' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpenCheck className="w-5 h-5 text-indigo-400" /> My Library Issued Books & Loan History
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Track your borrowed college library books, due dates, and fine alerts.</p>
                </div>
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-bold font-mono">
                  {booksIssued.filter((b: any) => b.status === 'issued').length} Active Loan(s)
                </span>
              </div>

              {/* Overdue Warning Alert Banner if any overdue book */}
              {booksIssued.some((b: any) => b.is_overdue) && (
                <div className="bg-amber-950/50 border border-amber-500/40 p-5 rounded-2xl flex items-center gap-4 text-amber-200 shadow-xl shadow-amber-950/40 animate-pulse">
                  <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400 shrink-0">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      ⚠️ OVERDUE BOOK ALERT: Return Due Date Passed!
                    </h4>
                    <p className="text-xs text-amber-300 mt-1 leading-relaxed">
                      You have borrowed book(s) past the return due date. Please return them to the college library immediately to avoid accumulating daily overdue fines (₹10/day)!
                    </p>
                  </div>
                </div>
              )}

              {/* Books List Grid / Table */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white tracking-tight">Issued Books Directory</h4>
                
                {booksIssued.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl space-y-2">
                    <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">No books currently issued to your library account.</p>
                    <p className="text-[11px] text-slate-500">Visit the college central library with your Library Card to borrow books.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {booksIssued.map((item: any) => (
                      <div key={item.id} className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        item.is_overdue 
                          ? 'bg-amber-950/20 border-amber-500/40' 
                          : item.status === 'returned'
                          ? 'bg-slate-800/30 border-slate-800/80 opacity-75'
                          : 'bg-slate-800/50 border-slate-800'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-mono font-bold">
                              Card: {item.card_number || 'LIB-CARD'}
                            </span>
                            <h4 className="font-bold text-white text-sm mt-1.5 leading-snug">{item.book_title || 'Library Book'}</h4>
                            <p className="text-[11px] text-slate-400">Author: {item.book_author || 'Standard Author'}</p>
                          </div>
                          
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                            item.status === 'returned'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : item.is_overdue
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {item.status === 'returned' 
                              ? '✓ Returned' 
                              : item.is_overdue 
                              ? `🔴 Overdue (${item.days_overdue} Days)` 
                              : 'Active Loan'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px]">
                          <div>
                            <span className="text-slate-500 font-semibold block text-[10px]">Issue Date:</span>
                            <span className="font-mono text-slate-200 font-bold">{item.issue_date}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">({item.days_issued} days ago)</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold block text-[10px]">Return Due Date:</span>
                            <span className={`font-mono font-bold ${item.is_overdue ? 'text-amber-400' : 'text-slate-200'}`}>
                              {item.due_date}
                            </span>
                            <span className={`text-[10px] block mt-0.5 ${item.is_overdue ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}`}>
                              {item.is_overdue ? `₹${item.estimated_fine} fine accumulating!` : `${item.days_remaining} days remaining`}
                            </span>
                          </div>
                        </div>

                        {item.is_overdue && (
                          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-center gap-2 font-medium">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                            <span>Return IMMEDIATELY to avoid further fine calculation (₹10/day).</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NOTICES & ANNOUNCEMENTS */}
          {activeTab === 'notices' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-400" /> Official College Notice Board & Announcements
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Stay updated with official broadcasts, exam schedules, and circulars.</p>
                </div>
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-bold font-mono">
                  {notices.length} Notice(s)
                </span>
              </div>

              <div className="space-y-4">
                {notices.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
                    <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-semibold">No active notices at this time.</p>
                  </div>
                ) : (
                  notices.map((notice: any) => (
                    <div key={notice.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-2 hover:border-slate-700 transition-all">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" /> {notice.title}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                          {notice.created_at ? new Date(notice.created_at).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pt-1 whitespace-pre-wrap">{notice.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {activeTab === 'leaves' && (
            <div className="space-y-8 animate-fade-in">
              {/* Formal Leave Application Form & Live Letterhead Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form Inputs */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-400" /> Formal College Leave Application Slip
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Draft an official leave slip addressed to your Faculty / HOD for approval.</p>
                  </div>

                  <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Addressed To (Faculty / HOD) *</label>
                      <select
                        required
                        value={newLeave.faculty_name}
                        onChange={(e) => setNewLeave({ ...newLeave, faculty_name: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500 font-bold"
                      >
                        <option value="Dr. Ramesh Sharma (HOD - Computer Science)">Dr. Ramesh Sharma (HOD - Computer Science)</option>
                        {facultyList.map((f: any) => (
                          <option key={f.id} value={`${f.name} (${f.designation || 'Faculty'} - ${f.department_name || 'Dept'})`}>
                            {f.name} ({f.designation || 'Faculty'} - {f.department_name || 'Dept'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Leave Category *</label>
                        <select
                          value={newLeave.category}
                          onChange={(e) => setNewLeave({ ...newLeave, category: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
                        >
                          <option value="Medical / Sick Leave">Medical / Sick Leave</option>
                          <option value="Urgent Personal Work">Urgent Personal Work</option>
                          <option value="Family Function / Marriage">Family Function / Marriage</option>
                          <option value="Emergency Absence">Emergency Absence</option>
                          <option value="Official College Event">Official College Event</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Emergency Contact</label>
                        <input
                          type="text"
                          placeholder="Mobile number..."
                          value={newLeave.emergency_contact}
                          onChange={(e) => setNewLeave({ ...newLeave, emergency_contact: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Leave From Date *</label>
                        <input
                          type="date"
                          required
                          value={newLeave.start_date}
                          onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Leave To Date *</label>
                        <input
                          type="date"
                          required
                          value={newLeave.end_date}
                          onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Detailed Reason / Formal Statement *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="e.g. I am suffering from severe viral fever and doctor has advised 3 days bed rest..."
                        value={newLeave.reason}
                        onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Submit Official Application Slip
                    </button>
                  </form>
                </div>

                {/* Live Formal Application Letterhead Preview Card */}
                <div className="bg-white text-slate-900 p-7 rounded-2xl space-y-4 font-serif border border-slate-300 shadow-xl flex flex-col justify-between">
                  <div className="space-y-4 text-xs leading-relaxed">
                    {/* Letterhead Header */}
                    <div className="text-center border-b-2 border-indigo-950 pb-3 font-sans">
                      <h4 className="font-extrabold text-sm text-indigo-950 uppercase tracking-wide">CAMPUS LEDGER INSTITUTE OF TECHNOLOGY</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Formal Student Leave Application Slip</p>
                    </div>

                    {/* Addressed To */}
                    <div className="font-sans text-xs font-semibold">
                      <p className="text-slate-500 font-normal">To,</p>
                      <p className="font-bold text-indigo-950">{newLeave.faculty_name || 'The Head of Department'}</p>
                      <p className="text-slate-600">Campus Ledger Institute of Technology</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">Date: {new Date().toLocaleDateString('en-IN')}</p>
                    </div>

                    {/* Subject Line */}
                    <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-200 font-sans font-bold text-indigo-950 text-xs">
                      Subject: Application for Leave of Absence ({newLeave.category})
                    </div>

                    {/* Letter Content Body */}
                    <div className="text-slate-800 text-xs space-y-2 font-serif text-justify">
                      <p>Respected Sir/Madam,</p>
                      <p>
                        I am writing to formally request leave of absence from college classes for <strong>{newLeave.start_date}</strong> to <strong>{newLeave.end_date}</strong>.
                      </p>
                      <p className="italic bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700">
                        "{newLeave.reason || 'Reason for leave statement will appear here live...'}"
                      </p>
                      <p>
                        I assure you that I will catch up with all missed lectures and complete any pending assignments immediately upon my return.
                      </p>
                    </div>

                    {/* Sign-off */}
                    <div className="pt-4 border-t border-slate-200 font-sans text-xs space-y-1">
                      <p className="text-slate-500">Thanking you,</p>
                      <p className="font-bold text-indigo-950">Yours obediently,</p>
                      <p className="font-bold text-slate-900">{studentDetails ? `${studentDetails.first_name} ${studentDetails.last_name}` : 'Student Name'}</p>
                      <p className="text-[11px] text-slate-600">Roll No: <span className="font-mono font-bold">{studentDetails?.roll_no || '101'}</span> | Course: {studentDetails?.course_name || 'B.Tech CS'}</p>
                      {newLeave.emergency_contact && <p className="text-[10px] text-slate-500 font-mono">Contact during leave: {newLeave.emergency_contact}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* My Leave Application Status & History Table */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" /> My Submitted Leave Application Slips ({leaves.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Ref ID</th>
                        <th className="p-3">Leave Period</th>
                        <th className="p-3">Details & Statement</th>
                        <th className="p-3">Approval Status</th>
                        <th className="p-3">Faculty Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {leaves.map((l: any) => (
                        <tr key={l.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-indigo-400">#LV-00{l.id}</td>
                          <td className="p-3 font-mono">
                            <span className="font-bold text-white">{l.start_date}</span> to <span className="font-bold text-white">{l.end_date}</span>
                          </td>
                          <td className="p-3 text-slate-300 max-w-xs">
                            <p className="line-clamp-2 text-[11px] whitespace-pre-wrap">{l.reason}</p>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              l.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : l.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {l.status === 'approved' ? '✓ Approved' : l.status === 'rejected' ? '❌ Rejected' : '⏳ Pending Approval'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            {l.remarks || '—'}
                          </td>
                        </tr>
                      ))}
                      {leaves.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                            No leave applications submitted yet.
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
      </main>

      {/* Drawers */}
      <Drawer isOpen={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} title="Upload Assignment Solution">
        <form onSubmit={handleSubmitAssignment} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Solution File Link / URL</label>
            <input
              type="text"
              required
              value={submitForm.file_path}
              onChange={(e) => setSubmitForm({ ...submitForm, file_path: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsSubmitOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">Submit Solution</button>
          </div>
        </form>
      </Drawer>

      <Drawer isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title="Pay Dues Online">
        <form onSubmit={handlePayFeeOnline} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Amount to Pay (₹)</label>
            <input
              type="number"
              required
              value={payForm.amount_paid}
              onChange={(e) => setPayForm({ ...payForm, amount_paid: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 font-bold text-sm"
            />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsPayOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold">Confirm Payment</button>
          </div>
        </form>
      </Drawer>

    </div>
  );
};
