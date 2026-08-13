'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Wheat,
  Sparkles,
  Trophy,
  CalendarCheck,
  Search,
  Upload,
  FileBarChart,
  X,
  UserPlus,
  School,
  Cake,
  Bell,
  MessageSquare,
  QrCode,
  Bot,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ParishScopeField } from '@/components/ParishScopeField';
import './catechism.css';

type Parish = { id: string; name: string };

type StudentLite = {
  id: string;
  fullName: string;
  sacramentTrack?: string;
  sacramentStatus?: string;
  catechismStatus?: string;
  dateOfBirth?: string | null;
};

type ClassRow = {
  id: string;
  parishId: string;
  name: string;
  teacherName?: string | null;
  assistantTeacher?: string | null;
  academicYear: string;
  grade?: string | null;
  section?: string | null;
  maxStudents?: number | null;
  room?: string | null;
  schedule?: string | null;
  notes?: string | null;
  status?: string;
  _count?: { students: number };
  students?: StudentLite[];
};

type Student = {
  id: string;
  fullName: string;
  rollNo?: string | null;
  studentCode?: string | null;
  photoUrl?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  familyName?: string | null;
  village?: string | null;
  phone?: string | null;
  school?: string | null;
  schoolStandard?: string | null;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
  catechismStatus?: string;
  sacramentTrack?: string;
  sacramentStatus?: string;
};

type Attendance = {
  id: string;
  studentId: string;
  date: string;
  present: boolean;
  status?: string;
};

type ClassDetail = ClassRow & {
  students: Student[];
  attendance: Attendance[];
};

type Dashboard = {
  totalStudents: number;
  teachers: number;
  classes: number;
  attendanceToday: { marked: number; present: number; rate: number };
  preparingCommunion: number;
  preparingConfirmation: number;
  completedThisYear: number;
  upcomingExams: number;
  academicYears: string[];
  teachersList: string[];
  birthdaysToday: StudentLite[];
  classesToday: ClassRow[];
};

type CenterTab = 'students' | 'attendance' | 'class' | 'timetable' | 'exams' | 'events' | 'reports' | 'teachers';
type AttStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

const CURRENT_YEAR = '2025-26';

function AnimatedCount({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0;
    const frames = 22;
    const tick = () => {
      frame += 1;
      setN(Math.round((value * frame) / frames));
      if (frame < frames) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <>{n}</>;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

function ageFromDob(dob?: string | null) {
  if (!dob) return '—';
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return String(age);
}

function sacramentBadge(track?: string) {
  if (track === 'COMMUNION') return { label: 'Communion', cls: 'ecm-badge--gold' };
  if (track === 'CONFIRMATION') return { label: 'Confirmation', cls: 'ecm-badge--blue' };
  return { label: 'General', cls: '' };
}

export function CatechismManagement() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [parishFilter, setParishFilter] = useState('all');
  const [sacramentFilter, setSacramentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [centerTab, setCenterTab] = useState<CenterTab>('students');
  const [classOpen, setClassOpen] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);
  const [profile, setProfile] = useState<Student | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [attMap, setAttMap] = useState<Record<string, AttStatus>>({});

  const [classForm, setClassForm] = useState({
    parishId: user?.parishId || '',
    name: '',
    academicYear: CURRENT_YEAR,
    teacherName: '',
    assistantTeacher: '',
    grade: 'Grade 1',
    section: 'A',
    maxStudents: '40',
    room: '',
    schedule: 'Sunday 9:00 AM',
    notes: '',
  });

  const [studentForm, setStudentForm] = useState({
    fullName: '',
    rollNo: '',
    studentCode: '',
    gender: 'MALE',
    dateOfBirth: '',
    fatherName: '',
    motherName: '',
    familyName: '',
    village: '',
    phone: '',
    school: '',
    schoolStandard: '',
    bloodGroup: '',
    emergencyContact: '',
    catechismStatus: 'ACTIVE',
    sacramentTrack: 'NONE',
    sacramentStatus: 'NONE',
  });

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<Parish[]>('/parishes'),
  });

  const classesQ = useQuery({
    queryKey: ['catechism-classes'],
    queryFn: () => api.get<ClassRow[]>('/catechism/classes'),
  });

  const dashQ = useQuery({
    queryKey: ['catechism-dashboard'],
    queryFn: () => api.get<Dashboard>('/catechism/dashboard'),
  });

  const detailQ = useQuery({
    queryKey: ['catechism-class', selectedClassId],
    enabled: Boolean(selectedClassId),
    queryFn: () => api.get<ClassDetail>(`/catechism/classes/${selectedClassId}`),
  });

  useEffect(() => {
    if (!selectedClassId && classesQ.data?.length) {
      setSelectedClassId(classesQ.data[0].id);
    }
  }, [classesQ.data, selectedClassId]);

  useEffect(() => {
    if (user?.parishId && !classForm.parishId) {
      setClassForm((f) => ({ ...f, parishId: user.parishId! }));
    }
  }, [user?.parishId, classForm.parishId]);

  useEffect(() => {
    if (!detailQ.data) return;
    const today = new Date().toISOString().slice(0, 10);
    const map: Record<string, AttStatus> = {};
    for (const s of detailQ.data.students) {
      const mark = detailQ.data.attendance.find(
        (a) => a.studentId === s.id && a.date.slice(0, 10) === today,
      );
      map[s.id] = (mark?.status as AttStatus) || (mark?.present ? 'PRESENT' : mark ? 'ABSENT' : 'PRESENT');
    }
    setAttMap(map);
  }, [detailQ.data]);

  const classes = useMemo(() => {
    let rows = classesQ.data || [];
    if (yearFilter !== 'all') rows = rows.filter((c) => c.academicYear === yearFilter);
    if (parishFilter !== 'all') rows = rows.filter((c) => c.parishId === parishFilter);
    return rows;
  }, [classesQ.data, yearFilter, parishFilter]);

  const years = useMemo(() => {
    const set = new Set((classesQ.data || []).map((c) => c.academicYear));
    set.add(CURRENT_YEAR);
    return [...set].sort().reverse();
  }, [classesQ.data]);

  const teachers = useMemo(() => {
    const set = new Set(
      (classesQ.data || []).map((c) => c.teacherName).filter((t): t is string => Boolean(t)),
    );
    return [...set];
  }, [classesQ.data]);

  const selectedClass = classes.find((c) => c.id === selectedClassId) || detailQ.data;
  const students = detailQ.data?.students || [];

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (sacramentFilter !== 'all' && s.sacramentTrack !== sacramentFilter) return false;
      if (statusFilter !== 'all' && s.catechismStatus !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        s.fullName,
        s.fatherName,
        s.motherName,
        s.familyName,
        s.village,
        s.phone,
        s.school,
        s.rollNo,
        selectedClass?.teacherName,
        selectedClass?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [students, search, sacramentFilter, statusFilter, selectedClass]);

  const dash = dashQ.data;
  const kpis = [
    {
      label: 'Total Students',
      value: dash?.totalStudents ?? students.length,
      icon: Users,
      gradient: 'linear-gradient(135deg,#0f766e,#14b8a6)',
      progress: 72,
      trend: '+4% MoM',
    },
    {
      label: 'Catechism Teachers',
      value: dash?.teachers ?? teachers.length,
      icon: GraduationCap,
      gradient: 'linear-gradient(135deg,#1e40af,#3b82f6)',
      progress: 60,
      trend: 'Stable',
    },
    {
      label: 'Classes',
      value: dash?.classes ?? (classesQ.data || []).length,
      icon: BookOpen,
      gradient: 'linear-gradient(135deg,#722f37,#c45c68)',
      progress: 55,
      trend: `${years.length} years`,
    },
    {
      label: 'Attendance Today',
      value: dash?.attendanceToday.rate ?? 0,
      icon: ClipboardCheck,
      gradient: 'linear-gradient(135deg,#047857,#34d399)',
      progress: dash?.attendanceToday.rate ?? 0,
      trend: `${dash?.attendanceToday.present ?? 0}/${dash?.attendanceToday.marked ?? 0}`,
      suffix: '%',
    },
    {
      label: 'Preparing Communion',
      value: dash?.preparingCommunion ?? 0,
      icon: Wheat,
      gradient: 'linear-gradient(135deg,#92400e,#c4a35a)',
      progress: 48,
      trend: 'On track',
    },
    {
      label: 'Preparing Confirmation',
      value: dash?.preparingConfirmation ?? 0,
      icon: Sparkles,
      gradient: 'linear-gradient(135deg,#6d28d9,#a78bfa)',
      progress: 42,
      trend: 'Pipeline',
    },
    {
      label: 'Completed This Year',
      value: dash?.completedThisYear ?? 0,
      icon: Trophy,
      gradient: 'linear-gradient(135deg,#0e7490,#22d3ee)',
      progress: 35,
      trend: 'Certificates',
    },
    {
      label: 'Upcoming Exams',
      value: dash?.upcomingExams ?? 2,
      icon: CalendarCheck,
      gradient: 'linear-gradient(135deg,#9a3412,#fb923c)',
      progress: 20,
      trend: 'This month',
    },
  ];

  const createClass = useMutation({
    mutationFn: () =>
      api.post<ClassRow>('/catechism/classes', {
        ...classForm,
        maxStudents: classForm.maxStudents ? Number(classForm.maxStudents) : undefined,
      }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['catechism-classes'] });
      qc.invalidateQueries({ queryKey: ['catechism-dashboard'] });
      setClassOpen(false);
      if (created?.id) setSelectedClassId(created.id);
      setClassForm((f) => ({
        ...f,
        name: '',
        teacherName: '',
        assistantTeacher: '',
        room: '',
        notes: '',
      }));
    },
  });

  const addStudent = useMutation({
    mutationFn: () =>
      api.post(`/catechism/classes/${selectedClassId}/students`, {
        ...studentForm,
        dateOfBirth: studentForm.dateOfBirth || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catechism-class', selectedClassId] });
      qc.invalidateQueries({ queryKey: ['catechism-classes'] });
      qc.invalidateQueries({ queryKey: ['catechism-dashboard'] });
      setStudentOpen(false);
      setStudentForm({
        fullName: '',
        rollNo: '',
        studentCode: '',
        gender: 'MALE',
        dateOfBirth: '',
        fatherName: '',
        motherName: '',
        familyName: '',
        village: '',
        phone: '',
        school: '',
        schoolStandard: '',
        bloodGroup: '',
        emergencyContact: '',
        catechismStatus: 'ACTIVE',
        sacramentTrack: 'NONE',
        sacramentStatus: 'NONE',
      });
    },
  });

  const saveAttendance = useMutation({
    mutationFn: () =>
      api.post(`/catechism/classes/${selectedClassId}/attendance/bulk`, {
        date: new Date().toISOString().slice(0, 10),
        marks: Object.entries(attMap).map(([studentId, status]) => ({ studentId, status })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catechism-class', selectedClassId] });
      qc.invalidateQueries({ queryKey: ['catechism-dashboard'] });
    },
  });

  const byClassStrength = useMemo(() => {
    return (classesQ.data || []).slice(0, 8).map((c) => c._count?.students ?? c.students?.length ?? 0);
  }, [classesQ.data]);

  const lowAttendanceHint =
    (dash?.attendanceToday.rate ?? 100) < 75
      ? 'Attendance below 75% today — notify parents of absentees.'
      : 'Attendance looks healthy for today.';

  const communionEligible = students.filter(
    (s) => s.sacramentTrack === 'COMMUNION' && s.sacramentStatus === 'READY',
  ).length;
  const confirmationEligible = students.filter(
    (s) => s.sacramentTrack === 'CONFIRMATION' && s.sacramentStatus === 'READY',
  ).length;

  return (
    <div className="ecm">
      <header className="ecm-header ecm-glass">
        <div>
          <h1>Catechism Management</h1>
          <p>
            Manage classes, teachers, students, attendance, sacramental preparation and examinations.
          </p>
        </div>
        <div className="ecm-actions">
          <button
            type="button"
            className="ecm-btn ecm-btn--primary"
            onClick={() => {
              if (!selectedClassId) {
                setClassOpen(true);
                return;
              }
              setStudentOpen(true);
            }}
          >
            <UserPlus size={15} /> New Student
          </button>
          <button type="button" className="ecm-btn ecm-btn--accent" onClick={() => setClassOpen(true)}>
            <Plus size={15} /> New Class
          </button>
          <button
            type="button"
            className="ecm-btn"
            onClick={() => {
              setCenterTab('attendance');
            }}
          >
            <ClipboardCheck size={15} /> Take Attendance
          </button>
          <button
            type="button"
            className="ecm-btn"
            onClick={() => document.getElementById('ecm-import')?.click()}
          >
            <Upload size={15} /> Import Students
          </button>
          <input id="ecm-import" type="file" accept=".csv,.xlsx" hidden onChange={() => alert('Import pipeline ready for CSV / Excel upload.')} />
          <button type="button" className="ecm-btn" onClick={() => setReportsOpen(true)}>
            <FileBarChart size={15} /> Reports
          </button>
          <button type="button" className="ecm-btn" onClick={() => setAiOpen(true)}>
            <Bot size={15} /> AI
          </button>
        </div>
      </header>

      <section className="ecm-kpis">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              className="ecm-kpi"
              style={{ background: k.gradient }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="ecm-kpi__glow" />
              <div className="ecm-kpi__top">
                <div className="ecm-kpi__icon">
                  <Icon size={17} />
                </div>
                <span className="ecm-kpi__label">{k.label}</span>
              </div>
              <div className="ecm-kpi__value">
                <AnimatedCount value={k.value} />
                {k.suffix || ''}
              </div>
              <div className="ecm-kpi__meta">
                <span>{k.trend}</span>
                <span>{k.progress}%</span>
              </div>
              <div className="ecm-progress">
                <span style={{ width: `${Math.min(100, k.progress)}%` }} />
              </div>
            </motion.div>
          );
        })}
      </section>

      <div className="ecm-toolbar ecm-card">
        <div className="ecm-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, parent, teacher, class, village, family…"
          />
        </div>
        <div className="ecm-filters">
          <select className="ecm-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">Academic Year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select className="ecm-select" value={parishFilter} onChange={(e) => setParishFilter(e.target.value)}>
            <option value="all">Parish</option>
            {(parishes.data || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="ecm-select"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">Class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="ecm-select" value={sacramentFilter} onChange={(e) => setSacramentFilter(e.target.value)}>
            <option value="all">Sacrament</option>
            <option value="COMMUNION">Communion</option>
            <option value="CONFIRMATION">Confirmation</option>
            <option value="NONE">None</option>
          </select>
          <select className="ecm-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="GRADUATED">Graduated</option>
          </select>
        </div>
      </div>

      <div className="ecm-layout">
        {/* LEFT */}
        <aside className="ecm-card ecm-panel">
          <h3>Academic Years</h3>
          <div className="ecm-nav-list">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className={`ecm-nav-item ${yearFilter === y ? 'is-active' : ''}`}
                onClick={() => setYearFilter(y)}
              >
                {y}
                <span>{(classesQ.data || []).filter((c) => c.academicYear === y).length}</span>
              </button>
            ))}
          </div>

          <h3>Class List</h3>
          <div className="ecm-nav-list">
            {classes.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--bcl-muted)' }}>No classes yet.</div>
            )}
            {classes.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`ecm-nav-item ${selectedClassId === c.id ? 'is-active' : ''}`}
                onClick={() => {
                  setSelectedClassId(c.id);
                  setCenterTab('students');
                }}
              >
                <div>
                  <div style={{ fontWeight: 650 }}>{c.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--bcl-muted)' }}>
                    {c.grade || 'Grade'} {c.section ? `· Sec ${c.section}` : ''}
                  </div>
                </div>
                <span>{c._count?.students ?? c.students?.length ?? 0}</span>
              </button>
            ))}
          </div>

          <h3>Quick Navigation</h3>
          <div className="ecm-nav-list">
            {(
              [
                ['students', 'Students'],
                ['attendance', 'Attendance'],
                ['timetable', 'Timetable'],
                ['exams', 'Exams'],
                ['events', 'Events'],
                ['reports', 'Reports'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`ecm-nav-item ${centerTab === id ? 'is-active' : ''}`}
                onClick={() => setCenterTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <h3>Teachers</h3>
          <div className="ecm-nav-list">
            {teachers.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--bcl-muted)' }}>Assign teachers on new classes.</div>
            )}
            {teachers.map((t) => (
              <button
                key={t}
                type="button"
                className="ecm-nav-item"
                onClick={() => {
                  setCenterTab('teachers');
                  setSearch(t);
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </aside>

        {/* CENTER */}
        <main className="ecm-card ecm-panel">
          <div className="ecm-tabs">
            {(
              [
                ['students', 'Students'],
                ['attendance', 'Attendance'],
                ['class', 'Class Details'],
                ['timetable', 'Timetable'],
                ['teachers', 'Teachers'],
                ['exams', 'Exams'],
                ['events', 'Events'],
                ['reports', 'Reports'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={centerTab === id ? 'is-active' : ''} onClick={() => setCenterTab(id)}>
                {label}
              </button>
            ))}
          </div>

          <div className="ecm-center-head">
            <h2>
              {selectedClass
                ? `${selectedClass.name}${selectedClass.grade ? ` · ${selectedClass.grade}` : ''}${selectedClass.section ? `-${selectedClass.section}` : ''}`
                : 'Select a class'}
            </h2>
            {selectedClass && (
              <div style={{ fontSize: '0.8rem', color: 'var(--bcl-muted)' }}>
                {selectedClass.academicYear} · {selectedClass.teacherName || 'Teacher TBD'}
                {selectedClass.room ? ` · Room ${selectedClass.room}` : ''}
              </div>
            )}
          </div>

          {!selectedClassId && (
            <div className="ecm-empty">
              <strong>No class selected</strong>
              Create a class to begin the academic structure: Year → Grade → Section → Teacher → Students.
            </div>
          )}

          {selectedClassId && centerTab === 'students' && (
            <div className="ecm-table-wrap">
              <table className="ecm-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll</th>
                    <th>Family / Village</th>
                    <th>Sacrament</th>
                    <th>Status</th>
                    <th>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="ecm-empty">
                          <strong>No students</strong>
                          Add students or adjust filters.
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredStudents.map((s) => {
                    const badge = sacramentBadge(s.sacramentTrack);
                    return (
                      <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setProfile(s)}>
                        <td>
                          <div className="ecm-person">
                            <div className="ecm-avatar">
                              {s.photoUrl ? <img src={s.photoUrl} alt="" /> : initials(s.fullName)}
                            </div>
                            <div>
                              <strong>{s.fullName}</strong>
                              <span>{s.phone || s.school || 'Profile'}</span>
                            </div>
                          </div>
                        </td>
                        <td>{s.rollNo || '—'}</td>
                        <td>
                          {s.familyName || s.fatherName || '—'}
                          <div style={{ fontSize: '0.72rem', color: 'var(--bcl-muted)' }}>{s.village || ''}</div>
                        </td>
                        <td>
                          <span className={`ecm-badge ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td>
                          <span className="ecm-badge ecm-badge--teal">{s.catechismStatus || 'ACTIVE'}</span>
                        </td>
                        <td>{ageFromDob(s.dateOfBirth)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedClassId && centerTab === 'attendance' && (
            <div>
              <div className="ecm-center-head">
                <div style={{ fontSize: '0.82rem', color: 'var(--bcl-muted)' }}>
                  Mark Present · Absent · Late · Excused · Bulk save · QR / Mobile ready
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="ecm-btn"
                    onClick={() => {
                      const next: Record<string, AttStatus> = {};
                      students.forEach((s) => {
                        next[s.id] = 'PRESENT';
                      });
                      setAttMap(next);
                    }}
                  >
                    Mark all present
                  </button>
                  <button
                    type="button"
                    className="ecm-btn ecm-btn--primary"
                    disabled={saveAttendance.isPending || students.length === 0}
                    onClick={() => saveAttendance.mutate()}
                  >
                    <CheckCircle2 size={14} />
                    {saveAttendance.isPending ? 'Saving…' : 'Save Attendance'}
                  </button>
                </div>
              </div>
              <div className="ecm-att-grid">
                {students.map((s) => (
                  <div key={s.id} className="ecm-att-row">
                    <div className="ecm-person">
                      <div className="ecm-avatar">{initials(s.fullName)}</div>
                      <div>
                        <strong>{s.fullName}</strong>
                        <span>Roll {s.rollNo || '—'} · {s.familyName || s.fatherName || 'Family'}</span>
                      </div>
                    </div>
                    <div className="ecm-att-statuses">
                      {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as AttStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          data-s={st}
                          className={`ecm-att-btn ${attMap[s.id] === st ? 'is-active' : ''}`}
                          onClick={() => setAttMap((m) => ({ ...m, [s.id]: st }))}
                        >
                          {st[0] + st.slice(1).toLowerCase()}
                        </button>
                      ))}
                      <button type="button" className="ecm-att-btn" title="QR Attendance">
                        <QrCode size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {students.length === 0 && (
                  <div className="ecm-empty">
                    <strong>No students to mark</strong>
                    Add students first.
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedClassId && centerTab === 'class' && selectedClass && (
            <div className="ecm-form-grid" style={{ maxWidth: 720 }}>
              <div className="ecm-field">
                <label>Class Name</label>
                <input value={selectedClass.name} readOnly />
              </div>
              <div className="ecm-field">
                <label>Academic Year</label>
                <input value={selectedClass.academicYear} readOnly />
              </div>
              <div className="ecm-field">
                <label>Grade</label>
                <input value={selectedClass.grade || '—'} readOnly />
              </div>
              <div className="ecm-field">
                <label>Section</label>
                <input value={selectedClass.section || '—'} readOnly />
              </div>
              <div className="ecm-field">
                <label>Teacher</label>
                <input value={selectedClass.teacherName || '—'} readOnly />
              </div>
              <div className="ecm-field">
                <label>Assistant Teacher</label>
                <input value={selectedClass.assistantTeacher || '—'} readOnly />
              </div>
              <div className="ecm-field">
                <label>Maximum Students</label>
                <input value={selectedClass.maxStudents ?? '—'} readOnly />
              </div>
              <div className="ecm-field">
                <label>Room</label>
                <input value={selectedClass.room || '—'} readOnly />
              </div>
              <div className="ecm-field full">
                <label>Schedule</label>
                <input value={selectedClass.schedule || '—'} readOnly />
              </div>
              <div className="ecm-field full">
                <label>Notes</label>
                <textarea value={selectedClass.notes || ''} readOnly />
              </div>
              <div className="full" style={{ fontSize: '0.82rem', color: 'var(--bcl-muted)' }}>
                Structure: {selectedClass.academicYear} → {selectedClass.grade || 'Grade'} → Section{' '}
                {selectedClass.section || '—'} → {selectedClass.teacherName || 'Teacher'} → {students.length}{' '}
                students
              </div>
            </div>
          )}

          {centerTab === 'timetable' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--bcl-muted)', marginTop: 0 }}>
                Sunday classes · Holiday calendar · Teacher & room allocation
              </p>
              <div className="ecm-timetable">
                <div className="ecm-tt-cell">Time</div>
                <div className="ecm-tt-cell">Hall A</div>
                <div className="ecm-tt-cell">Hall B</div>
                <div className="ecm-tt-cell">Outdoor</div>
                {['8:30', '9:30', '10:30'].flatMap((t) => {
                  const slots = classes.slice(0, 3);
                  const cells = [
                    <div key={`${t}-l`} className="ecm-tt-cell">
                      {t}
                    </div>,
                  ];
                  if (slots.length === 0) {
                    cells.push(
                      <div key={`${t}-a`} className="ecm-tt-cell">
                        —
                      </div>,
                      <div key={`${t}-b`} className="ecm-tt-cell">
                        —
                      </div>,
                      <div key={`${t}-c`} className="ecm-tt-cell">
                        —
                      </div>,
                    );
                  } else {
                    for (let i = 0; i < 3; i += 1) {
                      const c = slots[i];
                      cells.push(
                        <div key={`${t}-${i}`} className={`ecm-tt-cell ${i === 0 && c ? 'is-slot' : ''}`}>
                          {i === 0 && c ? (
                            <>
                              <strong>{c.name}</strong>
                              <div>{c.teacherName || 'Teacher'}</div>
                              <div style={{ color: 'var(--bcl-muted)' }}>{c.room || 'Room'}</div>
                            </>
                          ) : (
                            '—'
                          )}
                        </div>,
                      );
                    }
                  }
                  return cells;
                })}
              </div>
            </div>
          )}

          {centerTab === 'teachers' && (
            <div className="ecm-table-wrap">
              <table className="ecm-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Assigned Classes</th>
                    <th>Students</th>
                    <th>Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => {
                    const assigned = (classesQ.data || []).filter((c) => c.teacherName === t);
                    const count = assigned.reduce((n, c) => n + (c._count?.students ?? 0), 0);
                    return (
                      <tr key={t}>
                        <td>
                          <div className="ecm-person">
                            <div className="ecm-avatar">{initials(t)}</div>
                            <div>
                              <strong>{t}</strong>
                              <span>Catechist · Parish faculty</span>
                            </div>
                          </div>
                        </td>
                        <td>{assigned.map((c) => c.name).join(', ') || '—'}</td>
                        <td>{count}</td>
                        <td>{assigned[0]?.schedule || 'Sunday'}</td>
                      </tr>
                    );
                  })}
                  {teachers.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="ecm-empty">
                          <strong>No teachers listed</strong>
                          Add a teacher when creating a class.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {centerTab === 'exams' && (
            <div className="ecm-report-grid">
              {[
                ['Question Papers', 'Upload & print class papers'],
                ['Marks Entry', 'Record scores per student'],
                ['Grades & Ranking', 'Auto rank by class'],
                ['Results', 'Publish parent-facing results'],
                ['Certificate Eligibility', 'Link to sacrament readiness'],
                ['Report Cards', 'Attendance · exams · remarks'],
              ].map(([title, desc]) => (
                <button key={title} type="button" className="ecm-report-card">
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </button>
              ))}
            </div>
          )}

          {centerTab === 'events' && (
            <div className="ecm-report-grid">
              {[
                ['Retreat', 'Sacrament prep retreats'],
                ['Bible Quiz', 'Inter-class quiz'],
                ['Camp', 'Summer catechism camp'],
                ['Christmas Program', 'Parish cultural night'],
                ['Vacation Bible School', 'VBS week schedule'],
                ['Youth Gathering', 'Confirmation youth meet'],
              ].map(([title, desc]) => (
                <button key={title} type="button" className="ecm-report-card">
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </button>
              ))}
            </div>
          )}

          {centerTab === 'reports' && (
            <div className="ecm-report-grid">
              {[
                'Attendance',
                'Student List',
                'Teacher List',
                'Class Strength',
                'Sacrament Readiness',
                'Certificates',
                'Birthday Report',
                'Village Report',
                'Family Report',
              ].map((r) => (
                <button key={r} type="button" className="ecm-report-card" onClick={() => window.print()}>
                  <strong>{r}</strong>
                  <span>Export PDF · Print · Share</span>
                </button>
              ))}
            </div>
          )}
        </main>

        {/* RIGHT */}
        <aside className="ecm-right ecm-card ecm-panel">
          <h3>Today&apos;s Classes</h3>
          <div className="ecm-side-list">
            {(dash?.classesToday?.length ? dash.classesToday : classes.slice(0, 4)).map((c) => (
              <div key={c.id} className="ecm-side-item">
                <span className="ecm-side-item__bar" />
                <div>
                  <strong>{c.name}</strong>
                  <span>
                    {c.schedule || 'Sunday'} · {c.teacherName || 'Teacher'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <h3>Attendance Summary</h3>
          <div className="ecm-side-item" style={{ marginBottom: 12 }}>
            <span className="ecm-side-item__bar" style={{ background: '#059669' }} />
            <div>
              <strong>{dash?.attendanceToday.rate ?? 0}% present</strong>
              <span>
                {dash?.attendanceToday.present ?? 0} of {dash?.attendanceToday.marked ?? 0} marked today
              </span>
            </div>
          </div>

          <h3>Upcoming Sacraments</h3>
          <div className="ecm-side-list">
            <div className="ecm-side-item">
              <span className="ecm-side-item__bar" style={{ background: '#c4a35a' }} />
              <div>
                <strong>First Communion</strong>
                <span>{dash?.preparingCommunion ?? 0} preparing · {communionEligible} ready</span>
              </div>
            </div>
            <div className="ecm-side-item">
              <span className="ecm-side-item__bar" style={{ background: '#7c3aed' }} />
              <div>
                <strong>Confirmation</strong>
                <span>{dash?.preparingConfirmation ?? 0} preparing · {confirmationEligible} ready</span>
              </div>
            </div>
          </div>

          <h3>Teacher On Duty</h3>
          <div className="ecm-side-list">
            {(selectedClass?.teacherName ? [selectedClass.teacherName] : teachers.slice(0, 2)).map((t) => (
              <div key={t} className="ecm-side-item">
                <span className="ecm-side-item__bar" style={{ background: '#1d4ed8' }} />
                <div>
                  <strong>{t}</strong>
                  <span>Sunday duty · Catechist</span>
                </div>
              </div>
            ))}
          </div>

          <h3>Birthdays</h3>
          <div className="ecm-side-list">
            {(dash?.birthdaysToday || []).length === 0 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--bcl-muted)' }}>No student birthdays today.</div>
            )}
            {(dash?.birthdaysToday || []).map((b) => (
              <div key={b.id} className="ecm-side-item">
                <span className="ecm-side-item__bar" style={{ background: '#db2777' }} />
                <div>
                  <strong>
                    <Cake size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {b.fullName}
                  </strong>
                  <span>Celebrate in class</span>
                </div>
              </div>
            ))}
          </div>

          <h3>Quick Actions</h3>
          <div className="ecm-nav-list">
            <button type="button" className="ecm-nav-item" onClick={() => setCenterTab('attendance')}>
              <ClipboardCheck size={14} /> Take Attendance
            </button>
            <button type="button" className="ecm-nav-item" onClick={() => setStudentOpen(true)}>
              <UserPlus size={14} /> Add Student
            </button>
            <button type="button" className="ecm-nav-item">
              <MessageSquare size={14} /> Message Parents
            </button>
            <button type="button" className="ecm-nav-item">
              <Bell size={14} /> Attendance Alert
            </button>
          </div>

          <h3>Announcements</h3>
          <div className="ecm-ai-card">
            <strong>Parent channel</strong>
            <p>SMS · WhatsApp · Email · Push for attendance and sacrament updates.</p>
          </div>
        </aside>
      </div>

      {/* BOTTOM */}
      <section className="ecm-bottom">
        <div className="ecm-card">
          <h3>Attendance Trend</h3>
          <div className="ecm-bars">
            {[62, 70, 68, 75, 80, 72, dash?.attendanceToday.rate || 65].map((v, i) => (
              <span key={i} style={{ height: `${Math.max(10, v)}%` }} />
            ))}
          </div>
        </div>
        <div className="ecm-card">
          <h3>Students by Class</h3>
          <div className="ecm-bars">
            {(byClassStrength.length ? byClassStrength : [3, 5, 2, 4]).map((v, i) => (
              <span key={i} style={{ height: `${Math.max(10, (v / Math.max(1, ...byClassStrength, 5)) * 100)}%` }} />
            ))}
          </div>
        </div>
        <div className="ecm-card">
          <h3>Communion Progress</h3>
          <div className="ecm-progress" style={{ background: '#f1f5f9', marginTop: 18 }}>
            <span
              style={{
                width: `${Math.min(100, (dash?.preparingCommunion || 0) * 12 + 20)}%`,
                background: 'linear-gradient(90deg,#c4a35a,#92400e)',
              }}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--bcl-muted)' }}>
            {dash?.preparingCommunion ?? 0} preparing
          </div>
        </div>
        <div className="ecm-card">
          <h3>Confirmation Progress</h3>
          <div className="ecm-progress" style={{ background: '#f1f5f9', marginTop: 18 }}>
            <span
              style={{
                width: `${Math.min(100, (dash?.preparingConfirmation || 0) * 12 + 18)}%`,
                background: 'linear-gradient(90deg,#a78bfa,#6d28d9)',
              }}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--bcl-muted)' }}>
            {dash?.preparingConfirmation ?? 0} preparing
          </div>
        </div>
        <div className="ecm-card">
          <h3>Teacher Workload</h3>
          <div className="ecm-bars">
            {teachers.slice(0, 6).map((t) => {
              const n = (classesQ.data || []).filter((c) => c.teacherName === t).length;
              return <span key={t} style={{ height: `${Math.max(15, n * 28)}%` }} title={t} />;
            })}
            {teachers.length === 0 && [40, 55, 35].map((v, i) => <span key={i} style={{ height: `${v}%` }} />)}
          </div>
        </div>
      </section>

      {/* NEW CLASS DRAWER */}
      <AnimatePresence>
        {classOpen && (
          <>
            <motion.div className="ecm-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setClassOpen(false)} />
            <motion.aside
              className="ecm-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="ecm-drawer__head">
                <h2>New Class</h2>
                <button type="button" className="ecm-btn ecm-btn--ghost" onClick={() => setClassOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="ecm-drawer__body">
                <div className="ecm-form-grid">
                  <div className="ecm-field">
                    <ParishScopeField
                      value={classForm.parishId}
                      onChange={(parishId) => setClassForm((f) => ({ ...f, parishId }))}
                      required
                      variant="native"
                    />
                  </div>
                  <div className="ecm-field">
                    <label>Academic Year</label>
                    <input value={classForm.academicYear} onChange={(e) => setClassForm({ ...classForm, academicYear: e.target.value })} />
                  </div>
                  <div className="ecm-field full">
                    <label>Class Name</label>
                    <input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="Grade 1 · Faith Foundations" />
                  </div>
                  <div className="ecm-field">
                    <label>Grade</label>
                    <select value={classForm.grade} onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })}>
                      {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Confirmation', 'Communion'].map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ecm-field">
                    <label>Section</label>
                    <select value={classForm.section} onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}>
                      {['A', 'B', 'C', 'D'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ecm-field">
                    <label>Teacher</label>
                    <input value={classForm.teacherName} onChange={(e) => setClassForm({ ...classForm, teacherName: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Assistant Teacher</label>
                    <input value={classForm.assistantTeacher} onChange={(e) => setClassForm({ ...classForm, assistantTeacher: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Max Students</label>
                    <input value={classForm.maxStudents} onChange={(e) => setClassForm({ ...classForm, maxStudents: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Room</label>
                    <input value={classForm.room} onChange={(e) => setClassForm({ ...classForm, room: e.target.value })} />
                  </div>
                  <div className="ecm-field full">
                    <label>Schedule</label>
                    <input value={classForm.schedule} onChange={(e) => setClassForm({ ...classForm, schedule: e.target.value })} />
                  </div>
                  <div className="ecm-field full">
                    <label>Notes</label>
                    <textarea value={classForm.notes} onChange={(e) => setClassForm({ ...classForm, notes: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="ecm-drawer__foot">
                <button type="button" className="ecm-btn" onClick={() => setClassOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="ecm-btn ecm-btn--primary"
                  disabled={!classForm.parishId || !classForm.name || createClass.isPending}
                  onClick={() => createClass.mutate()}
                >
                  {createClass.isPending ? 'Saving…' : 'Create Class'}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* NEW STUDENT DRAWER */}
      <AnimatePresence>
        {studentOpen && (
          <>
            <motion.div className="ecm-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setStudentOpen(false)} />
            <motion.aside
              className="ecm-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="ecm-drawer__head">
                <h2>New Student</h2>
                <button type="button" className="ecm-btn ecm-btn--ghost" onClick={() => setStudentOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="ecm-drawer__body">
                {!selectedClassId && (
                  <div className="ecm-ai-card" style={{ marginBottom: 12 }}>
                    <strong>Select a class first</strong>
                    <p>Students must belong to a catechism class.</p>
                  </div>
                )}
                <div className="ecm-form-grid">
                  <p className="ecm-section">Profile</p>
                  <div className="ecm-field full">
                    <label>Full Name</label>
                    <input value={studentForm.fullName} onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Student ID</label>
                    <input value={studentForm.studentCode} onChange={(e) => setStudentForm({ ...studentForm, studentCode: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Roll No</label>
                    <input value={studentForm.rollNo} onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Gender</label>
                    <select value={studentForm.gender} onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div className="ecm-field">
                    <label>Date of Birth</label>
                    <input type="date" value={studentForm.dateOfBirth} onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })} />
                  </div>
                  <p className="ecm-section">Family & Contact</p>
                  <div className="ecm-field">
                    <label>Father</label>
                    <input value={studentForm.fatherName} onChange={(e) => setStudentForm({ ...studentForm, fatherName: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Mother</label>
                    <input value={studentForm.motherName} onChange={(e) => setStudentForm({ ...studentForm, motherName: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Family</label>
                    <input value={studentForm.familyName} onChange={(e) => setStudentForm({ ...studentForm, familyName: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Village</label>
                    <input value={studentForm.village} onChange={(e) => setStudentForm({ ...studentForm, village: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Phone</label>
                    <input value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Emergency Contact</label>
                    <input value={studentForm.emergencyContact} onChange={(e) => setStudentForm({ ...studentForm, emergencyContact: e.target.value })} />
                  </div>
                  <p className="ecm-section">School & Sacrament</p>
                  <div className="ecm-field">
                    <label>School</label>
                    <input value={studentForm.school} onChange={(e) => setStudentForm({ ...studentForm, school: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Standard</label>
                    <input value={studentForm.schoolStandard} onChange={(e) => setStudentForm({ ...studentForm, schoolStandard: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Blood Group</label>
                    <input value={studentForm.bloodGroup} onChange={(e) => setStudentForm({ ...studentForm, bloodGroup: e.target.value })} />
                  </div>
                  <div className="ecm-field">
                    <label>Catechism Status</label>
                    <select value={studentForm.catechismStatus} onChange={(e) => setStudentForm({ ...studentForm, catechismStatus: e.target.value })}>
                      {['ACTIVE', 'INACTIVE', 'GRADUATED'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ecm-field">
                    <label>Sacrament Track</label>
                    <select value={studentForm.sacramentTrack} onChange={(e) => setStudentForm({ ...studentForm, sacramentTrack: e.target.value })}>
                      <option value="NONE">None</option>
                      <option value="COMMUNION">First Holy Communion</option>
                      <option value="CONFIRMATION">Confirmation</option>
                    </select>
                  </div>
                  <div className="ecm-field">
                    <label>Sacrament Status</label>
                    <select value={studentForm.sacramentStatus} onChange={(e) => setStudentForm({ ...studentForm, sacramentStatus: e.target.value })}>
                      {['NONE', 'PREPARING', 'READY', 'COMPLETED'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="ecm-drawer__foot">
                <button type="button" className="ecm-btn" onClick={() => setStudentOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="ecm-btn ecm-btn--primary"
                  disabled={!selectedClassId || !studentForm.fullName.trim() || addStudent.isPending}
                  onClick={() => addStudent.mutate()}
                >
                  {addStudent.isPending ? 'Saving…' : 'Add Student'}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* STUDENT PROFILE */}
      <AnimatePresence>
        {profile && (
          <>
            <motion.div className="ecm-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setProfile(null)} />
            <motion.aside
              className="ecm-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="ecm-drawer__head">
                <h2>Student Profile</h2>
                <button type="button" className="ecm-btn ecm-btn--ghost" onClick={() => setProfile(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="ecm-drawer__body">
                <div className="ecm-person" style={{ marginBottom: 16 }}>
                  <div className="ecm-avatar" style={{ width: 56, height: 56, fontSize: '1.1rem' }}>
                    {profile.photoUrl ? <img src={profile.photoUrl} alt="" /> : initials(profile.fullName)}
                  </div>
                  <div>
                    <strong style={{ fontSize: '1.1rem' }}>{profile.fullName}</strong>
                    <span>
                      {profile.studentCode || profile.rollNo || 'ID pending'} · Age {ageFromDob(profile.dateOfBirth)}
                    </span>
                  </div>
                </div>
                <div className="ecm-form-grid">
                  {[
                    ['Gender', profile.gender],
                    ['DOB', profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-IN') : '—'],
                    ['Father', profile.fatherName],
                    ['Mother', profile.motherName],
                    ['Family', profile.familyName],
                    ['Village', profile.village],
                    ['Phone', profile.phone],
                    ['School', profile.school],
                    ['Standard', profile.schoolStandard],
                    ['Blood Group', profile.bloodGroup],
                    ['Emergency', profile.emergencyContact],
                    ['Catechism', profile.catechismStatus],
                    ['Sacrament', `${profile.sacramentTrack} · ${profile.sacramentStatus}`],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="ecm-field">
                      <label>{label}</label>
                      <input value={String(value || '—')} readOnly />
                    </div>
                  ))}
                </div>
                <div className="ecm-ai-card" style={{ marginTop: 12 }}>
                  <strong>Sacrament preparation track</strong>
                  <p>Attendance · Lessons · Retreat · Interview · Approval · Certificate</p>
                </div>
              </div>
              <div className="ecm-drawer__foot">
                <button type="button" className="ecm-btn" onClick={() => setCenterTab('attendance')}>
                  Attendance
                </button>
                <button type="button" className="ecm-btn ecm-btn--primary" onClick={() => setProfile(null)}>
                  Close
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* REPORTS / AI */}
      <AnimatePresence>
        {reportsOpen && (
          <>
            <motion.div className="ecm-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReportsOpen(false)} />
            <motion.aside
              className="ecm-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="ecm-drawer__head">
                <h2>Reports</h2>
                <button type="button" className="ecm-btn ecm-btn--ghost" onClick={() => setReportsOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="ecm-drawer__body">
                <div className="ecm-report-grid" style={{ gridTemplateColumns: '1fr' }}>
                  {[
                    'Attendance Report',
                    'Student List',
                    'Teacher List',
                    'Class Strength',
                    'Sacrament Readiness',
                    'Certificates',
                    'Birthday Report',
                    'Village Report',
                    'Family Report',
                  ].map((r) => (
                    <button key={r} type="button" className="ecm-report-card" onClick={() => window.print()}>
                      <strong>{r}</strong>
                      <span>Print · PDF · Share with parish office</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aiOpen && (
          <>
            <motion.div className="ecm-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAiOpen(false)} />
            <motion.aside
              className="ecm-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="ecm-drawer__head">
                <h2>
                  <Sparkles size={18} style={{ display: 'inline', marginRight: 6 }} />
                  AI Assistant
                </h2>
                <button type="button" className="ecm-btn ecm-btn--ghost" onClick={() => setAiOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="ecm-drawer__body">
                <div className="ecm-ai-card">
                  <strong>
                    <AlertTriangle size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Detect low attendance
                  </strong>
                  <p>{lowAttendanceHint}</p>
                </div>
                <div className="ecm-ai-card">
                  <strong>Communion eligibility</strong>
                  <p>
                    {communionEligible} student(s) marked READY for First Holy Communion in this class.
                  </p>
                </div>
                <div className="ecm-ai-card">
                  <strong>Confirmation eligibility</strong>
                  <p>
                    {confirmationEligible} student(s) marked READY for Confirmation in this class.
                  </p>
                </div>
                <div className="ecm-ai-card">
                  <strong>Attendance summary</strong>
                  <p>
                    Today: {dash?.attendanceToday.present ?? 0} present of {dash?.attendanceToday.marked ?? 0}{' '}
                    marked ({dash?.attendanceToday.rate ?? 0}%).
                  </p>
                </div>
                <div className="ecm-ai-card">
                  <strong>Parent communication</strong>
                  <p>
                    Draft: “Dear parents, catechism attendance for {selectedClass?.name || "your child's class"} is
                    updated. Please ensure Sunday presence. — Parish Catechism Desk”
                  </p>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--bcl-muted)', display: 'flex', gap: 6, marginTop: 8 }}>
                  <School size={14} /> Android: attendance · marks · photos · messages · profiles · reports
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
