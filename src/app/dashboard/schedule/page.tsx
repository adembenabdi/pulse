'use client';

import { useState, useEffect, Fragment, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, StatCard } from '@/components/ui/primitives';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, RefreshCw, AlertTriangle, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import type { Course, StudyExam } from '@/types';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

export default function SchedulePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<'week' | 'day'>('day');
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [exams, setExams] = useState<StudyExam[]>([]);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await api.study.courses.get();
      setCourses(data.map((c: Record<string, unknown>) => ({
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
      })));
    } catch {
      console.error('Failed to load courses');
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await api.schedule.status();
      setLastSync(status.lastSync);
    } catch { /* ignore */ }
  }, []);

  const fetchExams = useCallback(async () => {
    try {
      const data = await api.study.exams.get();
      setExams(data.map((e: Record<string, unknown>) => ({
        id: e.id as string,
        courseName: e.course_name as string,
        title: e.title as string,
        examType: (e.exam_type || 'exam') as StudyExam['examType'],
        date: e.date as string,
        startTime: (e.start_time || null) as string | null,
        room: (e.room || '') as string,
        notes: (e.notes || '') as string,
      })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchCourses();
    fetchStatus();
    fetchExams();
  }, [user, fetchCourses, fetchStatus, fetchExams]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const result = await api.schedule.sync();
      if (result.synced) {
        setSyncMessage(`Synced ${result.courses} courses`);
        fetchCourses();
        fetchStatus();
      } else if (result.reason === 'no_url') {
        setSyncMessage('Set your timetable URL in Settings first');
      } else if (result.reason === 'no_changes') {
        setSyncMessage('Already up to date');
      } else {
        setSyncMessage('Sync failed — check your URL');
      }
    } catch {
      setSyncMessage('Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 4000);
    }
  };

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const todayIdx = new Date().getDay();
  const todayCourses = courses.filter(c => c.day === todayIdx);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const upcomingExams = exams.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  const getCoursesForDay = (dayIdx: number) =>
    courses.filter(c => c.day === dayIdx).sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Schedule" description="Your weekly calendar" icon={<CalendarDays className="w-5 h-5" />}>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync'}</span>
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="secondary" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </PageHeader>

      {syncMessage && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-center py-1.5 px-3 rounded-lg bg-[var(--background-surface)] text-[var(--foreground-muted)]">
          {syncMessage}
        </motion.div>
      )}

      {lastSync && (
        <p className="text-[10px] text-[var(--foreground-muted)] text-right">
          Last sync: {format(new Date(lastSync), 'MMM d, h:mm a')}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<CalendarDays className="w-5 h-5" />} label="Today" value={DAYS[todayIdx]} sub={format(new Date(), 'MMM d')} color="#A855F7" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Classes Today" value={todayCourses.length} color="#06B6D4" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
        {weekDays.map((date, i) => {
          const dayIdx = date.getDay();
          const isToday = isSameDay(date, new Date());
          const count = getCoursesForDay(dayIdx).length;
          return (
            <button
              key={i}
              onClick={() => { setSelectedDay(dayIdx); setView('day'); }}
              className={`flex-1 min-w-[60px] py-2 rounded-xl text-center transition-colors ${
                isToday ? 'bg-[var(--primary)] text-white' :
                selectedDay === dayIdx && view === 'day' ? 'bg-[var(--background-surface)]' : ''
              }`}
            >
              <p className="text-[10px] font-semibold uppercase">{DAY_SHORT[dayIdx]}</p>
              <p className="text-lg font-bold">{format(date, 'd')}</p>
              {count > 0 && <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mx-auto mt-0.5" />}
            </button>
          );
        })}
      </div>

      {/* View toggle — hide week option on mobile since it requires horizontal scroll */}
      <div className="flex gap-2">
        <Button variant={view === 'week' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('week')} className="hidden md:inline-flex">Week</Button>
        <Button variant={view === 'day' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('day')}>Day</Button>
      </div>

      {/* Day view */}
      {view === 'day' && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-[var(--foreground)]">{DAYS[selectedDay]}</h3>
          {getCoursesForDay(selectedDay).length === 0 ? (
            <Card variant="default" className="p-4 text-center text-sm text-[var(--foreground-muted)]">No classes</Card>
          ) : (
            getCoursesForDay(selectedDay).map((course, i) => (
              <motion.div key={`${course.id}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card variant="elevated" className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--foreground)] truncate">{course.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                        <span className="text-xs text-[var(--foreground-muted)]">{course.startTime} - {course.endTime}</span>
                        {course.room && <Badge variant="outline" size="sm">{course.room}</Badge>}
                        <Badge variant="outline" size="sm">{course.type}</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Week view — only on desktop */}
      {view === 'week' && (
        <div className="overflow-x-auto hidden md:block rounded-xl border border-[var(--border)]">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-8 gap-px">
              <div className="p-2 text-xs font-semibold text-[var(--foreground-muted)]">Time</div>
              {[0, 1, 2, 3, 4, 5, 6].map(d => (
                <div key={d} className={`p-2 text-xs font-semibold text-center ${d === todayIdx ? 'text-[var(--primary)]' : 'text-[var(--foreground-muted)]'}`}>
                  {DAY_SHORT[d]}
                </div>
              ))}
              {HOURS.map(hour => (
                <Fragment key={`hour-${hour}`}>
                  <div className="p-1 text-[10px] text-[var(--foreground-muted)] border-t border-[var(--border)]">
                    {hour}:00
                  </div>
                  {[0, 1, 2, 3, 4, 5, 6].map(d => {
                    const slots = getCoursesForDay(d).filter(c => parseInt(c.startTime.split(':')[0]) === hour);
                    return (
                      <div key={`${hour}-${d}`} className="border-t border-[var(--border)] p-0.5 min-h-[36px]">
                        {slots.map(c => (
                          <div key={c.id} className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: `${c.color}30`, color: c.color }}>
                            {c.name}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming exams banner */}
      {upcomingExams.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">Upcoming Exams</p>
          {upcomingExams.map(exam => {
            const daysUntil = Math.ceil((new Date(exam.date + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000);
            const moduleColor = courses.find(c => c.name.toLowerCase() === exam.courseName.toLowerCase())?.color || '#F87171';
            const typeLabels: Record<string, { label: string; icon: string; color: string }> = {
              tp_test: { label: 'TP Test', icon: '🧪', color: '#06B6D4' },
              td_test: { label: 'TD Test', icon: '📝', color: '#FBBF24' },
              exam: { label: 'EMD', icon: '📋', color: '#F87171' },
              project: { label: 'Project', icon: '💻', color: '#8B5CF6' },
              presentation: { label: 'Presentation', icon: '🎤', color: '#34D399' },
            };
            const examCfg = typeLabels[exam.examType] || typeLabels.exam;
            return (
              <motion.div key={exam.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                <Card variant="elevated" className="p-3" style={{ borderLeftWidth: 3, borderLeftColor: moduleColor }}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${daysUntil <= 3 ? 'text-red-400' : daysUntil <= 7 ? 'text-yellow-400' : 'text-[var(--foreground-muted)]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{exam.title}</p>
                        <Badge variant={daysUntil <= 3 ? 'danger' : daysUntil <= 7 ? 'warning' : 'outline'}>
                          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}
                        </Badge>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${examCfg.color}20`, color: examCfg.color }}>
                          {examCfg.icon} {examCfg.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-[var(--foreground-muted)]">
                        <span>{exam.courseName}</span>
                        <span>•</span>
                        <span>{format(new Date(exam.date + 'T00:00:00'), 'EEE, MMM d')}</span>
                        {exam.startTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.startTime}</span>}
                        {exam.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {exam.room}</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
