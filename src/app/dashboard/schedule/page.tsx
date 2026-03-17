'use client';

import { useState, useEffect, Fragment, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, StatCard } from '@/components/ui/primitives';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { Course } from '@/types';
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

  useEffect(() => {
    if (!user) return;
    fetchCourses();
    fetchStatus();
  }, [user, fetchCourses, fetchStatus]);

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
    </div>
  );
}
