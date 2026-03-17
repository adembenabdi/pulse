'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, ProgressRing, StatCard } from '@/components/ui/primitives';
import { Dumbbell, Check, Trophy, Flame, Footprints, RotateCcw, Calendar } from 'lucide-react';
import { getFromStorage, saveToStorage, generateId } from '@/lib/storage';
import type { SportLog, ExerciseSet, ExerciseType } from '@/types';
import { format, isFriday } from 'date-fns';

const EXERCISES: { type: ExerciseType; label: string; icon: string; target: number; color: string }[] = [
  { type: 'pushups', label: 'Push-ups', icon: '💪', target: 20, color: '#F87171' },
  { type: 'pullups', label: 'Pull-ups', icon: '🏋️', target: 20, color: '#A855F7' },
  { type: 'squats', label: 'Squats', icon: '🦵', target: 20, color: '#06B6D4' },
  { type: 'abs', label: 'Abs', icon: '🔥', target: 20, color: '#FBBF24' },
];

export default function SportPage() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const isFridayToday = isFriday(new Date());

  const [log, setLog] = useState<SportLog | null>(null);

  useEffect(() => {
    if (!user) return;
    const saved = getFromStorage<SportLog | null>(user.id, `sport:${today}`, null);
    if (saved) {
      setLog(saved);
    } else {
      // Create today's log
      const newLog: SportLog = {
        id: generateId(),
        date: today,
        exercises: EXERCISES.map(e => ({
          type: e.type,
          target: e.target,
          completed: 0,
          done: false,
        })),
        isFriday: isFridayToday,
        fridayRun: isFridayToday ? { distance: 10, completed: false, afterFajr: false } : undefined,
      };
      setLog(newLog);
      saveToStorage(user.id, `sport:${today}`, newLog);
    }
  }, [user, today, isFridayToday]);

  const updateExercise = (type: ExerciseType, completed: number) => {
    if (!log || !user) return;
    const updated = {
      ...log,
      exercises: log.exercises.map(e =>
        e.type === type ? { ...e, completed: Math.min(completed, e.target), done: completed >= e.target } : e
      ),
    };
    // Check if all done
    if (updated.exercises.every(e => e.done)) {
      updated.completedAt = new Date().toISOString();
    }
    setLog(updated);
    saveToStorage(user.id, `sport:${today}`, updated);
  };

  const toggleExerciseDone = (type: ExerciseType) => {
    if (!log) return;
    const ex = log.exercises.find(e => e.type === type);
    if (!ex) return;
    if (ex.done) {
      updateExercise(type, 0);
    } else {
      updateExercise(type, ex.target);
    }
  };

  const toggleFridayRun = () => {
    if (!log || !user || !log.fridayRun) return;
    const updated = {
      ...log,
      fridayRun: { ...log.fridayRun, completed: !log.fridayRun.completed },
    };
    setLog(updated);
    saveToStorage(user.id, `sport:${today}`, updated);
  };

  const totalProgress = useMemo(() => {
    if (!log) return 0;
    const exerciseProgress = log.exercises.reduce((sum, e) => sum + (e.completed / e.target), 0) / log.exercises.length;
    if (log.isFriday && log.fridayRun) {
      return Math.round(((exerciseProgress * 0.7) + (log.fridayRun.completed ? 0.3 : 0)) * 100);
    }
    return Math.round(exerciseProgress * 100);
  }, [log]);

  // Load streak
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    if (!user) return;
    const s = getFromStorage<number>(user.id, 'sport:streak', 0);
    setStreak(s);
  }, [user]);

  if (!user || !log) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sport & Exercise"
        description={isFridayToday ? '🏃 Friday Special — 10km run + exercises!' : 'Daily workout routine'}
        icon={<Dumbbell className="w-5 h-5" />}
      >
        <div className="flex items-center gap-2">
          <Badge variant="primary"><Flame className="w-3 h-3" /> {streak} day streak</Badge>
        </div>
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Dumbbell className="w-5 h-5" />} label="Today's Progress" value={`${totalProgress}%`} color="#A855F7" />
        <StatCard icon={<Trophy className="w-5 h-5" />} label="Exercises Done" value={`${log.exercises.filter(e => e.done).length}/4`} color="#06B6D4" />
        <StatCard icon={<Flame className="w-5 h-5" />} label="Current Streak" value={streak} sub="days" color="#FBBF24" />
        <StatCard icon={<Calendar className="w-5 h-5" />} label="Day" value={isFridayToday ? 'Friday' : format(new Date(), 'EEEE')} color="#34D399" />
      </div>

      {/* Overall progress */}
      <Card variant="elevated" glow className="p-6">
        <div className="flex items-center gap-6">
          <ProgressRing progress={totalProgress} size={80} strokeWidth={5} color="var(--primary)">
            <span className="text-lg font-bold">{totalProgress}%</span>
          </ProgressRing>
          <div>
            <h3 className="text-lg font-bold text-[var(--foreground)]">
              {totalProgress === 100 ? '🎉 All done! Great work!' : totalProgress >= 50 ? '💪 Keep going!' : 'Start your workout!'}
            </h3>
            <p className="text-sm text-[var(--foreground-muted)]">
              {log.exercises.filter(e => e.done).length} of {log.exercises.length} exercises completed
              {isFridayToday && log.fridayRun && ` • 10km run ${log.fridayRun.completed ? '✅' : 'pending'}`}
            </p>
          </div>
        </div>
      </Card>

      {/* Friday Run */}
      {isFridayToday && log.fridayRun && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card variant="interactive" depth className={`p-5 ${log.fridayRun.completed ? 'opacity-70' : ''}`} onClick={toggleFridayRun}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--success)] to-[var(--accent)] flex items-center justify-center text-white">
                  <Footprints className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--foreground)]">Friday Morning Run</p>
                  <p className="text-sm text-[var(--foreground-muted)]">10km run after Fajr prayer</p>
                </div>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                log.fridayRun.completed
                  ? 'bg-[var(--success)]/20 text-[var(--success)]'
                  : 'bg-[var(--background-surface)] text-[var(--foreground-muted)]'
              }`}>
                {log.fridayRun.completed ? <Check className="w-5 h-5" /> : <Footprints className="w-5 h-5" />}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXERCISES.map((ex, i) => {
          const logEx = log.exercises.find(e => e.type === ex.type)!;
          const progress = Math.round((logEx.completed / logEx.target) * 100);
          return (
            <motion.div
              key={ex.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card variant="interactive" depth className={`p-5 ${logEx.done ? 'opacity-70' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ex.icon}</span>
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{ex.label}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">{logEx.completed}/{logEx.target} reps</p>
                    </div>
                  </div>
                  <ProgressRing progress={progress} size={44} strokeWidth={3} color={ex.color}>
                    <span className="text-[10px] font-bold">{progress}%</span>
                  </ProgressRing>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-[var(--background-surface)] mb-3">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: ex.color }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateExercise(ex.type, Math.min(logEx.completed + 5, logEx.target))}
                    disabled={logEx.done}
                  >
                    +5
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateExercise(ex.type, Math.min(logEx.completed + 10, logEx.target))}
                    disabled={logEx.done}
                  >
                    +10
                  </Button>
                  <Button
                    variant={logEx.done ? 'ghost' : 'primary'}
                    size="sm"
                    onClick={() => toggleExerciseDone(ex.type)}
                    className="ml-auto"
                  >
                    {logEx.done ? <><RotateCcw className="w-3 h-3" /> Reset</> : <><Check className="w-3 h-3" /> Done</>}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
