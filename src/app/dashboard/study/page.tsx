'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, Label, Select, Modal, Tabs, EmptyState } from '@/components/ui/primitives';
import { GraduationCap, Plus, Clock, MapPin, User, Calendar, Trash2, Link, ExternalLink, BookOpen, RefreshCw, Timer, Play, Pause, Square, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import type { Course, StudySession } from '@/types';
import { format } from 'date-fns';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COURSE_COLORS = ['#A855F7', '#06B6D4', '#34D399', '#FBBF24', '#F87171', '#8B5CF6', '#FB923C', '#D946EF', '#6366F1', '#0891B2'];

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
  });
  const [newSession, setNewSession] = useState({
    courseId: '', duration: 60, topic: '', notes: '',
  });

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

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchCourses(), fetchSessions()]).finally(() => setLoading(false));
  }, [user, fetchCourses, fetchSessions]);

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
      });
      setCourses(prev => [...prev, mapCourse(data)]);
      setShowAddCourse(false);
      setNewCourse({ name: '', code: '', professor: '', room: '', day: new Date().getDay(), startTime: '08:00', endTime: '09:30', type: 'lecture' });
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
  const groupedModules = courses.reduce<Record<string, Course[]>>((acc, c) => {
    const key = c.name.toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});
  const moduleNames = Object.keys(groupedModules);

  // Total study time
  const totalStudyHours = Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / 60);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study"
        description={`${user.field} — Year ${user.year} at ${user.university}`}
        icon={<GraduationCap className="w-5 h-5" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sync Timetable
          </Button>
          <Button variant="secondary" onClick={() => setShowAddSession(true)}><BookOpen className="w-4 h-4" /> Log Session</Button>
          <Button onClick={() => setShowAddCourse(true)}><Plus className="w-4 h-4" /> Add Course</Button>
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
              <span className="text-sm text-[var(--foreground-muted)]">
                {todayCourses.length} class{todayCourses.length !== 1 ? 'es' : ''} today
              </span>
            </div>

            {todayCourses.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-[var(--foreground-muted)]">No classes today! 🎉</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {todayCourses.map((course, i) => (
                  <motion.div key={course.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card variant="interactive" depth className="p-4" style={{ borderLeftWidth: 3, borderLeftColor: course.color }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[var(--foreground)]">{course.name}</p>
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
        <div className="space-y-3">
          {moduleNames.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="w-8 h-8" />}
              title="No courses added"
              description="Sync your timetable or add courses manually"
              action={
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleSync} disabled={syncing}>
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sync Timetable
                  </Button>
                  <Button onClick={() => setShowAddCourse(true)}><Plus className="w-4 h-4" /> Add Course</Button>
                </div>
              }
            />
          ) : (
            moduleNames.map((key, i) => {
              const slots = groupedModules[key];
              const first = slots[0];
              const isSynced = slots.some(s => !!s.sourceId);
              const isManual = slots.every(s => !s.sourceId);
              return (
                <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card variant="interactive" depth className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${first.color}15`, color: first.color }}>
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[var(--foreground)]">{first.name}</p>
                            {isSynced && <Badge variant="primary">Synced</Badge>}
                          </div>
                          {first.code && <p className="text-xs text-[var(--foreground-muted)]">{first.code}</p>}
                          {first.professor && <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Prof. {first.professor}</p>}
                          <div className="mt-2 space-y-1">
                            {slots.map(slot => (
                              <div key={slot.id} className="flex flex-wrap items-center gap-2 text-xs text-[var(--foreground-muted)] px-2 py-1 rounded-md bg-[var(--background-surface)]">
                                <Badge variant="outline">{slot.type.toUpperCase()}</Badge>
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {DAY_NAMES[slot.day]}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {slot.startTime} - {slot.endTime}</span>
                                {slot.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {slot.room}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {isManual && (
                        <Button variant="ghost" size="icon" onClick={() => { slots.forEach(s => deleteCourse(s.id)); }}>
                          <Trash2 className="w-4 h-4 text-[var(--danger)]" />
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })
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
    </div>
  );
}
