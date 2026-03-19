'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, Label, Modal, StatCard, EmptyState } from '@/components/ui/primitives';
import { Repeat, Plus, Check, Flame, Target, Trash2, CalendarDays } from 'lucide-react';
import { api } from '@/lib/api';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import { format, subDays } from 'date-fns';

const COLORS = ['#A855F7', '#06B6D4', '#34D399', '#FBBF24', '#F87171', '#EC4899', '#3B82F6', '#F97316'];

interface Habit { id: string; name: string; color: string; created_at: string; }
interface HabitLog { id: string; habit_id: string; date: string; completed: boolean; }

export default function HabitsPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', color: COLORS[0] });
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const today = format(new Date(), 'yyyy-MM-dd');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [h, l] = await Promise.all([
        api.habits.get(),
        api.habits.logs.get({ from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: today }),
      ]);
      setHabits(h as unknown as Habit[]);
      setLogs(l as unknown as HabitLog[]);
    } catch { /* ignore */ }
  }, [user, today]);

  useEffect(() => { load(); }, [load]);

  const { triggerDelete } = useUndoDelete({
    restoreFn: (id) => api.habits.restore(id),
    onRestore: load,
    label: 'Habit',
  });

  const addHabit = async () => {
    if (!newHabit.name.trim()) return;
    await api.habits.create({ name: newHabit.name.trim(), color: newHabit.color });
    setShowAdd(false);
    setNewHabit({ name: '', color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    load();
  };

  const toggleLog = async (habitId: string, date: string) => {
    const existing = logs.find(l => l.habit_id === habitId && l.date === date && l.completed);
    await api.habits.logs.toggle({ habit_id: habitId, date, completed: !existing });
    load();
  };

  const isCompleted = (habitId: string, date: string) => logs.some(l => l.habit_id === habitId && l.date === date && l.completed);

  const getStreak = (habitId: string) => {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (logs.some(l => l.habit_id === habitId && l.date === date && l.completed)) streak++;
      else break;
    }
    return streak;
  };

  const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));

  const completionToday = habits.length > 0 ? Math.round((habits.filter(h => isCompleted(h.id, today)).length / habits.length) * 100) : 0;
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

      {/* Date selector for streak recovery */}
      <Card variant="default" className="p-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-4 h-4 text-[var(--foreground-muted)]" />
          <Label className="text-xs">Log for date:</Label>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-sm bg-[var(--background-surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[var(--foreground)]"
          />
          {selectedDate !== today && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(today)}>Today</Button>
          )}
        </div>
      </Card>

      {habits.length === 0 ? (
        <EmptyState icon={<Repeat className="w-8 h-8" />} title="No habits yet" description="Start building good habits" action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Habit</Button>} />
      ) : (
        <div className="space-y-3">
          {habits.map((habit, i) => {
            const done = isCompleted(habit.id, selectedDate);
            const streak = getStreak(habit.id);
            return (
              <motion.div key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card variant="elevated" className="p-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleLog(habit.id, selectedDate)}>
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
                        <div className="flex gap-0.5">
                          {last7.map(date => {
                            const completed = isCompleted(habit.id, date);
                            return (
                              <button
                                key={date}
                                onClick={() => toggleLog(habit.id, date)}
                                className="w-3 h-3 rounded-sm hover:scale-150 transition-transform"
                                style={{ backgroundColor: completed ? habit.color : 'var(--background-surface)' }}
                                title={date}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => triggerDelete(habit.id, () => api.habits.delete(habit.id))}>
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
