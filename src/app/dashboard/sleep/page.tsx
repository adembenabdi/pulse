'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, Label, Modal, StatCard, EmptyState, Select } from '@/components/ui/primitives';
import { Moon, Plus, Trash2, Sun, Clock, Zap, Coffee } from 'lucide-react';
import { api } from '@/lib/api';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

interface SleepLog {
  id: string;
  date: string;
  bedtime: string | null;
  wake_time: string | null;
  duration_minutes: number | null;
  is_nap: boolean;
  notes: string;
}

function calcDuration(bedtime: string | null, wakeTime: string | null): number | null {
  if (!bedtime || !wakeTime) return null;
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let bedMins = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= bedMins) wakeMins += 24 * 60; // crossed midnight
  return wakeMins - bedMins;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function SleepPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    bedtime: '23:00',
    wake_time: '07:00',
    is_nap: false,
    notes: '',
  });

  const load = useCallback(async () => {
    try {
      const from = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const data = await api.sleep.get({ from }) as unknown as SleepLog[];
      setLogs(data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const addLog = async () => {
    try {
      const duration = form.is_nap
        ? calcDuration(form.bedtime, form.wake_time)
        : calcDuration(form.bedtime, form.wake_time);
      await api.sleep.create({
        date: form.date,
        bedtime: form.bedtime || null,
        wake_time: form.wake_time || null,
        duration_minutes: duration,
        is_nap: form.is_nap,
        notes: form.notes,
      });
      toast.success(form.is_nap ? 'Nap logged!' : 'Sleep logged!');
      await load();
      setShowAdd(false);
      setForm({ date: format(new Date(), 'yyyy-MM-dd'), bedtime: '23:00', wake_time: '07:00', is_nap: false, notes: '' });
    } catch { toast.error('Failed to log sleep'); }
  };

  const deleteLog = async (id: string) => {
    try {
      await api.sleep.delete(id);
      setLogs(l => l.filter(x => x.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // Stats
  const sleepLogs = useMemo(() => logs.filter(l => !l.is_nap), [logs]);
  const naps = useMemo(() => logs.filter(l => l.is_nap), [logs]);
  const weekLogs = useMemo(() => {
    const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    return sleepLogs.filter(l => l.date >= weekAgo);
  }, [sleepLogs]);
  const avgDuration = weekLogs.length > 0
    ? Math.round(weekLogs.reduce((s, l) => s + (l.duration_minutes || 0), 0) / weekLogs.length)
    : 0;
  const avgBedtime = useMemo(() => {
    const beds = weekLogs.filter(l => l.bedtime).map(l => {
      const [h, m] = l.bedtime!.split(':').map(Number);
      return h * 60 + m;
    });
    if (beds.length === 0) return '--:--';
    const avg = Math.round(beds.reduce((s, v) => s + v, 0) / beds.length);
    return `${String(Math.floor(avg / 60) % 24).padStart(2, '0')}:${String(avg % 60).padStart(2, '0')}`;
  }, [weekLogs]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Sleep" description="Track your sleep and naps" icon={<Moon className="w-5 h-5" />}>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Log Sleep</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Clock className="w-5 h-5" />} label="Avg Duration" value={avgDuration ? formatDuration(avgDuration) : '--'} color="#818CF8" />
        <StatCard icon={<Moon className="w-5 h-5" />} label="Avg Bedtime" value={avgBedtime} color="#6366F1" />
        <StatCard icon={<Sun className="w-5 h-5" />} label="This Week" value={`${weekLogs.length} nights`} color="#F59E0B" />
        <StatCard icon={<Coffee className="w-5 h-5" />} label="Naps" value={`${naps.length}`} sub="this month" color="#06B6D4" />
      </div>

      {/* Sleep duration visual for the week */}
      {weekLogs.length > 0 && (
        <Card variant="elevated" className="p-5">
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-3">Last 7 Days</h3>
          <div className="flex items-end gap-2 h-24">
            {Array.from({ length: 7 }, (_, i) => {
              const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
              const log = sleepLogs.find(l => l.date === d);
              const mins = log?.duration_minutes || 0;
              const pct = Math.min(mins / 600, 1) * 100; // 10h max
              const isGood = mins >= 420; // 7+ hours
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    className="w-full rounded-t-md"
                    style={{ backgroundColor: isGood ? 'var(--success)' : mins > 0 ? 'var(--warning)' : 'var(--background-surface)' }}
                    animate={{ height: `${Math.max(pct, 4)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                  />
                  <span className="text-[9px] text-[var(--foreground-muted)]">{format(subDays(new Date(), 6 - i), 'EEE')}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Logs List */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-[var(--foreground-muted)] text-center py-8">Loading...</p>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Moon className="w-8 h-8" />}
            title="No sleep logs yet"
            description="Start tracking your sleep schedule"
            action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Log Sleep</Button>}
          />
        ) : (
          logs.map((log, i) => (
            <motion.div key={log.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card variant="default" className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${log.is_nap ? 'bg-cyan-500/15 text-cyan-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                      {log.is_nap ? <Coffee className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {log.is_nap ? 'Nap' : 'Sleep'} • {log.duration_minutes ? formatDuration(log.duration_minutes) : '--'}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {log.date} {log.bedtime && log.wake_time ? `• ${log.bedtime.slice(0, 5)} → ${log.wake_time.slice(0, 5)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.duration_minutes && !log.is_nap && (
                      <Badge variant={log.duration_minutes >= 420 ? 'success' : log.duration_minutes >= 360 ? 'warning' : 'danger'}>
                        {log.duration_minutes >= 420 ? 'Good' : log.duration_minutes >= 360 ? 'OK' : 'Low'}
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteLog(log.id)}>
                      <Trash2 className="w-3 h-3 text-[var(--danger)]" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Sleep Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={form.is_nap ? 'Log Nap' : 'Log Sleep'}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={!form.is_nap ? 'primary' : 'secondary'} size="sm" onClick={() => setForm(f => ({ ...f, is_nap: false }))}>
              <Moon className="w-3.5 h-3.5" /> Sleep
            </Button>
            <Button variant={form.is_nap ? 'accent' : 'secondary'} size="sm" onClick={() => setForm(f => ({ ...f, is_nap: true }))}>
              <Coffee className="w-3.5 h-3.5" /> Nap
            </Button>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{form.is_nap ? 'Start' : 'Bedtime'}</Label>
              <Input type="time" value={form.bedtime} onChange={e => setForm(f => ({ ...f, bedtime: e.target.value }))} />
            </div>
            <div>
              <Label>{form.is_nap ? 'End' : 'Wake Time'}</Label>
              <Input type="time" value={form.wake_time} onChange={e => setForm(f => ({ ...f, wake_time: e.target.value }))} />
            </div>
          </div>
          {form.bedtime && form.wake_time && (
            <p className="text-sm text-[var(--foreground-muted)]">
              Duration: <span className="font-semibold text-[var(--foreground)]">{formatDuration(calcDuration(form.bedtime, form.wake_time) || 0)}</span>
            </p>
          )}
          <div>
            <Label>Notes (optional)</Label>
            <Input placeholder="How did you sleep?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addLog}>Log {form.is_nap ? 'Nap' : 'Sleep'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
