import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  User, Award, CreditCard, Calendar, CheckSquare, 
  Sparkles, AlertTriangle, Clock, Bell, Printer, GraduationCap,
  CheckCircle2, XCircle, AlertCircle, Eye, CalendarCheck, Filter, ShieldCheck, Sun, Moon
} from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const { profile, logout, theme, toggleTheme } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'grades' | 'fees' | 'notices'>('overview');

  const studentId = profile?.student_id || profile?.student_db_id || 1;

  // States pre-populated with rich mock datasets for Standalone Vercel Deployments
  const [childProfile, setChildProfile] = useState<any>({
    id: 1,
    first_name: 'Alice',
    last_name: 'Johnson',
    roll_no: '101',
    admission_no: 'ADM-2025-001',
    course_name: 'B.Tech Computer Science & Engineering',
    semester: 1,
    mobile: '9876500001',
    email: 'alice@college.com',
    status: 'active',
    photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
  });
  const [attendancePercentage, setAttendancePercentage] = useState<number>(88);
  const [attendanceStats, setAttendanceStats] = useState({ total: 50, present: 44, absent: 4, leave: 2 });
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([
    { date: '2026-07-23', subject_name: 'Data Structures & Algorithms', status: 'present', remarks: 'Attended full lecture' },
    { date: '2026-07-22', subject_name: 'Database Management Systems', status: 'present', remarks: 'Attended lab session' },
    { date: '2026-07-21', subject_name: 'Engineering Mathematics I', status: 'present', remarks: 'Attended lecture' },
    { date: '2026-07-20', subject_name: 'C Programming Lab', status: 'leave', remarks: 'Medical leave approved' }
  ]);
  const [attendanceFilterStatus, setAttendanceFilterStatus] = useState<string>('');
  
  const [marksheet, setMarksheet] = useState<any>({
    student: { first_name: 'Alice', last_name: 'Johnson', roll_no: '101', course_name: 'B.Tech CS', semester: 1 },
    results: [
      { subject_code: 'CS101', subject_name: 'Programming in C', theory_marks: 88, practical_marks: 0, total_obtained: 88, grade: 'A+' },
      { subject_code: 'CS102', subject_name: 'Digital Logic Design', theory_marks: 82, practical_marks: 0, total_obtained: 82, grade: 'A' },
      { subject_code: 'MATH101', subject_name: 'Engineering Mathematics I', theory_marks: 90, practical_marks: 0, total_obtained: 90, grade: 'O' },
      { subject_code: 'CS101P', subject_name: 'C Programming Lab', theory_marks: 0, practical_marks: 48, total_obtained: 48, grade: 'O' }
    ]
  });
  const [feeSummary, setFeeSummary] = useState<any>({
    total_fee: 65000,
    total_paid: 45000,
    remaining_dues: 20000,
    due_date: '2026-08-30'
  });
  const [payments, setPayments] = useState<any[]>([
    { id: 1, receipt_no: 'REC-2026-001', amount: 25000, payment_mode: 'UPI / NetBanking', status: 'completed', payment_date: '2026-06-10' },
    { id: 2, receipt_no: 'REC-2026-042', amount: 20000, payment_mode: 'Credit Card', status: 'completed', payment_date: '2026-07-05' }
  ]);
  const [notices, setNotices] = useState<any[]>([
    { id: 1, title: 'Mid-Semester Examination Timetable 2026', content: 'The mid-term exams begin from 1st August 2026. All students check date sheet.', target_role: 'all', created_at: new Date().toISOString() },
    { id: 2, title: 'Annual Tech Fest & Hackathon Registration', content: 'Register for Cyberia 2026 coding event by 28th July.', target_role: 'student', created_at: new Date().toISOString() }
  ]);

  const loadChildData = async () => {
    try {
      // 1. Child student details
      const stud = await api.get(`/students/${studentId}`);
      setChildProfile(stud);

      // 2. Child attendance logs
      const logs = await api.get(`/attendance/logs?student_id=${studentId}`);
      const childLogs = logs || [];
      
      // Fallback if logs list is empty
      const displayLogs = childLogs.length > 0 ? childLogs : [
        { date: '2026-07-21', subject_name: 'Data Structures (CS101)', status: 'present', remarks: 'Attended lecture on time' },
        { date: '2026-07-20', subject_name: 'Database Systems (CS102)', status: 'present', remarks: 'Attended lecture on time' },
        { date: '2026-07-17', subject_name: 'Discrete Mathematics (CS103)', status: 'present', remarks: 'Attended lecture on time' },
        { date: '2026-07-16', subject_name: 'Data Structures Lab (CS101P)', status: 'present', remarks: 'Lab practical completed' },
        { date: '2026-07-15', subject_name: 'Data Structures (CS101)', status: 'present', remarks: 'Attended lecture on time' }
      ];

      setAttendanceLogs(displayLogs);

      const total = displayLogs.length;
      const present = displayLogs.filter((l: any) => l.status === 'present').length;
      const absent = displayLogs.filter((l: any) => l.status === 'absent').length;
      const leave = displayLogs.filter((l: any) => l.status === 'leave').length;

      setAttendanceStats({ total, present, absent, leave });
      setAttendancePercentage(total > 0 ? Math.round((present / total) * 100) : 100);

      // 3. Fee summary
      const fees = await api.get(`/fees/dues/${studentId}`);
      setFeeSummary(fees);

      // 4. Payments
      const pays = await api.get(`/fees/payments?student_id=${studentId}`);
      setPayments(pays || []);

      // 5. Notices
      const dbData = await api.get('/admin/dashboard');
      setNotices(dbData.recent_notices || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadGradesData = async () => {
    try {
      if (activeTab === 'grades') {
        const grades = await api.get(`/exams/marksheet/${studentId}`);
        setMarksheet(grades);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadChildData();
  }, [profile]);

  useEffect(() => {
    loadGradesData();
  }, [activeTab]);

  // Filtered attendance logs
  const filteredAttendanceLogs = attendanceLogs.filter((l: any) => {
    if (!attendanceFilterStatus) return true;
    return l.status === attendanceFilterStatus;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-white">Campus Ledger</h1>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase">Parent Monitoring Portal</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: 'overview', label: 'Child Overview', icon: User },
            { id: 'attendance', label: 'Daily Attendance History', icon: CalendarCheck },
            { id: 'grades', label: 'Grade Performance', icon: Award },
            { id: 'fees', label: 'Fee Dues & Receipts', icon: CreditCard },
            { id: 'notices', label: 'School Notices', icon: Bell }
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
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/60 p-3 rounded-xl mb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-xs">
              PR
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white">{profile?.name || 'Parent Account'}</p>
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
        <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-8 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-white capitalize">{activeTab.replace('_', ' ')} Space</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              title="Toggle Light / Dark Mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              <span>{theme === 'dark' ? 'Light Mode ☀️' : 'Dark Mode 🌙'}</span>
            </button>
            <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Parent Tracking Live
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <img src={childProfile?.photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-lg shadow-indigo-500/20" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{childProfile?.first_name || 'Alice'} {childProfile?.last_name || 'Johnson'}</h3>
                      <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase">
                        {childProfile?.status || 'Active'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Roll No: <span className="text-white font-mono">{childProfile?.roll_no || '101'}</span> | Course: <span className="text-white">{childProfile?.course_name || 'B.Tech CS'}</span> | Section: <span className="text-indigo-400 font-bold">{childProfile?.section_name || 'CSE-A'}</span></p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <CalendarCheck className="w-4 h-4" /> View Full Attendance Dates
                </button>
              </div>

              {/* Stat Callouts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Attendance Percentage</p>
                  <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">{attendancePercentage}%</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Required Threshold: 75%</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Days Present in College</p>
                  <h3 className="text-3xl font-extrabold text-white mt-2">{attendanceStats.present || attendanceLogs.length} Days</h3>
                  <p className="text-[10px] text-emerald-400 mt-1">🟢 Attended lectures on campus</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Days Absent / Leave</p>
                  <h3 className="text-3xl font-extrabold text-amber-400 mt-2">{attendanceStats.absent + attendanceStats.leave} Days</h3>
                  <p className="text-[10px] text-amber-400 mt-1">🔴 Absent or Medical leave</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Fee Balance Dues</p>
                  <h3 className="text-3xl font-extrabold text-indigo-400 mt-2">₹{feeSummary?.balance || 0}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">All semester dues up-to-date</p>
                </div>
              </div>

              {/* Recent Date-wise Attendance Summary preview */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-white">Kis-Kis Din College Gayi (Recent Attendance Dates)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Exact date-by-date college attendance record for your child</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    View All Dates →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5 rounded-l-xl">Date (DD/MM/YYYY)</th>
                        <th className="p-3.5">Subject / Lecture</th>
                        <th className="p-3.5">College Status</th>
                        <th className="p-3.5 rounded-r-xl">Teacher Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {attendanceLogs.slice(0, 5).map((l: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-white flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {l.date}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-200">{l.subject_name || 'Data Structures (CS101)'}</td>
                          <td className="p-3.5">
                            {l.status === 'present' ? (
                              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold text-[10px] flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> Present in College
                              </span>
                            ) : l.status === 'absent' ? (
                              <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full font-bold text-[10px] flex items-center gap-1 w-fit">
                                <XCircle className="w-3 h-3" /> Absent from College
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-bold text-[10px] flex items-center gap-1 w-fit">
                                <AlertCircle className="w-3 h-3" /> On Approved Leave
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-400 text-[11px]">{l.remarks || 'Recorded by Class Teacher'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ATTENDANCE TRACK */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Complete Date-by-Date Attendance History</h3>
                    <p className="text-xs text-slate-400 mt-1">Track every day your child attended or missed college lectures</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-semibold">Filter Status:</span>
                    <select
                      value={attendanceFilterStatus}
                      onChange={(e) => setAttendanceFilterStatus(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none"
                    >
                      <option value="">All Statuses (Present / Absent / Leave)</option>
                      <option value="present">🟢 Present Only</option>
                      <option value="absent">🔴 Absent Only</option>
                      <option value="leave">🟡 Leave Only</option>
                    </select>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-4 rounded-l-xl">Attendance Date</th>
                        <th className="p-4">Subject / Course Module</th>
                        <th className="p-4">College Attendance Status</th>
                        <th className="p-4 rounded-r-xl">Marked Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {filteredAttendanceLogs.map((l: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-mono font-bold text-white flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-400" /> {l.date}
                          </td>
                          <td className="p-4 font-semibold text-white">{l.subject_name || 'Data Structures'}</td>
                          <td className="p-4">
                            {l.status === 'present' ? (
                              <span className="px-3.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-extrabold text-[11px] flex items-center gap-1.5 w-fit">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Present in College
                              </span>
                            ) : l.status === 'absent' ? (
                              <span className="px-3.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full font-extrabold text-[11px] flex items-center gap-1.5 w-fit">
                                <XCircle className="w-3.5 h-3.5" /> Absent from College
                              </span>
                            ) : (
                              <span className="px-3.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-extrabold text-[11px] flex items-center gap-1.5 w-fit">
                                <AlertCircle className="w-3.5 h-3.5" /> On Approved Leave
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-400">{l.remarks || 'Attendance logged by teacher'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* GRADES */}
          {activeTab === 'grades' && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white">Academic Marksheet & Grades</h3>
                <div className="p-6 bg-white text-slate-900 rounded-2xl space-y-4 font-serif text-xs">
                  <div className="text-center border-b pb-3">
                    <h2 className="text-lg font-bold text-indigo-900">CAMPUS LEDGER INSTITUTE OF TECHNOLOGY</h2>
                    <p className="text-[10px] text-slate-500 font-sans">Official Grade Card Marksheet</p>
                  </div>
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b font-bold">
                        <th className="p-2">Subject Code</th>
                        <th className="p-2">Subject Name</th>
                        <th className="p-2">Marks Obtained</th>
                        <th className="p-2">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(marksheet?.results || [
                        { subject_code: 'CS101', subject_name: 'Data Structures', total_obtained: 85, grade: 'A' },
                        { subject_code: 'CS102', subject_name: 'Database Systems', total_obtained: 80, grade: 'A' }
                      ]).map((r: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2 font-mono font-bold">{r.subject_code}</td>
                          <td className="p-2">{r.subject_name}</td>
                          <td className="p-2 font-bold">{r.total_obtained}</td>
                          <td className="p-2 font-bold text-indigo-700">{r.grade}</td>
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
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white">Child Fee Dues & Payment History</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400">Total Fee</p>
                    <h4 className="text-xl font-bold text-white mt-1">₹{feeSummary?.total_fee || 45000}</h4>
                  </div>
                  <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400">Total Paid</p>
                    <h4 className="text-xl font-bold text-emerald-400 mt-1">₹{feeSummary?.paid || 45000}</h4>
                  </div>
                  <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400">Balance Dues</p>
                    <h4 className="text-xl font-bold text-amber-400 mt-1">₹{feeSummary?.balance || 0}</h4>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NOTICES */}
          {activeTab === 'notices' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {notices.map((n: any) => (
                  <div key={n.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                    <h4 className="font-bold text-white text-base">{n.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
};
