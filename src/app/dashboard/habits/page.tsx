'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, Label, Modal, StatCard, EmptyState, ProgressRing } from '@/components/ui/primitives';
import { Repeat, Plus, Check, Flame, Target, Trash2 } from 'lucide-react';
import { getFromStorage, saveToStorage, generateId } from '@/lib/storage';
import type { Habit, HabitLog } from '@/types';
import { format, subDays, isSameDay } from 'date-fns';

const COLORS = ['#A855F7', '#06B6D4', '#34D399', '#FBBF24', '#F87171', '#EC4899', '#3B82F6', '#F97316'];

export default function HabitsPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', color: COLORS[0] });
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) return;
    setHabits(getFromStorage<Habit[]>(user.id, 'habits', []));
    setLogs(getFromStorage<HabitLog[]>(user.id, 'habits:logs', []));
  }, [user]);

  const savH = (h: Habit[]) => { if(user) { setHabits(h); saveToStorage(user.id, 'habits', h); } };
  const savL = (l: HabitLog[]) => { if(user) { setLogs(l); saveToStorage(user.id, 'habits:logs', l); } };

  const addHabit = () => {
    if (!newHabit.name.trim()) return;
    savH([...habits, { id: generateId(), name: newHabit.name.trim(), color: newHabit.color, createdAt: new Date().toISOString() }]);
    setShowAdd(false);
    setNewHabit({ name: '', color: COLORS[Math.floor(Math.random() * COLORS.length)] });
  };

  const toggleToday = (habitId: string) => {
    const existing = logs.find(l => l.habitId === habitId && l.date === today);
    if (existing) {
      savL(logs.filter(l => l.id !== existing.id));
    } else {
      savL([...logs, { id: generateId(), habitId, date: today, completed: true }]);
    }
  };

  const isCompletedToday = (habitId: string) => logs.some(l => l.habitId === habitId && l.date === today && l.completed);

  const getStreak = (habitId: string) => {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (logs.some(l => l.habitId === habitId && l.date === date && l.completed)) streak++;
      else break;
    }
    return streak;
  };

  // Last 7 days grid
  const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));

  const completionToday = habits.length > 0 ? Math.round((habits.filter(h => isCompletedToday(h.id)).length / habits.length) * 100) : 0;

  const bestStreak = useMemo(() => habits.reduce((m, h) => Math.max(m, getStreak(h.id)), 0), [habits, logs]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Habits" description="Track daily habits" icon={<Repeat className="w-5 h-5" />}>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Habit</Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={<Target className="w-5 h-5" />} label="Today" value={`${completionToday}%`} color="#A855F7" />
        <StatCard icon={<Flame className="w-5 h-5" />} label="Best Streak" value={bestStreak} sub="days" color="#F97316" />
        <StatCard icon={<Repeat className="w-5 h-5" />} label="Habits" value={habits.length} color="#06B6D4" />
      </div>

      {habits.length === 0 ? (
        <EmptyState icon={<Repeat className="w-8 h-8" />} title="No habits yet" description="Start building good habits" action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Habit</Button>} />
      ) : (
        <div className="space-y-3">
          {habits.map((habit, i) => {
            const done = isCompletedToday(habit.id);
            const streak = getStreak(habit.id);
            return (
              <motion.div key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card variant="elevated" className="p-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleToday(habit.id)}>
                      <motion.div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-colors ${
                          done ? 'border-transparent' : 'border-[var(--border)]'
                        }`}
                        style={{ backgroundColor: done ? habit.color : 'transparent' }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {done && <Check className="w-5 h-5 text-white" />}
                      </motion.div>
                    </button>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${done ? 'line-through opacity-60' : ''}`} style={{ color: 'var(--foreground)' }}>{habit.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {streak > 0 && <Badge variant="warning" size="sm"><Flame className="w-3 h-3" /> {streak}d</Badge>}
                        {/* 7-day mini grid */}
                        <div className="flex gap-0.5">
                          {last7.map(date => {
                            const completed = logs.some(l => l.habitId === habit.id && l.date === date && l.completed);
                            return (
                              <div
                                key={date}
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: completed ? habit.color : 'var(--background-surface)' }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => savH(habits.filter(h => h.id !== habit.id))}>
                      <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Habit">
        <div className="space-y-4">
          <div><Label>Habit Name</Label><Input placeholder="e.g. Read 30 min" value={newHabit.name} onChange={e => setNewHabit(m => ({ ...m, name: e.target.value }))} /></div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => setNewHabit(m => ({ ...m, color: c }))} className="w-7 h-7 rounded-lg" style={{ backgroundColor: c, outline: newHabit.color === c ? '2px solid var(--foreground)' : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addHabit} disabled={!newHabit.name.trim()}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
