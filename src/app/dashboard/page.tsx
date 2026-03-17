'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, ProgressRing } from '@/components/ui/primitives';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { getFromStorage } from '@/lib/storage';
import {
  Sun, Moon, Cloud, BookOpen, Dumbbell, UtensilsCrossed,
  GraduationCap, Briefcase, Wallet, Target, CheckSquare,
  ChevronRight, Clock, Flame, Sparkles, CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { SportLog, Task, Course, Transaction, LearningEntry, Habit, HabitLog, PrayerLog } from '@/types';

function getGreeting(): { text: string; icon: React.ReactNode } {
  const h = new Date().getHours();
  if (h < 6) return { text: 'Good night', icon: <Moon className="w-5 h-5" /> };
  if (h < 12) return { text: 'Good morning', icon: <Sun className="w-5 h-5" /> };
  if (h < 18) return { text: 'Good afternoon', icon: <Cloud className="w-5 h-5" /> };
  return { text: 'Good evening', icon: <Moon className="w-5 h-5" /> };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { times: prayerTimes, nextPrayer } = usePrayerTimes(user?.city || 'algiers');
  const today = format(new Date(), 'yyyy-MM-dd');

  const [sportLog, setSportLog] = useState<SportLog | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [learningEntry, setLearningEntry] = useState<LearningEntry | null>(null);
  const [habits, setHabits] = useState<{ total: number; done: number }>({ total: 0, done: 0 });
  const [prayerLogs, setPrayerLogs] = useState<PrayerLog[]>([]);

  useEffect(() => {
    if (!user) return;
    // Sport
    const sportData = getFromStorage<SportLog | null>(user.id, `sport:${today}`, null);
    setSportLog(sportData || null);
    // Tasks
    setTasks(getFromStorage<Task[]>(user.id, 'tasks', []));
    // Courses
    setCourses(getFromStorage<Course[]>(user.id, 'study:courses', []));
    // Finance
    setTransactions(getFromStorage<Transaction[]>(user.id, 'finance:transactions', []));
    // Learning
    const entries = getFromStorage<LearningEntry[]>(user.id, 'learning:entries', []);
    setLearningEntry(entries.find(e => e.date === today) || null);
    // Habits
    const hbs = getFromStorage<{ id: string }[]>(user.id, 'habits', []);
    const hLogs = getFromStorage<HabitLog[]>(user.id, 'habits:logs', []);
    setHabits({ total: hbs.length, done: hLogs.filter(l => l.date === today && l.completed).length });
    // Prayer
    setPrayerLogs(getFromStorage<PrayerLog[]>(user.id, `prayer:${today}`, []));
  }, [user, today]);

  if (!user) return null;

  const greeting = getGreeting();
  const todayCourses = courses.filter(c => c.day === new Date().getDay())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  const monthlyBalance = (() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return income - expense;
  })();
  const prayersDone = prayerLogs.filter(l => l.completed).length;
  const sportProgress = sportLog
    ? Math.round(
        (sportLog.exercises || []).reduce((sum: number, e: { completed: number; target: number }) => sum + (e.completed / (e.target || 1)), 0)
        / ((sportLog.exercises || []).length || 1) * 100
      )
    : 0;

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

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
      {user.modules.prayer && nextPrayer && (
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

      {/* Quick stats grid */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {user.modules.sport && (
          <Link href="/dashboard/sport">
            <Card variant="default" className="p-3 text-center hover:scale-[1.02] transition-transform cursor-pointer">
              <Dumbbell className="w-5 h-5 mx-auto text-[var(--success)] mb-1" />
              <p className="text-lg font-bold text-[var(--foreground)]">{sportProgress}%</p>
              <p className="text-[10px] text-[var(--foreground-muted)]">Sport</p>
            </Card>
          </Link>
        )}
        {habits.total > 0 && (
          <Link href="/dashboard/habits">
            <Card variant="default" className="p-3 text-center hover:scale-[1.02] transition-transform cursor-pointer">
              <Flame className="w-5 h-5 mx-auto text-[var(--warning)] mb-1" />
              <p className="text-lg font-bold text-[var(--foreground)]">{habits.done}/{habits.total}</p>
              <p className="text-[10px] text-[var(--foreground-muted)]">Habits</p>
            </Card>
          </Link>
        )}
        <Link href="/dashboard/tasks">
          <Card variant="default" className="p-3 text-center hover:scale-[1.02] transition-transform cursor-pointer">
            <CheckSquare className="w-5 h-5 mx-auto text-[var(--primary)] mb-1" />
            <p className="text-lg font-bold text-[var(--foreground)]">{pendingTasks}</p>
            <p className="text-[10px] text-[var(--foreground-muted)]">Tasks</p>
          </Card>
        </Link>
        <Link href="/dashboard/finance">
          <Card variant="default" className="p-3 text-center hover:scale-[1.02] transition-transform cursor-pointer">
            <Wallet className="w-5 h-5 mx-auto text-[var(--cyan)] mb-1" />
            <p className={`text-lg font-bold ${monthlyBalance >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{monthlyBalance.toFixed(0)}</p>
            <p className="text-[10px] text-[var(--foreground-muted)]">Balance DA</p>
          </Card>
        </Link>
      </motion.div>

      {/* Today's classes */}
      {todayCourses.length > 0 && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[var(--cyan)]" /> Today&apos;s Classes
            </h3>
            <Link href="/dashboard/schedule" className="text-xs text-[var(--primary)] hover:underline">See all</Link>
          </div>
          <div className="space-y-2">
            {todayCourses.slice(0, 4).map(course => {
              return (
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
              );
            })}
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
