'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge } from '@/components/ui/primitives';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { api } from '@/lib/api';
import {
  Sun, Moon, Cloud, BookOpen, Dumbbell, UtensilsCrossed,
  GraduationCap, Wallet, Target, CheckSquare,
  ChevronRight, Flame, Sparkles, CalendarDays, Timer, BookOpenCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { DashboardWidget } from '@/types';

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'w-prayer', type: 'prayer', visible: true, order: 0 },
  { id: 'w-tasks', type: 'tasks', visible: true, order: 1 },
  { id: 'w-habits', type: 'habits', visible: true, order: 2 },
  { id: 'w-finance', type: 'finance', visible: true, order: 3 },
  { id: 'w-study', type: 'study', visible: true, order: 4 },
  { id: 'w-sport', type: 'sport', visible: true, order: 5 },
  { id: 'w-calendar', type: 'calendar', visible: true, order: 6 },
  { id: 'w-quran', type: 'quran', visible: true, order: 7 },
  { id: 'w-goals', type: 'goals', visible: true, order: 8 },
  { id: 'w-pomodoro', type: 'pomodoro', visible: true, order: 9 },
];

function getGreeting(): { text: string; icon: React.ReactNode } {
  const h = new Date().getHours();
  if (h < 6) return { text: 'Good night', icon: <Moon className="w-5 h-5" /> };
  if (h < 12) return { text: 'Good morning', icon: <Sun className="w-5 h-5" /> };
  if (h < 18) return { text: 'Good afternoon', icon: <Cloud className="w-5 h-5" /> };
  return { text: 'Good evening', icon: <Moon className="w-5 h-5" /> };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { nextPrayer } = usePrayerTimes(user?.city || 'algiers');
  const today = format(new Date(), 'yyyy-MM-dd');

  const [sportProgress, setSportProgress] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [habits, setHabits] = useState<{ total: number; done: number }>({ total: 0, done: 0 });
  const [monthlyBalance, setMonthlyBalance] = useState(0);
  const [prayersDone, setPrayersDone] = useState(0);
  const [todayCourses, setTodayCourses] = useState<{ id: string; name: string; startTime: string; endTime: string; room?: string; color: string; type: string }[]>([]);
  const [learningEntry, setLearningEntry] = useState<{ category: string; duration: number } | null>(null);
  const [quranStreak, setQuranStreak] = useState(0);
  const [pomodoroToday, setPomodoroToday] = useState(0);
  const [activeGoals, setActiveGoals] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);

  const widgets = useMemo(() => {
    const cfg = user?.dashboardWidgets;
    if (cfg && cfg.length > 0) return [...cfg].sort((a, b) => a.order - b.order);
    return DEFAULT_WIDGETS;
  }, [user?.dashboardWidgets]);

  const isVisible = useCallback((type: string) => {
    const w = widgets.find(w => w.type === type);
    return w ? w.visible : true;
  }, [widgets]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const promises: Promise<void>[] = [];

      // Sport
      if (user.modules.sport && isVisible('sport')) {
        promises.push(
          api.sport.get(today).then((data: Record<string, unknown>[]) => {
            if (data.length > 0) {
              const log = data[0] as { exercises?: { completed: number; target: number }[] };
              const exs = log.exercises || [];
              setSportProgress(exs.length > 0 ? Math.round(exs.reduce((s, e) => s + (e.completed / (e.target || 1)), 0) / exs.length * 100) : 0);
            }
          }).catch(() => {})
        );
      }

      // Tasks
      if (isVisible('tasks')) {
        promises.push(
          api.tasks.get().then((data: Record<string, unknown>[]) => {
            setPendingTasks(data.filter(t => t.status !== 'completed').length);
          }).catch(() => {})
        );
      }

      // Habits
      if (isVisible('habits')) {
        promises.push(
          Promise.all([api.habits.get(), api.habits.logs.get({ date: today })]).then(([hbs, logs]) => {
            setHabits({ total: hbs.length, done: (logs as { completed?: boolean }[]).filter(l => l.completed).length });
          }).catch(() => {})
        );
      }

      // Finance
      if (isVisible('finance')) {
        promises.push(
          api.finance.summary().then(data => {
            setMonthlyBalance(data.balance);
          }).catch(() => {})
        );
      }

      // Prayer
      if (user.modules.prayer && isVisible('prayer')) {
        promises.push(
          api.prayer.get(today).then((data: Record<string, unknown>[]) => {
            setPrayersDone((data as { completed?: boolean }[]).filter(l => l.completed).length);
          }).catch(() => {})
        );
      }

      // Study courses
      if (isVisible('study')) {
        promises.push(
          api.study.courses.get().then((data: Record<string, unknown>[]) => {
            const dayOfWeek = new Date().getDay();
            const filtered = (data as { id: string; name: string; start_time: string; end_time: string; room?: string; color: string; type: string; day: number }[])
              .filter(c => c.day === dayOfWeek)
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .slice(0, 4)
              .map(c => ({ id: c.id, name: c.name, startTime: c.start_time, endTime: c.end_time, room: c.room, color: c.color, type: c.type }));
            setTodayCourses(filtered);
          }).catch(() => {})
        );
      }

      // Learning
      if (user.modules.learning) {
        promises.push(
          api.learning.get({ date: today }).then((data: Record<string, unknown>[]) => {
            if (data.length > 0) {
              const e = data[0] as { category: string; duration: number };
              setLearningEntry({ category: e.category, duration: e.duration });
            }
          }).catch(() => {})
        );
      }

      // Quran
      if (isVisible('quran')) {
        promises.push(
          api.quran.stats().then((data: Record<string, unknown>) => {
            setQuranStreak((data as { current_streak?: number }).current_streak || 0);
          }).catch(() => {})
        );
      }

      // Pomodoro
      if (isVisible('pomodoro')) {
        promises.push(
          api.pomodoro.get(today).then((data: Record<string, unknown>[]) => {
            setPomodoroToday((data as { status?: string }[]).filter(s => s.status === 'completed').length);
          }).catch(() => {})
        );
      }

      // Goals
      if (isVisible('goals')) {
        promises.push(
          api.goals.get({ status: 'active' }).then((data: Record<string, unknown>[]) => {
            setActiveGoals(data.length);
          }).catch(() => {})
        );
      }

      // Calendar
      if (isVisible('calendar')) {
        promises.push(
          api.calendar.get(format(new Date(), 'yyyy-MM')).then((data: Record<string, unknown>[]) => {
            const upcoming = (data as { date: string }[]).filter(e => e.date >= today).length;
            setUpcomingEvents(upcoming);
          }).catch(() => {})
        );
      }

      await Promise.all(promises);
    };
    load();
  }, [user, today, isVisible]);

  if (!user) return null;

  const greeting = getGreeting();
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  // Widget stat cards
  const statWidgets: Record<string, { icon: React.ReactNode; value: string; label: string; href: string; color: string }> = {
    sport: { icon: <Dumbbell className="w-5 h-5" />, value: `${sportProgress}%`, label: 'Sport', href: '/dashboard/sport', color: 'var(--success)' },
    habits: { icon: <Flame className="w-5 h-5" />, value: `${habits.done}/${habits.total}`, label: 'Habits', href: '/dashboard/habits', color: 'var(--warning)' },
    tasks: { icon: <CheckSquare className="w-5 h-5" />, value: `${pendingTasks}`, label: 'Tasks', href: '/dashboard/tasks', color: 'var(--primary)' },
    finance: { icon: <Wallet className="w-5 h-5" />, value: monthlyBalance.toFixed(0), label: 'Balance DA', href: '/dashboard/finance', color: monthlyBalance >= 0 ? 'var(--success)' : 'var(--danger)' },
    quran: { icon: <BookOpenCheck className="w-5 h-5" />, value: `${quranStreak}d`, label: 'Quran Streak', href: '/dashboard/quran', color: 'var(--emerald, var(--success))' },
    pomodoro: { icon: <Timer className="w-5 h-5" />, value: `${pomodoroToday}`, label: 'Focus Today', href: '/dashboard/study', color: 'var(--danger)' },
    goals: { icon: <Target className="w-5 h-5" />, value: `${activeGoals}`, label: 'Goals', href: '/dashboard/goals', color: 'var(--violet, var(--primary))' },
    calendar: { icon: <CalendarDays className="w-5 h-5" />, value: `${upcomingEvents}`, label: 'Events', href: '/dashboard/calendar', color: 'var(--cyan, var(--primary))' },
  };

  // Determine visible stat widgets in configured order
  const visibleStats = widgets
    .filter(w => w.visible && statWidgets[w.type])
    .filter(w => {
      if (w.type === 'sport' && !user.modules.sport) return false;
      if (w.type === 'habits' && habits.total === 0) return false;
      return true;
    })
    .map(w => ({ ...statWidgets[w.type], type: w.type }));

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      {/* Greeting */}
      <motion.div variants={item}>
        <Card variant="elevated" className="p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 grid-pattern" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[var(--foreground-muted)] mb-2">
              {greeting.icon}
              <span className="text-sm">{greeting.text}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{user.name}</h1>
            <p className="text-sm text-[var(--foreground-muted)] mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Prayer banner */}
      {user.modules.prayer && nextPrayer && isVisible('prayer') && (
        <motion.div variants={item}>
          <Link href="/dashboard/prayer">
            <Card variant="elevated" depth className="p-4 group cursor-pointer hover:scale-[1.01] transition-transform">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">Next: {nextPrayer.name}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{nextPrayer.time} • {nextPrayer.remaining}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="primary">{prayersDone}/5</Badge>
                  <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)] group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* Quick stats grid — ordered by widget config */}
      {visibleStats.length > 0 && (
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {visibleStats.map(stat => (
            <Link key={stat.type} href={stat.href}>
              <Card variant="default" className="p-3 text-center hover:scale-[1.02] transition-transform cursor-pointer">
                <div className="mx-auto mb-1 w-5 h-5" style={{ color: stat.color }}>{stat.icon}</div>
                <p className="text-lg font-bold" style={{ color: stat.type === 'finance' ? stat.color : 'var(--foreground)' }}>{stat.value}</p>
                <p className="text-[10px] text-[var(--foreground-muted)]">{stat.label}</p>
              </Card>
            </Link>
          ))}
        </motion.div>
      )}

      {/* Today's classes */}
      {isVisible('study') && todayCourses.length > 0 && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[var(--cyan)]" /> Today&apos;s Classes
            </h3>
            <Link href="/dashboard/schedule" className="text-xs text-[var(--primary)] hover:underline">See all</Link>
          </div>
          <div className="space-y-2">
            {todayCourses.map(course => (
              <Card key={course.id} variant="default" className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: course.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{course.name}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{course.startTime} - {course.endTime} {course.room && `• ${course.room}`}</p>
                  </div>
                  <Badge variant="outline" size="sm">{course.type}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Learning */}
      {user.modules.learning && (
        <motion.div variants={item}>
          <Link href="/dashboard/learning">
            <Card variant="elevated" className="p-4 hover:scale-[1.01] transition-transform cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--violet)]/15 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[var(--violet)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[var(--foreground)]">Daily Learning</p>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    {learningEntry ? `${learningEntry.category} — ${learningEntry.duration}min done` : '30 min not started'}
                  </p>
                </div>
                {learningEntry ? (
                  <Badge variant="success">Done</Badge>
                ) : (
                  <Badge variant="warning">Pending</Badge>
                )}
              </div>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* Meals */}
      {user.modules.food && (
        <motion.div variants={item}>
          <Link href="/dashboard/meals">
            <Card variant="default" className="p-4 hover:scale-[1.01] transition-transform cursor-pointer">
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="w-5 h-5 text-[var(--warning)]" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-[var(--foreground)]">Meals</p>
                  <p className="text-xs text-[var(--foreground-muted)]">Plan and track your meals</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)]" />
              </div>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* Footer tip */}
      <motion.div variants={item}>
        <p className="text-center text-xs text-[var(--foreground-muted)] py-4">
          Use keyboard shortcuts • Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--background-surface)] text-[var(--foreground)]">?</kbd> for help
        </p>
      </motion.div>
    </motion.div>
  );
}
