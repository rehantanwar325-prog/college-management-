import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Drawer } from './Drawer';
import { 
  Users, BookOpen, Calendar, Award, CheckSquare, FileUp, ClipboardList, 
  Sparkles, CheckCircle2, XCircle, AlertCircle, FileText, Plus, CheckCircle, Trash2, Eye, RefreshCw, Send, GraduationCap, Sun, Moon, Menu, X
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { profile, logout, theme, toggleTheme } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'study' | 'exams' | 'leaves'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Baseline Allocations
  const [allocations, setAllocations] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [myStudents, setMyStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Attendance Marking States
  const [attFilters, setAttFilters] = useState({ date: new Date().toISOString().split('T')[0], allocation_idx: '0' });
  const [attStudents, setAttStudents] = useState<any[]>([]);
  const [attStatusGrid, setAttStatusGrid] = useState<Record<number, { status: 'present' | 'absent' | 'leave'; remarks: string }>>({});

  // 2. Study Postings (Upload Notes / Create Assignment)
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [newMaterial, setNewMaterial] = useState({ title: '', description: '', allocation_idx: '0', file_path: 'https://example.com/notes.pdf', file_type: 'pdf' });
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', allocation_idx: '0', due_date: new Date(Date.now() + 7*86400000).toISOString().split('T')[0], max_marks: 20 });
  const [submissions, setSubmissions] = useState<any[]>([]);

  // 3. Exam Grading States
  const [exams, setExams] = useState<any[]>([]);
  const [examGradeFilters, setExamGradeFilters] = useState({ exam_id: '1', allocation_idx: '0' });
  const [examStudents, setExamStudents] = useState<any[]>([]);

  // 4. Leaves Review States
  const [leaves, setLeaves] = useState<any[]>([]);

  // Search & Sorting States
  const [attSearchQuery, setAttSearchQuery] = useState('');
  const [examSearchQuery, setExamSearchQuery] = useState('');
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [attSortBy, setAttSortBy] = useState<'name' | 'roll'>('name');

  // Drawers
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState(false);

  const loadBaseData = async () => {
    try {
      const allocs = await api.get('/academics/allocations');
      setAllocations(allocs || []);

      const tt = await api.get('/academics/timetable?section_id=1');
      setTimetable(tt || []);

      const studs = await api.get('/students');
      setMyStudents(studs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadDataForTab = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        await loadBaseData();
      } else if (activeTab === 'attendance') {
        await loadBaseData();
        const studList = await api.get('/students?section_id=1');
        setAttStudents(studList || []);
        const grid: typeof attStatusGrid = {};
        (studList || []).forEach((s: any) => {
          grid[s.id] = { status: 'present', remarks: 'On time' };
        });
        setAttStatusGrid(grid);
      } else if (activeTab === 'study') {
        await loadBaseData();
        const matList = await api.get('/study/materials');
        setMaterials(matList || []);
        const assignList = await api.get('/study/assignments');
        setAssignments(assignList || []);
        const subs = await api.get('/study/submissions');
        setSubmissions(subs || []);
      } else if (activeTab === 'exams') {
        await loadBaseData();
        const examList = await api.get('/exams');
        setExams(examList || []);
        if (examList && examList.length > 0) {
          const marks = await api.get(`/exams/marks?exam_id=${examGradeFilters.exam_id || examList[0].id}&subject_id=1`);
          setExamStudents(marks || []);
        }
      } else if (activeTab === 'leaves') {
        const lvList = await api.get('/attendance/leaves');
        setLeaves(lvList || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, [profile]);

  useEffect(() => {
    loadDataForTab();
  }, [activeTab, attFilters.allocation_idx, examGradeFilters.exam_id, examGradeFilters.allocation_idx]);

  // Attendance Fetch
  const handleFetchAttendanceStudents = async () => {
    try {
      const idx = parseInt(attFilters.allocation_idx || '0');
      const alloc = allocations[idx] || { section_id: 1 };
      const studList = await api.get(`/students?section_id=${alloc.section_id || 1}`);
      setAttStudents(studList || []);
      const grid: typeof attStatusGrid = {};
      (studList || []).forEach((s: any) => {
        grid[s.id] = { status: 'present', remarks: 'On time' };
      });
      setAttStatusGrid(grid);
    } catch (e) {
      console.error(e);
    }
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    const idx = parseInt(attFilters.allocation_idx || '0');
    const alloc = allocations[idx] || { section_id: 1, subject_id: 1 };
    const records = Object.entries(attStatusGrid).map(([studentId, obj]) => ({
      student_id: parseInt(studentId),
      status: obj.status,
      remarks: obj.remarks
    }));

    try {
      await api.post('/attendance/mark', {
        date: attFilters.date,
        section_id: alloc.section_id || 1,
        subject_id: alloc.subject_id || 1,
        records
      });
      alert('Attendance recorded successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Post Material
  const handlePostMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const idx = parseInt(newMaterial.allocation_idx || '0');
    const alloc = allocations[idx] || { subject_id: 1, section_id: 1 };
    try {
      await api.post('/study/materials', {
        title: newMaterial.title,
        description: newMaterial.description,
        subject_id: alloc.subject_id || 1,
        section_id: alloc.section_id || 1,
        file_path: newMaterial.file_path,
        file_type: newMaterial.file_type
      });
      alert('Course material uploaded successfully!');
      setIsAddMaterialOpen(false);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const idx = parseInt(newAssignment.allocation_idx || '0');
    const alloc = allocations[idx] || { subject_id: 1, section_id: 1 };
    try {
      await api.post('/study/assignments', {
        title: newAssignment.title,
        description: newAssignment.description,
        subject_id: alloc.subject_id || 1,
        section_id: alloc.section_id || 1,
        due_date: newAssignment.due_date,
        max_marks: newAssignment.max_marks
      });
      alert('Assignment created successfully!');
      setIsAddAssignmentOpen(false);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Fetch Exam Grading Sheet
  const handleFetchExamStudents = async () => {
    try {
      const idx = parseInt(examGradeFilters.allocation_idx || '0');
      const alloc = allocations[idx] || { subject_id: 1, section_id: 1 };
      const exId = examGradeFilters.exam_id || '1';
      const list = await api.get(`/exams/marks?exam_id=${exId}&subject_id=${alloc.subject_id || 1}`);
      setExamStudents(list || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Save Exam Marks
  const handleSaveExamMarks = async () => {
    const idx = parseInt(examGradeFilters.allocation_idx || '0');
    const alloc = allocations[idx] || { subject_id: 1 };
    const exId = examGradeFilters.exam_id || '1';

    const marksPayload = examStudents.map(s => ({
      student_id: s.student_id,
      theory_marks: parseFloat(s.theory_marks || 0),
      practical_marks: parseFloat(s.practical_marks || 0)
    }));

    try {
      await api.post('/exams/marks', {
        exam_id: exId,
        subject_id: alloc.subject_id || 1,
        marks: marksPayload
      });
      alert('Exam grading sheet saved!');
      handleFetchExamStudents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Approve/Reject Leave
  const handleActionLeave = async (leaveId: number, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/attendance/leaves/${leaveId}`, { status });
      alert(`Leave application ${status}!`);
      loadDataForTab();
    } catch (err: any) {
      alert(err.message);
    }
  };
  // Filtered Students by Name or Roll No for Attendance
  const filteredAttStudents = attStudents
    .filter((s: any) => {
      const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
      const roll = (s.roll_no || '').toString().toLowerCase();
      const q = attSearchQuery.toLowerCase().trim();
      return !q || fullName.includes(q) || roll.includes(q);
    })
    .sort((a: any, b: any) => {
      if (attSortBy === 'name') {
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      }
      return (a.roll_no || '').toString().localeCompare((b.roll_no || '').toString());
    });

  // Filtered Students by Name or Roll No for Exam Grading
  const filteredExamStudents = examStudents.filter((s: any) => {
    const fullName = `${s.first_name || s.student_name || ''} ${s.last_name || ''}`.toLowerCase();
    const roll = (s.roll_no || '').toString().toLowerCase();
    const q = examSearchQuery.toLowerCase().trim();
    return !q || fullName.includes(q) || roll.includes(q);
  });

  // Filtered Roster Students by Name, Roll No, or Course
  const filteredMyStudents = myStudents.filter((s: any) => {
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const roll = (s.roll_no || '').toString().toLowerCase();
    const course = (s.course_name || '').toLowerCase();
    const q = rosterSearchQuery.toLowerCase().trim();
    return !q || fullName.includes(q) || roll.includes(q) || course.includes(q);
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

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-transform duration-300 md:static md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-white">Campus Ledger</h1>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase">Faculty Portal</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: 'overview', label: 'Overview Dashboard', icon: Users },
            { id: 'attendance', label: 'Mark Attendance', icon: CheckSquare },
            { id: 'study', label: 'Study & Assignments', icon: BookOpen },
            { id: 'exams', label: 'Exam Grading', icon: ClipboardList },
            { id: 'leaves', label: 'Leave Applications', icon: Calendar }
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
              FC
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white">{profile?.name || 'Faculty Member'}</p>
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
              Faculty Access Live
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Subjects</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">{allocations.length || 3}</h3>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Enrolled Students</p>
                  <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{myStudents.length || 15}</h3>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Weekly Workload</p>
                  <h3 className="text-2xl font-extrabold text-indigo-400 mt-1">15 Hours</h3>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Leave Review</p>
                  <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{leaves.filter((l: any) => l.status === 'pending').length}</h3>
                </div>
              </div>

              {/* Allocations Card */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" /> Your Assigned Subject Allocations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allocations.map((a: any, idx: number) => (
                    <div key={idx} className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white text-sm">{a.subject_name || 'Data Structures'}</p>
                        <span className="text-slate-400">Section: {a.section_name || 'CSE-A'} ({a.subject_code || 'CS101'})</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full font-bold">Active</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* My Students Directory Table */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" /> Students Enrolled in My Classes ({filteredMyStudents.length})
                  </h3>
                  <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="🔍 Search student by Name or Roll No..."
                      value={rosterSearchQuery}
                      onChange={(e) => setRosterSearchQuery(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Roll No</th>
                        <th className="p-3">Course / Section</th>
                        <th className="p-3">Semester</th>
                        <th className="p-3">Contact</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {filteredMyStudents.map((s: any) => (
                        <tr key={s.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-white text-sm">{s.first_name} {s.last_name}</td>
                          <td className="p-3 font-mono font-bold text-indigo-400">{s.roll_no}</td>
                          <td className="p-3 text-slate-400">{s.course_name || 'B.Tech CS'} ({s.section_name || 'CSE-A'})</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded text-[10px] font-bold">Sem {s.semester}</span></td>
                          <td className="p-3 font-mono text-[10px] text-slate-400">{s.mobile}</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold border border-emerald-500/20">Active</span></td>
                        </tr>
                      ))}
                      {filteredMyStudents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500 italic">No matching students found by name or roll number.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white">Mark Class Roll Call Attendance</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Select Date</label>
                    <input
                      type="date"
                      value={attFilters.date}
                      onChange={(e) => setAttFilters({ ...attFilters, date: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Assigned Subject & Section</label>
                    <select
                      value={attFilters.allocation_idx}
                      onChange={(e) => setAttFilters({ ...attFilters, allocation_idx: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                    >
                      {allocations.map((a: any, idx: number) => (
                        <option key={idx} value={idx}>{a.subject_name || 'Data Structures'} - {a.section_name || 'CSE-A'}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleFetchAttendanceStudents}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-semibold"
                  >
                    Load Class Roster
                  </button>
                </div>
              </div>

              {attStudents.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-400" /> Student Attendance Grid ({filteredAttStudents.length} Students)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">Filter or search any student by Name or Roll Number for quick roll call</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="🔍 Search by Name or Roll No..."
                        value={attSearchQuery}
                        onChange={(e) => setAttSearchQuery(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-xl outline-none focus:border-indigo-500 font-medium w-56"
                      />
                      <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setAttSortBy('name')}
                          className={`px-2.5 py-1 rounded-lg transition-all ${attSortBy === 'name' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          By Name (A-Z)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttSortBy('roll')}
                          className={`px-2.5 py-1 rounded-lg transition-all ${attSortBy === 'roll' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          By Roll No
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Roll No</th>
                          <th className="p-3">Attendance Status</th>
                          <th className="p-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {filteredAttStudents.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-800/40">
                            <td className="p-3 font-bold text-white text-sm">
                              {s.first_name} {s.last_name}
                            </td>
                            <td className="p-3 font-mono font-bold text-indigo-400">{s.roll_no}</td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                {['present', 'absent', 'leave'].map((st: any) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => setAttStatusGrid(prev => ({
                                      ...prev,
                                      [s.id]: { ...prev[s.id], status: st }
                                    }))}
                                    className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase transition-all ${
                                      attStatusGrid[s.id]?.status === st
                                        ? st === 'present' ? 'bg-emerald-600 text-white' : st === 'absent' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                  >
                                    {st}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={attStatusGrid[s.id]?.remarks || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAttStatusGrid(prev => ({
                                    ...prev,
                                    [s.id]: { ...prev[s.id], remarks: val }
                                  }));
                                }}
                                className="w-48 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={handleSaveAttendance}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs"
                  >
                    Save & Submit Roll Call
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STUDY & ASSIGNMENTS */}
          {activeTab === 'study' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">Study Materials & Assignments</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsAddMaterialOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    + Upload Study Notes
                  </button>
                  <button
                    onClick={() => setIsAddAssignmentOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    + Create Assignment
                  </button>
                </div>
              </div>

              {/* Study Materials List */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white">Uploaded Course Materials</h4>
                <div className="space-y-3 text-xs">
                  {materials.map((m: any) => (
                    <div key={m.id} className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white text-sm">{m.title}</p>
                        <span className="text-slate-400">{m.description || 'Lecture notes'}</span>
                      </div>
                      <a
                        href={m.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg font-bold"
                      >
                        View File
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EXAMS GRADING */}
          {activeTab === 'exams' && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white">Enter Examination Assessment Scores</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Select Exam</label>
                    <select
                      value={examGradeFilters.exam_id}
                      onChange={(e) => setExamGradeFilters({ ...examGradeFilters, exam_id: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                    >
                      {exams.map((ex: any) => (
                        <option key={ex.id} value={ex.id}>{ex.name} ({ex.date})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Allocated Class & Subject</label>
                    <select
                      value={examGradeFilters.allocation_idx}
                      onChange={(e) => setExamGradeFilters({ ...examGradeFilters, allocation_idx: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                    >
                      {allocations.map((a: any, idx: number) => (
                        <option key={idx} value={idx}>{a.subject_name || 'Data Structures'} - {a.section_name || 'CSE-A'}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleFetchExamStudents}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold"
                  >
                    Load Grading Sheet
                  </button>
                </div>
              </div>

              {examStudents.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-indigo-400" /> Grading Entry Sheet ({filteredExamStudents.length} Students)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">Find student by Name or Roll Number to enter exam marks</p>
                    </div>
                    <input
                      type="text"
                      placeholder="🔍 Search student by Name or Roll No..."
                      value={examSearchQuery}
                      onChange={(e) => setExamSearchQuery(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl outline-none focus:border-indigo-500 font-medium w-64"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Roll No</th>
                          <th className="p-3">Theory Score (100)</th>
                          <th className="p-3">Practical Score (50)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {filteredExamStudents.map((s: any, idx: number) => (
                          <tr key={s.student_id || idx} className="hover:bg-slate-800/40">
                            <td className="p-3 font-bold text-white text-sm">
                              {s.first_name || s.student_name} {s.last_name || ''}
                            </td>
                            <td className="p-3 font-mono font-bold text-indigo-400">{s.roll_no}</td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={s.theory_marks || 0}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setExamStudents(prev => {
                                    const next = [...prev];
                                    next[idx].theory_marks = val;
                                    return next;
                                  });
                                }}
                                className="w-24 bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={s.practical_marks || 0}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setExamStudents(prev => {
                                    const next = [...prev];
                                    next[idx].practical_marks = val;
                                    return next;
                                  });
                                }}
                                className="w-24 bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={handleSaveExamMarks}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs"
                  >
                    Save & Publish Assessment Scores
                  </button>
                </div>
              )}
            </div>
          )}

          {/* LEAVES */}
          {activeTab === 'leaves' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white">Student Leave Applications Review</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Applicant</th>
                        <th className="p-3">From Date</th>
                        <th className="p-3">To Date</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {leaves.map((l: any) => (
                        <tr key={l.id}>
                          <td className="p-3 font-semibold text-white">{l.applicant_name || 'Student'}</td>
                          <td className="p-3">{l.start_date}</td>
                          <td className="p-3">{l.end_date}</td>
                          <td className="p-3">{l.reason}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="p-3">
                            {l.status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleActionLeave(l.id, 'approved')}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-semibold text-[10px]"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleActionLeave(l.id, 'rejected')}
                                  className="px-3 py-1 bg-red-600 text-white rounded-lg font-semibold text-[10px]"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Slide-over Drawers */}
      <Drawer
        isOpen={isAddMaterialOpen}
        onClose={() => setIsAddMaterialOpen(false)}
        title="Upload Study Material"
        subtitle="Share lecture notes with class"
      >
        <form onSubmit={handlePostMaterial} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Title</label>
            <input
              type="text"
              required
              value={newMaterial.title}
              onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Description</label>
            <textarea
              value={newMaterial.description}
              onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsAddMaterialOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">Save Notes</button>
          </div>
        </form>
      </Drawer>

      <Drawer
        isOpen={isAddAssignmentOpen}
        onClose={() => setIsAddAssignmentOpen(false)}
        title="Create Class Assignment"
        subtitle="Assign homework to section"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Assignment Title</label>
            <input
              type="text"
              required
              value={newAssignment.title}
              onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Due Date</label>
            <input
              type="date"
              required
              value={newAssignment.due_date}
              onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
            />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsAddAssignmentOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">Publish Assignment</button>
          </div>
        </form>
      </Drawer>

    </div>
  );
};
