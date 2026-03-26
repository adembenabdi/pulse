'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, Label, Select, Modal, Tabs, EmptyState, TextArea } from '@/components/ui/primitives';
import { GraduationCap, Plus, Clock, MapPin, User, Calendar, Trash2, Link, ExternalLink, BookOpen, RefreshCw, Timer, Play, Pause, Square, RotateCcw, ChevronDown, ChevronRight, CheckSquare, FileText, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import type { Course, StudySession, ModuleChapter, ChapterTask, StudyExam, ExamType, TaskType } from '@/types';
import { format } from 'date-fns';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COURSE_COLORS = ['#A855F7', '#06B6D4', '#34D399', '#FBBF24', '#F87171', '#8B5CF6', '#FB923C', '#D946EF', '#6366F1', '#0891B2'];

const EXAM_TYPE_CONFIG: Record<ExamType, { label: string; color: string; icon: string }> = {
  tp_test: { label: 'TP Test', color: '#06B6D4', icon: '🧪' },
  td_test: { label: 'TD Test', color: '#FBBF24', icon: '📝' },
  exam: { label: 'Exam (EMD)', color: '#F87171', icon: '📋' },
  project: { label: 'Project', color: '#8B5CF6', icon: '💻' },
  presentation: { label: 'Presentation', color: '#34D399', icon: '🎤' },
};

const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: string }> = {
  study: { label: 'Lecture', icon: '📖' },
  td: { label: 'TD', icon: '✏️' },
  tp: { label: 'TP', icon: '🧪' },
  review: { label: 'Review', icon: '🔄' },
  custom: { label: 'Custom', icon: '📌' },
};

function mapCourse(c: Record<string, unknown>): Course {
  return {
    id: c.id as string,
    name: c.name as string,
    code: (c.code || '') as string,
    professor: (c.professor || '') as string,
    room: (c.room || '') as string,
    color: (c.color || '#A855F7') as string,
    day: c.day as number,
    startTime: (c.start_time || '') as string,
    endTime: (c.end_time || '') as string,
    type: (c.type || 'lecture') as Course['type'],
    sourceId: (c.source_id || null) as string | null,
    semester: (c.semester || null) as string | null,
  };
}

function mapSession(s: Record<string, unknown>): StudySession {
  return {
    id: s.id as string,
    courseId: (s.course_id || '') as string,
    courseName: (s.course_name || '') as string,
    courseColor: (s.course_color || '') as string,
    date: s.date as string,
    duration: s.duration as number,
    topic: (s.topic || '') as string,
    notes: (s.notes || '') as string,
    completed: (s.completed ?? true) as boolean,
  };
}

function mapChapter(c: Record<string, unknown>): ModuleChapter {
  const tasks = (c.chapter_tasks as Record<string, unknown>[]) || [];
  return {
    id: c.id as string,
    courseName: c.course_name as string,
    title: c.title as string,
    orderIndex: (c.order_index || 0) as number,
    tasks: tasks.map(t => ({
      id: t.id as string,
      chapterId: t.chapter_id as string,
      title: t.title as string,
      taskType: (t.task_type || 'custom') as TaskType,
      isPreset: (t.is_preset ?? false) as boolean,
      completed: (t.completed ?? false) as boolean,
    })),
  };
}

function mapExam(e: Record<string, unknown>): StudyExam {
  return {
    id: e.id as string,
    courseName: e.course_name as string,
    title: e.title as string,
    examType: (e.exam_type || 'exam') as ExamType,
    date: e.date as string,
    startTime: (e.start_time || null) as string | null,
    room: (e.room || '') as string,
    notes: (e.notes || '') as string,
  };
}

export default function StudyPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('schedule');
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [newCourse, setNewCourse] = useState({
    name: '', code: '', professor: '', room: '',
    day: new Date().getDay(), startTime: '08:00', endTime: '09:30',
    type: 'lecture' as Course['type'],
    semester: '' as string,
  });
  const [newSession, setNewSession] = useState({
    courseId: '', duration: 60, topic: '', notes: '',
  });

  // Chapters & Exams state
  const [chapters, setChapters] = useState<ModuleChapter[]>([]);
  const [exams, setExams] = useState<StudyExam[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [showAddChapter, setShowAddChapter] = useState<string | null>(null); // course_name or null
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null); // chapter id
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddExam, setShowAddExam] = useState(false);
  const [newExam, setNewExam] = useState({
    courseName: '', title: '', examType: 'exam' as ExamType, date: '', startTime: '', room: '', notes: '',
  });
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [studyTaskFilter, setStudyTaskFilter] = useState<TaskType | 'all'>('all');
  const [studyModuleView, setStudyModuleView] = useState<string | null>(null);

  // Pomodoro state
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroId, setPomodoroId] = useState<string | null>(null);
  const [pomoDuration, setPomoDuration] = useState(25); // minutes
  const [pomoBreak, setPomoBreak] = useState(5);
  const [pomoLabel, setPomoLabel] = useState('');
  const [pomoTimeLeft, setPomoTimeLeft] = useState(25 * 60); // seconds
  const [pomoPaused, setPomoPaused] = useState(false);
  const [pomoIsBreak, setPomoIsBreak] = useState(false);
  const [pomoStats, setPomoStats] = useState({ today: 0, total: 0, totalMinutes: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await api.study.courses.get();
      setCourses(data.map(mapCourse));
    } catch (err) {
      console.error('Failed to load courses', err);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await api.study.sessions.get();
      setSessions(data.map(mapSession));
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  }, []);

  const fetchChapters = useCallback(async () => {
    try {
      const data = await api.study.chapters.get();
      setChapters(data.map(mapChapter));
    } catch (err) {
      console.error('Failed to load chapters', err);
    }
  }, []);

  const fetchExams = useCallback(async () => {
    try {
      const data = await api.study.exams.get();
      setExams(data.map(mapExam));
    } catch (err) {
      console.error('Failed to load exams', err);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchCourses(), fetchSessions(), fetchChapters(), fetchExams()]).finally(() => setLoading(false));
  }, [user, fetchCourses, fetchSessions, fetchChapters, fetchExams]);

  // Load pomodoro stats
  useEffect(() => {
    if (!user) return;
    api.pomodoro.stats().then(data => {
      const d = data as { today_sessions?: number; total_sessions?: number; total_minutes?: number };
      setPomoStats({
        today: d.today_sessions || 0,
        total: d.total_sessions || 0,
        totalMinutes: d.total_minutes || 0,
      });
    }).catch(() => {});
  }, [user, pomodoroActive]);

  // Timer countdown
  useEffect(() => {
    if (pomodoroActive && !pomoPaused && pomoTimeLeft > 0) {
      timerRef.current = setInterval(() => {
        setPomoTimeLeft(t => t - 1);
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    if (pomoTimeLeft === 0 && pomodoroActive) {
      // Timer finished
      if (!pomoIsBreak && pomodoroId) {
        api.pomodoro.complete(pomodoroId).catch(() => {});
        setPomodoroId(null);
        // Start break
        setPomoIsBreak(true);
        setPomoTimeLeft(pomoBreak * 60);
      } else {
        // Break finished
        setPomodoroActive(false);
        setPomoIsBreak(false);
        setPomoTimeLeft(pomoDuration * 60);
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pomodoroActive, pomoPaused, pomoTimeLeft, pomoIsBreak, pomodoroId, pomoBreak, pomoDuration]);

  const startPomodoro = async (label?: string, sessionId?: string) => {
    try {
      const result = await api.pomodoro.start({
        duration: pomoDuration,
        break_duration: pomoBreak,
        study_session_id: sessionId,
        label: label || pomoLabel || undefined,
      }) as { id: string };
      setPomodoroId(result.id);
      setPomodoroActive(true);
      setPomoPaused(false);
      setPomoIsBreak(false);
      setPomoTimeLeft(pomoDuration * 60);
      if (label) setPomoLabel(label);
    } catch { /* silent */ }
  };

  const cancelPomodoro = async () => {
    if (pomodoroId) {
      await api.pomodoro.cancel(pomodoroId).catch(() => {});
    }
    setPomodoroActive(false);
    setPomodoroId(null);
    setPomoPaused(false);
    setPomoIsBreak(false);
    setPomoTimeLeft(pomoDuration * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const result = await api.schedule.sync();
      if (result.synced) {
        setSyncMsg(`Synced ${result.courses} courses`);
        fetchCourses();
      } else if (result.reason === 'no_url') {
        setSyncMsg('Set your timetable URL in Settings first');
      } else if (result.reason === 'no_changes') {
        setSyncMsg('Already up to date');
      } else {
        setSyncMsg('Sync failed');
      }
    } catch {
      setSyncMsg('Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  };

  // ── Chapter handlers ──
  const addChapter = async (courseName: string) => {
    if (!newChapterTitle.trim()) return;
    try {
      const moduleChapters = chapters.filter(c => c.courseName.toLowerCase() === courseName.toLowerCase());
      const data = await api.study.chapters.create({
        course_name: courseName,
        title: newChapterTitle.trim(),
        order_index: moduleChapters.length,
      });
      setChapters(prev => [...prev, mapChapter(data)]);
      setNewChapterTitle('');
      setShowAddChapter(null);
    } catch (err) {
      console.error('Failed to create chapter', err);
    }
  };

  const deleteChapter = async (id: string) => {
    try {
      await api.study.chapters.delete(id);
      setChapters(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete chapter', err);
    }
  };

  const addChapterTask = async (chapterId: string) => {
    if (!newTaskTitle.trim()) return;
    try {
      const data = await api.study.chapters.addTask(chapterId, newTaskTitle.trim(), 'custom');
      const task: ChapterTask = {
        id: data.id as string,
        chapterId: data.chapter_id as string,
        title: data.title as string,
        taskType: (data.task_type || 'custom') as TaskType,
        isPreset: false,
        completed: false,
      };
      setChapters(prev => prev.map(c =>
        c.id === chapterId ? { ...c, tasks: [...c.tasks, task] } : c
      ));
      setNewTaskTitle('');
      setAddingTaskFor(null);
    } catch (err) {
      console.error('Failed to add task', err);
    }
  };

  const toggleChapterTask = async (taskId: string, completed: boolean) => {
    try {
      await api.study.chapterTasks.update(taskId, { completed });
      setChapters(prev => prev.map(ch => ({
        ...ch,
        tasks: ch.tasks.map(t => t.id === taskId ? { ...t, completed } : t),
      })));
    } catch (err) {
      console.error('Failed to toggle task', err);
    }
  };

  const deleteChapterTask = async (taskId: string, chapterId: string) => {
    try {
      await api.study.chapterTasks.delete(taskId);
      setChapters(prev => prev.map(ch =>
        ch.id === chapterId ? { ...ch, tasks: ch.tasks.filter(t => t.id !== taskId) } : ch
      ));
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  const toggleModuleExpand = (key: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Exam handlers ──
  const addExam = async () => {
    if (!newExam.courseName || !newExam.title.trim() || !newExam.date) return;
    try {
      const data = await api.study.exams.create({
        course_name: newExam.courseName,
        title: newExam.title.trim(),
        exam_type: newExam.examType,
        date: newExam.date,
        start_time: newExam.startTime || null,
        room: newExam.room.trim(),
        notes: newExam.notes.trim(),
      });
      setExams(prev => [...prev, mapExam(data)]);
      setShowAddExam(false);
      setNewExam({ courseName: '', title: '', examType: 'exam', date: '', startTime: '', room: '', notes: '' });
    } catch (err) {
      console.error('Failed to create exam', err);
    }
  };

  const deleteExam = async (id: string) => {
    try {
      await api.study.exams.delete(id);
      setExams(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete exam', err);
    }
  };

  const addCourse = async () => {
    if (!user || !newCourse.name.trim()) return;
    try {
      const data = await api.study.courses.create({
        name: newCourse.name.trim(),
        code: newCourse.code.trim(),
        professor: newCourse.professor.trim(),
        room: newCourse.room.trim(),
        color: COURSE_COLORS[courses.length % COURSE_COLORS.length],
        day: newCourse.day,
        start_time: newCourse.startTime,
        end_time: newCourse.endTime,
        type: newCourse.type,
        semester: newCourse.semester || null,
      });
      setCourses(prev => [...prev, mapCourse(data)]);
      setShowAddCourse(false);
      setNewCourse({ name: '', code: '', professor: '', room: '', day: new Date().getDay(), startTime: '08:00', endTime: '09:30', type: 'lecture', semester: '' });
    } catch (err) {
      console.error('Failed to create course', err);
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      await api.study.courses.delete(id);
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete course', err);
    }
  };

  const addSession = async () => {
    if (!user || !newSession.courseId) return;
    try {
      const data = await api.study.sessions.create({
        course_id: newSession.courseId,
        date: format(new Date(), 'yyyy-MM-dd'),
        duration: newSession.duration,
        topic: newSession.topic.trim(),
        notes: newSession.notes.trim(),
        completed: true,
      });
      setSessions(prev => [mapSession(data), ...prev]);
      setShowAddSession(false);
      setNewSession({ courseId: '', duration: 60, topic: '', notes: '' });
    } catch (err) {
      console.error('Failed to create session', err);
    }
  };

  // Today's courses
  const todayDay = new Date().getDay();
  const todayCourses = courses
    .filter(c => c.day === todayDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Group courses by module name (so Algorithms-Cours + Algorithms-TD = 1 module)
  const allSemesters = [...new Set(courses.map(c => c.semester).filter(Boolean))] as string[];
  const filteredCourses = semesterFilter === 'all' ? courses : courses.filter(c => c.semester === semesterFilter);
  const groupedModules = filteredCourses.reduce<Record<string, Course[]>>((acc, c) => {
    const key = c.name.toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});
  const moduleNames = Object.keys(groupedModules);

  // Total study time
  const totalStudyHours = Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / 60);

  // Upcoming exams
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const upcomingExams = exams.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
  const pastExams = exams.filter(e => e.date < todayStr).sort((a, b) => b.date.localeCompare(a.date));

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study"
        description={`${user.field} — Year ${user.year}`}
        icon={<GraduationCap className="w-5 h-5" />}
      >
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Button variant="secondary" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Sync</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowAddExam(true)}><AlertTriangle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Exam</span></Button>
          <Button variant="secondary" size="sm" onClick={() => setShowAddSession(true)}><BookOpen className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Log</span></Button>
          <Button size="sm" onClick={() => setShowAddCourse(true)}><Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Course</span></Button>
        </div>
      </PageHeader>

      {syncMsg && (
        <Card variant="glass" className="p-3">
          <p className="text-sm text-[var(--foreground-muted)]">{syncMsg}</p>
        </Card>
      )}

      {/* Timetable link */}
      {user.timetableUrl && (
        <Card variant="glass" className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-sm text-[var(--foreground-muted)]">Your timetable link</span>
            </div>
            <a href={user.timetableUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-[var(--accent)] hover:text-[var(--accent-light)]">
              Open <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </Card>
      )}

      <Tabs
        tabs={[
          { id: 'schedule', label: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
          { id: 'courses', label: 'Modules', icon: <GraduationCap className="w-4 h-4" />, count: moduleNames.length },
          { id: 'exams', label: 'Exams', icon: <AlertTriangle className="w-4 h-4" />, count: upcomingExams.length },
          { id: 'sessions', label: 'Study Log', icon: <BookOpen className="w-4 h-4" />, count: sessions.length },
          { id: 'pomodoro', label: 'Focus Timer', icon: <Timer className="w-4 h-4" /> },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'schedule' && (
        <div className="space-y-4">
          {/* Today's classes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="primary">{DAY_NAMES[todayDay]}</Badge>
              <span className="text-xs sm:text-sm text-[var(--foreground-muted)]">
                {todayCourses.length} class{todayCourses.length !== 1 ? 'es' : ''} today
              </span>
            </div>

            {todayCourses.length === 0 ? (
              <Card className="p-4 sm:p-6 text-center">
                <p className="text-sm text-[var(--foreground-muted)]">No classes today! 🎉</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {todayCourses.map((course, i) => (
                  <motion.div key={course.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card variant="interactive" depth className="p-3 sm:p-4" style={{ borderLeftWidth: 3, borderLeftColor: course.color }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm sm:text-base text-[var(--foreground)] truncate">{course.name}</p>
                            <Badge variant="outline">{course.type.toUpperCase()}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs text-[var(--foreground-muted)]">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.startTime} - {course.endTime}</span>
                            {course.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {course.room}</span>}
                            {course.professor && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {course.professor}</span>}
                          </div>
                        </div>
                        <div className="w-3 h-3 rounded-full" style={{ background: course.color }} />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly timetable */}
          <div>
            <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-3">Weekly Overview</p>
            <div className="grid grid-cols-1 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const dayCourses = courses.filter(c => c.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
                if (dayCourses.length === 0) return null;
                return (
                  <Card key={day} variant={day === todayDay ? 'elevated' : 'default'} className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={day === todayDay ? 'primary' : 'outline'}>{DAY_NAMES[day]}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dayCourses.map(course => (
                        <div key={course.id} className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--background-surface)]">
                          <div className="w-2 h-2 rounded-full" style={{ background: course.color }} />
                          <span className="text-xs font-medium">{course.name}</span>
                          <span className="text-[10px] text-[var(--foreground-muted)]">{course.startTime}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'courses' && (
        <div className="space-y-4">
          {/* Semester filter */}
          {allSemesters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--foreground-muted)]">Semester:</span>
              <button onClick={() => setSemesterFilter('all')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${semesterFilter === 'all' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background-surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'}`}>All</button>
              {allSemesters.map(s => (
                <button key={s} onClick={() => setSemesterFilter(s)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${semesterFilter === s ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background-surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'}`}>{s}</button>
              ))}
            </div>
          )}

          {moduleNames.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="w-8 h-8" />}
              title="No courses added"
              description="Sync your timetable or add courses manually"
              action={
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button variant="secondary" onClick={handleSync} disabled={syncing}>
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sync Timetable
                  </Button>
                  <Button onClick={() => setShowAddCourse(true)}><Plus className="w-4 h-4" /> Add Course</Button>
                </div>
              }
            />
          ) : (
            <>
              {/* Module button grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {moduleNames.map((key, i) => {
                  const slots = groupedModules[key];
                  const first = slots[0];
                  const moduleChapters = chapters.filter(c => c.courseName.toLowerCase() === key);
                  const totalTasks = moduleChapters.reduce((sum, c) => sum + c.tasks.length, 0);
                  const doneTasks = moduleChapters.reduce((sum, c) => sum + c.tasks.filter(t => t.completed).length, 0);
                  const moduleExams = exams.filter(e => e.courseName.toLowerCase() === key);
                  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                  const isSelected = selectedModule === key;
                  return (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedModule(isSelected ? null : key)}
                      className={`relative text-left p-3 sm:p-4 rounded-xl border-2 transition-all active:scale-[0.97] ${
                        isSelected
                          ? 'border-[var(--primary)] bg-[var(--primary)]/.05 shadow-lg'
                          : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--foreground-muted)]/30 hover:shadow-md'
                      }`}
                    >
                      {/* Color accent bar */}
                      <div className="absolute top-0 left-3 right-3 h-1 rounded-b-full" style={{ background: first.color }} />

                      <div className="flex items-center gap-2 mb-2 mt-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${first.color}15`, color: first.color }}>
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        {moduleExams.length > 0 && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--danger)]/.15 text-[var(--danger)] font-medium">
                            {moduleExams.length} exam{moduleExams.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <p className="font-semibold text-xs sm:text-sm text-[var(--foreground)] truncate leading-tight">{first.name}</p>
                      {first.code && <p className="text-[10px] text-[var(--foreground-muted)] truncate">{first.code}</p>}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-[var(--foreground-muted)]">{moduleChapters.length} ch · {slots.length} slot{slots.length !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Mini progress bar */}
                      {totalTasks > 0 && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="flex-1 h-1 rounded-full bg-[var(--background-surface)]">
                            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: first.color }} />
                          </div>
                          <span className="text-[9px] font-bold" style={{ color: first.color }}>{progress}%</span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}

                {/* Add module button */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: moduleNames.length * 0.03 }}
                  onClick={() => setShowAddCourse(true)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all active:scale-[0.97] min-h-[100px]"
                >
                  <Plus className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-medium">Add Module</span>
                </motion.button>
              </div>

              {/* Selected module detail panel */}
              {selectedModule && (() => {
                const key = selectedModule;
                const slots = groupedModules[key];
                if (!slots) return null;
                const first = slots[0];
                const isSynced = slots.some(s => !!s.sourceId);
                const isManual = slots.every(s => !s.sourceId);
                const moduleChapters = chapters.filter(c => c.courseName.toLowerCase() === key);
                const totalTasks = moduleChapters.reduce((sum, c) => sum + c.tasks.length, 0);
                const doneTasks = moduleChapters.reduce((sum, c) => sum + c.tasks.filter(t => t.completed).length, 0);
                const moduleExams = exams.filter(e => e.courseName.toLowerCase() === key);
                const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card variant="elevated" className="overflow-hidden">
                      {/* Detail header */}
                      <div className="p-3 sm:p-4 flex items-center gap-3" style={{ borderBottom: `2px solid ${first.color}30` }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${first.color}15`, color: first.color }}>
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm sm:text-base text-[var(--foreground)]">{first.name}</p>
                            {isSynced && <Badge variant="primary" size="sm">Synced</Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-[var(--foreground-muted)] mt-0.5">
                            {first.code && <span>{first.code}</span>}
                            {first.professor && <span>• Prof. {first.professor}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isManual && (
                            <button
                              onClick={() => { slots.forEach(s => deleteCourse(s.id)); setSelectedModule(null); }}
                              className="p-1.5 rounded-lg hover:bg-[var(--background-surface)] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                            </button>
                          )}
                          <button onClick={() => setSelectedModule(null)} className="p-1.5 rounded-lg hover:bg-[var(--background-surface)] transition-colors">
                            <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" />
                          </button>
                        </div>
                      </div>

                      {/* Schedule + progress row */}
                      <div className="px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2 bg-[var(--background-surface)]/50">
                        {slots.map(slot => (
                          <span key={slot.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--card)] text-[var(--foreground-muted)]">
                            <span className="font-bold">{slot.type.toUpperCase()}</span>
                            <span>{DAY_NAMES[slot.day].slice(0, 3)} {slot.startTime}-{slot.endTime}</span>
                            {slot.room && <span>({slot.room})</span>}
                          </span>
                        ))}
                        {totalTasks > 0 && (
                          <span className="ml-auto text-[10px] font-semibold" style={{ color: first.color }}>
                            {doneTasks}/{totalTasks} tasks · {progress}%
                          </span>
                        )}
                      </div>

                      {/* Exam countdown if applicable */}
                      {(() => {
                        const nextExam = upcomingExams.find(e => e.courseName.toLowerCase() === key);
                        if (!nextExam || moduleChapters.length === 0) return null;
                        const daysUntil = Math.ceil((new Date(nextExam.date + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000);
                        const chaptersReviewed = moduleChapters.filter(c => c.tasks.length > 0 && c.tasks.every(t => t.completed)).length;
                        const examCfg = EXAM_TYPE_CONFIG[nextExam.examType] || EXAM_TYPE_CONFIG.exam;
                        return (
                          <div className="mx-3 sm:mx-4 mt-2 flex items-center gap-2 text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg" style={{ background: `${examCfg.color}10`, color: examCfg.color }}>
                            <span>{examCfg.icon}</span>
                            <span className="font-medium">
                              {nextExam.examType === 'exam' ? 'EMD' : examCfg.label} in {daysUntil}d — {chaptersReviewed}/{moduleChapters.length} chapters reviewed
                            </span>
                          </div>
                        );
                      })()}

                      {/* Chapters & tasks */}
                      <div className="px-3 sm:px-4 py-3 space-y-2">
                        {moduleChapters.length === 0 ? (
                          <p className="text-xs text-[var(--foreground-muted)] text-center py-3">No chapters yet. Add your first chapter to start tracking progress.</p>
                        ) : (
                          moduleChapters.map((chapter, ci) => (
                            <div key={chapter.id} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                                  <span className="text-xs sm:text-sm font-medium text-[var(--foreground)]">Ch {ci + 1}: {chapter.title}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--background-surface)] text-[var(--foreground-muted)]">
                                    {chapter.tasks.filter(t => t.completed).length}/{chapter.tasks.length}
                                  </span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => deleteChapter(chapter.id)}>
                                  <Trash2 className="w-3 h-3 text-[var(--danger)]" />
                                </Button>
                              </div>

                              <div className="ml-5 space-y-1">
                                {chapter.tasks.map(task => (
                                  <div key={task.id} className="flex items-center gap-2 group py-0.5">
                                    <button
                                      onClick={() => toggleChapterTask(task.id, !task.completed)}
                                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                                        task.completed
                                          ? 'bg-[var(--success)] border-[var(--success)] text-white'
                                          : 'border-[var(--border)] hover:border-[var(--primary)]'
                                      }`}
                                    >
                                      {task.completed && <CheckSquare className="w-3 h-3" />}
                                    </button>
                                    <span className="text-[10px]">{TASK_TYPE_CONFIG[task.taskType]?.icon || '📌'}</span>
                                    <span className={`text-xs flex-1 ${task.completed ? 'line-through text-[var(--foreground-muted)]' : 'text-[var(--foreground)]'}`}>
                                      {task.title}
                                    </span>
                                    {task.isPreset && <span className="text-[9px] text-[var(--foreground-muted)] opacity-50 hidden sm:inline">preset</span>}
                                    <button
                                      onClick={() => deleteChapterTask(task.id, chapter.id)}
                                      className="opacity-0 group-hover:opacity-100 sm:transition-opacity p-1"
                                    >
                                      <Trash2 className="w-3 h-3 text-[var(--danger)]" />
                                    </button>
                                  </div>
                                ))}

                                {addingTaskFor === chapter.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      placeholder="What to study..."
                                      value={newTaskTitle}
                                      onChange={e => setNewTaskTitle(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') addChapterTask(chapter.id); if (e.key === 'Escape') { setAddingTaskFor(null); setNewTaskTitle(''); } }}
                                      className="text-xs h-7 flex-1"
                                      autoFocus
                                    />
                                    <Button size="sm" onClick={() => addChapterTask(chapter.id)} disabled={!newTaskTitle.trim()}>Add</Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setAddingTaskFor(null); setNewTaskTitle(''); }}>✕</Button>
                                  </div>
                                ) : (
                                  <button onClick={() => { setAddingTaskFor(chapter.id); setNewTaskTitle(''); }} className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:text-[var(--accent-light)] py-1">
                                    <Plus className="w-3 h-3" /> Add study task
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}

                        {showAddChapter === key ? (
                          <div className="flex items-center gap-2 pt-1">
                            <Input
                              placeholder="Chapter title..."
                              value={newChapterTitle}
                              onChange={e => setNewChapterTitle(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') addChapter(first.name); if (e.key === 'Escape') { setShowAddChapter(null); setNewChapterTitle(''); } }}
                              className="text-xs h-7 flex-1"
                              autoFocus
                            />
                            <Button size="sm" onClick={() => addChapter(first.name)} disabled={!newChapterTitle.trim()}>Add</Button>
                            <Button variant="ghost" size="sm" onClick={() => { setShowAddChapter(null); setNewChapterTitle(''); }}>✕</Button>
                          </div>
                        ) : (
                          <button onClick={() => { setShowAddChapter(key); setNewChapterTitle(''); }} className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] py-1">
                            <Plus className="w-3.5 h-3.5" /> Add chapter
                          </button>
                        )}

                        {/* Module exams */}
                        {moduleExams.length > 0 && (
                          <div className="pt-2 border-t border-[var(--border)]">
                            <p className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-1">Exams</p>
                            <div className="space-y-1">
                              {moduleExams.map(exam => {
                                const examCfg = EXAM_TYPE_CONFIG[exam.examType] || EXAM_TYPE_CONFIG.exam;
                                return (
                                  <div key={exam.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg" style={{ background: `${examCfg.color}10`, color: examCfg.color }}>
                                    <span>{examCfg.icon}</span>
                                    <span className="font-medium truncate flex-1">{exam.title}</span>
                                    <span className="text-[10px] flex-shrink-0">{format(new Date(exam.date + 'T00:00:00'), 'MMM d')}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* Study Tasks - Module buttons strip */}
      {moduleNames.length > 0 && (
        <div className="space-y-3">
          {/* Module buttons + Global */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStudyModuleView(studyModuleView === 'global' ? null : 'global')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                studyModuleView === 'global'
                  ? 'bg-[var(--primary)] text-white shadow-md'
                  : 'bg-[var(--background-surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-surface)]/80'
              }`}
            >
              📋 Global
              <span className="ml-1 text-[10px] opacity-75">{chapters.reduce((sum, c) => sum + c.tasks.filter(t => !t.completed).length, 0)}</span>
            </button>
            {moduleNames.map(key => {
              const slots = groupedModules[key];
              const first = slots[0];
              const moduleChapters = chapters.filter(c => c.courseName.toLowerCase() === key);
              const pending = moduleChapters.reduce((sum, c) => sum + c.tasks.filter(t => !t.completed).length, 0);
              const isActive = studyModuleView === key;
              return (
                <button
                  key={key}
                  onClick={() => setStudyModuleView(isActive ? null : key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'bg-[var(--background-surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
                  style={isActive ? { background: first.color } : undefined}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isActive ? 'white' : first.color }} />
                  <span className="truncate max-w-[100px]">{first.name}</span>
                  {pending > 0 && <span className="text-[10px] opacity-75">{pending}</span>}
                </button>
              );
            })}
          </div>

          {/* Expanded study tasks panel */}
          {studyModuleView && (() => {
            const isGlobal = studyModuleView === 'global';
            const allTasks = chapters
              .filter(ch => isGlobal || ch.courseName.toLowerCase() === studyModuleView)
              .flatMap(ch => ch.tasks.map(t => ({ ...t, chapterTitle: ch.title, moduleName: ch.courseName })));
            const pendingTasks = allTasks.filter(t => !t.completed);
            const doneTasks = allTasks.filter(t => t.completed);
            const byModule = pendingTasks.reduce<Record<string, typeof pendingTasks>>((acc, t) => {
              if (!acc[t.moduleName]) acc[t.moduleName] = [];
              acc[t.moduleName].push(t);
              return acc;
            }, {});
            const taskTypes: (TaskType | 'all')[] = ['all', 'study', 'td', 'tp', 'review', 'custom'];

            return (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <Card variant="elevated" className="overflow-hidden">
                  {/* Header */}
                  <div className="p-3 flex items-center justify-between border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                      <span className="text-sm font-bold text-[var(--foreground)]">
                        {isGlobal ? 'All Study Tasks' : groupedModules[studyModuleView]?.[0]?.name}
                      </span>
                      <Badge variant="primary" size="sm">{pendingTasks.length} pending</Badge>
                      <span className="text-[10px] text-[var(--success)]">{doneTasks.length} done</span>
                    </div>
                    <button onClick={() => setStudyModuleView(null)} className="p-1 rounded-lg hover:bg-[var(--background-surface)] transition-colors">
                      <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" />
                    </button>
                  </div>

                  {/* Type filter */}
                  <div className="px-3 py-2 flex items-center gap-1.5 flex-wrap bg-[var(--background-surface)]/30">
                    {taskTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => setStudyTaskFilter(type)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors ${
                          studyTaskFilter === type
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--card)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {type === 'all' ? 'All' : `${TASK_TYPE_CONFIG[type]?.icon || ''} ${TASK_TYPE_CONFIG[type]?.label || type}`}
                      </button>
                    ))}
                  </div>

                  {/* Tasks */}
                  <div className="p-3 space-y-3">
                    {pendingTasks.length === 0 ? (
                      <p className="text-xs text-[var(--foreground-muted)] text-center py-4">All caught up! No pending tasks.</p>
                    ) : (
                      Object.entries(byModule).map(([moduleName, tasks]) => {
                        const filteredTasks = studyTaskFilter === 'all' ? tasks : tasks.filter(t => t.taskType === studyTaskFilter);
                        if (filteredTasks.length === 0) return null;
                        const moduleColor = courses.find(c => c.name.toLowerCase() === moduleName.toLowerCase())?.color || '#A855F7';
                        return (
                          <div key={moduleName}>
                            {isGlobal && (
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: moduleColor }} />
                                <p className="text-xs font-semibold text-[var(--foreground)]">{moduleName}</p>
                                <Badge variant="outline" size="sm">{filteredTasks.length}</Badge>
                              </div>
                            )}
                            <div className={`space-y-1 ${isGlobal ? 'ml-4' : ''}`}>
                              {filteredTasks.map(task => (
                                <div key={task.id} className="flex items-center gap-2 py-1 group">
                                  <button
                                    onClick={() => toggleChapterTask(task.id, true)}
                                    className="w-4 h-4 rounded border border-[var(--border)] hover:border-[var(--primary)] flex items-center justify-center flex-shrink-0 transition-colors active:scale-90"
                                  />
                                  <span className="text-[10px] flex-shrink-0">{TASK_TYPE_CONFIG[task.taskType]?.icon || '📌'}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-[var(--foreground)] truncate">{task.title}</p>
                                    <p className="text-[9px] text-[var(--foreground-muted)] truncate">Ch: {task.chapterTitle}</p>
                                  </div>
                                  {task.isPreset && <span className="text-[9px] text-[var(--foreground-muted)] opacity-50 hidden sm:inline">preset</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })()}
        </div>
      )}

      {/* Exams Tab */}
      {tab === 'exams' && (
        <div className="space-y-4">
          {/* Upcoming exams */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">Upcoming Exams</p>
              <Button size="sm" onClick={() => setShowAddExam(true)}><Plus className="w-3.5 h-3.5" /> Add Exam</Button>
            </div>

            {upcomingExams.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="w-8 h-8" />}
                title="No upcoming exams"
                description="Add exam dates to get reminders on your schedule and calendar"
                action={<Button onClick={() => setShowAddExam(true)}><Plus className="w-4 h-4" /> Add Exam</Button>}
              />
            ) : (
              <div className="space-y-2">
                {upcomingExams.map((exam, i) => {
                  const daysUntil = Math.ceil((new Date(exam.date + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000);
                  const moduleColor = courses.find(c => c.name.toLowerCase() === exam.courseName.toLowerCase())?.color || '#F87171';
                  return (
                    <motion.div key={exam.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card variant="elevated" className="p-3 sm:p-4" style={{ borderLeftWidth: 3, borderLeftColor: moduleColor }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <p className="font-semibold text-sm sm:text-base text-[var(--foreground)]">{exam.title}</p>
                              <Badge variant={daysUntil <= 3 ? 'danger' : daysUntil <= 7 ? 'warning' : 'outline'}>
                                {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                              </Badge>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${(EXAM_TYPE_CONFIG[exam.examType] || EXAM_TYPE_CONFIG.exam).color}20`, color: (EXAM_TYPE_CONFIG[exam.examType] || EXAM_TYPE_CONFIG.exam).color }}>
                                {(EXAM_TYPE_CONFIG[exam.examType] || EXAM_TYPE_CONFIG.exam).icon} {(EXAM_TYPE_CONFIG[exam.examType] || EXAM_TYPE_CONFIG.exam).label}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{exam.courseName}</p>
                            {/* Progress to exam */}
                            {(() => {
                              const moduleChaptersForExam = chapters.filter(c => c.courseName.toLowerCase() === exam.courseName.toLowerCase());
                              if (moduleChaptersForExam.length === 0) return null;
                              const reviewed = moduleChaptersForExam.filter(c => c.tasks.length > 0 && c.tasks.every(t => t.completed)).length;
                              return (
                                <p className="text-[10px] mt-1" style={{ color: (EXAM_TYPE_CONFIG[exam.examType] || EXAM_TYPE_CONFIG.exam).color }}>
                                  {reviewed}/{moduleChaptersForExam.length} chapters reviewed
                                </p>
                              );
                            })()}
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-[10px] sm:text-xs text-[var(--foreground-muted)]">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(exam.date + 'T00:00:00'), 'EEE, MMM d')}</span>
                              {exam.startTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.startTime}</span>}
                              {exam.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {exam.room}</span>}
                            </div>
                            {exam.notes && <p className="text-[10px] sm:text-xs text-[var(--foreground-muted)] mt-1 italic truncate">{exam.notes}</p>}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteExam(exam.id)}>
                            <Trash2 className="w-4 h-4 text-[var(--danger)]" />
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past exams */}
          {pastExams.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-3">Past Exams</p>
              <div className="space-y-2">
                {pastExams.map(exam => (
                  <Card key={exam.id} variant="default" className="p-3 opacity-60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{exam.title}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">{exam.courseName} — {format(new Date(exam.date + 'T00:00:00'), 'MMM d, yyyy')}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteExam(exam.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-3">
          <Card variant="glass" className="p-3">
            <p className="text-sm text-[var(--foreground-muted)]">Total study time: <span className="font-bold text-[var(--foreground)]">{totalStudyHours} hours</span></p>
          </Card>
          {sessions.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8" />}
              title="No study sessions logged"
              description="Log your study sessions to track progress"
              action={<Button onClick={() => setShowAddSession(true)}><Plus className="w-4 h-4" /> Log Session</Button>}
            />
          ) : (
            sessions.slice(0, 50).map((session, i) => {
              const course = courses.find(c => c.id === session.courseId);
              const displayName = session.topic || session.courseName || course?.name || 'Study session';
              const displayColor = session.courseColor || course?.color || 'var(--primary)';
              return (
                <motion.div key={session.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                  <Card variant="default" className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-8 rounded-full" style={{ background: displayColor }} />
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">{displayName}</p>
                          <p className="text-xs text-[var(--foreground-muted)]">{session.date} • {session.duration} min</p>
                        </div>
                      </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">{session.duration}m</Badge>
                      <Button variant="ghost" size="icon" onClick={() => startPomodoro(displayName, session.id)}>
                        <Timer className="w-3.5 h-3.5 text-[var(--primary)]" />
                      </Button>
                    </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {tab === 'pomodoro' && (
        <div className="space-y-4">
          {/* Timer display */}
          <Card variant="elevated" className="p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[var(--primary)] blur-3xl" />
            </div>
            <div className="relative">
              {pomoIsBreak && (
                <Badge variant="success" className="mb-3">Break Time</Badge>
              )}
              <p className="text-6xl sm:text-8xl font-bold text-[var(--foreground)] font-mono tracking-wider mb-2">
                {formatTime(pomoTimeLeft)}
              </p>
              <p className="text-sm text-[var(--foreground-muted)] mb-6">
                {pomodoroActive
                  ? pomoIsBreak ? 'Take a break!' : (pomoLabel || 'Focus session')
                  : `${pomoDuration} min focus / ${pomoBreak} min break`}
              </p>

              {!pomodoroActive ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <div>
                      <label className="text-xs text-[var(--foreground-muted)]">Focus</label>
                      <Input type="number" className="w-20 text-center" value={pomoDuration} onChange={e => { const v = parseInt(e.target.value) || 25; setPomoDuration(v); setPomoTimeLeft(v * 60); }} />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--foreground-muted)]">Break</label>
                      <Input type="number" className="w-20 text-center" value={pomoBreak} onChange={e => setPomoBreak(parseInt(e.target.value) || 5)} />
                    </div>
                  </div>
                  <Input placeholder="What are you working on?" value={pomoLabel} onChange={e => setPomoLabel(e.target.value)} className="max-w-sm mx-auto" />
                  <Button size="lg" onClick={() => startPomodoro()}>
                    <Play className="w-5 h-5" /> Start Focus
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <Button variant="secondary" size="lg" onClick={() => setPomoPaused(!pomoPaused)}>
                    {pomoPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    {pomoPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button variant="danger" size="lg" onClick={cancelPomodoro}>
                    <Square className="w-5 h-5" /> Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Quick presets */}
          {!pomodoroActive && (
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: '25/5', focus: 25, br: 5 },
                { label: '50/10', focus: 50, br: 10 },
                { label: '90/15', focus: 90, br: 15 },
              ].map(p => (
                <Button key={p.label} variant="secondary" size="sm" onClick={() => { setPomoDuration(p.focus); setPomoBreak(p.br); setPomoTimeLeft(p.focus * 60); }}>
                  <Timer className="w-3 h-3" /> {p.label}
                </Button>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card variant="default" className="p-3 text-center">
              <p className="text-lg font-bold text-[var(--foreground)]">{pomoStats.today}</p>
              <p className="text-[10px] text-[var(--foreground-muted)]">Today</p>
            </Card>
            <Card variant="default" className="p-3 text-center">
              <p className="text-lg font-bold text-[var(--foreground)]">{pomoStats.total}</p>
              <p className="text-[10px] text-[var(--foreground-muted)]">Total Sessions</p>
            </Card>
            <Card variant="default" className="p-3 text-center">
              <p className="text-lg font-bold text-[var(--foreground)]">{Math.round(pomoStats.totalMinutes / 60)}h</p>
              <p className="text-[10px] text-[var(--foreground-muted)]">Focus Hours</p>
            </Card>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      <Modal isOpen={showAddCourse} onClose={() => setShowAddCourse(false)} title="Add Course" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Course Name</Label>
              <Input placeholder="e.g. Algorithms" value={newCourse.name} onChange={e => setNewCourse(m => ({ ...m, name: e.target.value }))} />
            </div>
            <div>
              <Label>Code</Label>
              <Input placeholder="e.g. CS301" value={newCourse.code} onChange={e => setNewCourse(m => ({ ...m, code: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Professor</Label>
              <Input placeholder="Professor name" value={newCourse.professor} onChange={e => setNewCourse(m => ({ ...m, professor: e.target.value }))} />
            </div>
            <div>
              <Label>Room</Label>
              <Input placeholder="e.g. Amphi 3" value={newCourse.room} onChange={e => setNewCourse(m => ({ ...m, room: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Day</Label>
              <Select value={newCourse.day} onChange={e => setNewCourse(m => ({ ...m, day: Number(e.target.value) }))}>
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </Select>
            </div>
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={newCourse.startTime} onChange={e => setNewCourse(m => ({ ...m, startTime: e.target.value }))} />
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" value={newCourse.endTime} onChange={e => setNewCourse(m => ({ ...m, endTime: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={newCourse.type} onChange={e => setNewCourse(m => ({ ...m, type: e.target.value as Course['type'] }))}>
              <option value="lecture">Lecture (Cours)</option>
              <option value="td">TD (Travaux Dirigés)</option>
              <option value="tp">TP (Travaux Pratiques)</option>
              <option value="exam">Exam</option>
            </Select>
          </div>
          <div>
            <Label>Semester (optional)</Label>
            <Select value={newCourse.semester} onChange={e => setNewCourse(m => ({ ...m, semester: e.target.value }))}>
              <option value="">No semester</option>
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="S3">S3</option>
              <option value="S4">S4</option>
              <option value="S5">S5</option>
              <option value="S6">S6</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAddCourse(false)}>Cancel</Button>
            <Button onClick={addCourse} disabled={!newCourse.name.trim()}>Add Course</Button>
          </div>
        </div>
      </Modal>

      {/* Add Session Modal */}
      <Modal isOpen={showAddSession} onClose={() => setShowAddSession(false)} title="Log Study Session">
        <div className="space-y-4">
          <div>
            <Label>Course</Label>
            <Select value={newSession.courseId} onChange={e => setNewSession(m => ({ ...m, courseId: e.target.value }))}>
              <option value="">Select a module</option>
              {moduleNames.map(key => {
                const first = groupedModules[key][0];
                return <option key={first.id} value={first.id}>{first.name}</option>;
              })}
            </Select>
          </div>
          <div>
            <Label>Duration (minutes)</Label>
            <Input type="number" value={newSession.duration} onChange={e => setNewSession(m => ({ ...m, duration: parseInt(e.target.value) || 0 }))} />
          </div>
          <div>
            <Label>Topic</Label>
            <Input placeholder="What did you study?" value={newSession.topic} onChange={e => setNewSession(m => ({ ...m, topic: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAddSession(false)}>Cancel</Button>
            <Button onClick={addSession} disabled={!newSession.courseId}>Log Session</Button>
          </div>
        </div>
      </Modal>

      {/* Add Exam Modal */}
      <Modal isOpen={showAddExam} onClose={() => setShowAddExam(false)} title="Add Exam / Test" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Module</Label>
              <Select value={newExam.courseName} onChange={e => setNewExam(m => ({ ...m, courseName: e.target.value }))}>
                <option value="">Select a module</option>
                {moduleNames.map(key => {
                  const first = groupedModules[key][0];
                  return <option key={first.id} value={first.name}>{first.name}</option>;
                })}
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newExam.examType} onChange={e => setNewExam(m => ({ ...m, examType: e.target.value as ExamType }))}>
                {Object.entries(EXAM_TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Exam Title</Label>
            <Input placeholder="e.g. Midterm, Final Exam, TP Test..." value={newExam.title} onChange={e => setNewExam(m => ({ ...m, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={newExam.date} onChange={e => setNewExam(m => ({ ...m, date: e.target.value }))} />
            </div>
            <div>
              <Label>Time (optional)</Label>
              <Input type="time" value={newExam.startTime} onChange={e => setNewExam(m => ({ ...m, startTime: e.target.value }))} />
            </div>
            <div>
              <Label>Room (optional)</Label>
              <Input placeholder="e.g. Amphi A" value={newExam.room} onChange={e => setNewExam(m => ({ ...m, room: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input placeholder="Topics to review, materials needed..." value={newExam.notes} onChange={e => setNewExam(m => ({ ...m, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAddExam(false)}>Cancel</Button>
            <Button onClick={addExam} disabled={!newExam.courseName || !newExam.title.trim() || !newExam.date}>Add Exam</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
