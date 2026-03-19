'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, Label, Modal, StatCard, EmptyState, Select } from '@/components/ui/primitives';
import { BookOpenCheck, Plus, Flame, BookOpen, FileText, Trash2, Edit } from 'lucide-react';
import { api } from '@/lib/api';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

interface QuranLog {
  id: string; date: string; surah_number: number; surah_name: string;
  from_ayah: number; to_ayah: number; pages_read: number;
  type: 'reading' | 'memorization' | 'revision'; notes: string; created_at: string;
}

const TYPES = [
  { value: 'reading', label: 'Reading' },
  { value: 'memorization', label: 'Memorization' },
  { value: 'revision', label: 'Revision' },
];

const empty: { surah_number: number; surah_name: string; from_ayah: number; to_ayah: number; pages_read: number; type: 'reading' | 'memorization' | 'revision'; notes: string; date: string } = { surah_number: 1, surah_name: '', from_ayah: 1, to_ayah: 7, pages_read: 1, type: 'reading', notes: '', date: format(new Date(), 'yyyy-MM-dd') };

export default function QuranPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<QuranLog[]>([]);
  const [stats, setStats] = useState<{ total_pages: number; total_sessions: number; current_streak: number; types: Record<string, number> } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [l, s] = await Promise.all([
        api.quran.get({ from: format(subDays(new Date(), 30), 'yyyy-MM-dd') }),
        api.quran.stats(),
      ]);
      setLogs(l as unknown as QuranLog[]);
      setStats(s as { total_pages: number; total_sessions: number; current_streak: number; types: Record<string, number> });
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.surah_name.trim()) { toast.error('Surah name required'); return; }
    try {
      if (editId) {
        await api.quran.update(editId, form);
        toast.success('Updated');
      } else {
        await api.quran.create(form);
        toast.success('Logged');
      }
      setShowAdd(false); setEditId(null); setForm(empty); load();
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id: string) => {
    await api.quran.delete(id);
    load();
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Quran Tracker" description="Track your Quran reading journey" icon={<BookOpenCheck className="w-5 h-5" />}>
        <Button onClick={() => { setForm(empty); setEditId(null); setShowAdd(true); }}><Plus className="w-4 h-4" /> Log Session</Button>
      </PageHeader>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<FileText className="w-5 h-5" />} label="Total Pages" value={stats.total_pages} color="#34D399" />
          <StatCard icon={<BookOpen className="w-5 h-5" />} label="Sessions" value={stats.total_sessions} color="#A855F7" />
          <StatCard icon={<Flame className="w-5 h-5" />} label="Streak" value={stats.current_streak} sub="days" color="#F97316" />
          <StatCard icon={<BookOpenCheck className="w-5 h-5" />} label="Memorized" value={stats.types?.memorization || 0} sub="sessions" color="#06B6D4" />
        </div>
      )}

      {logs.length === 0 ? (
        <EmptyState
          icon={<BookOpenCheck className="w-8 h-8" />}
          title="No sessions yet"
          description="Start tracking your Quran reading"
          action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Log Session</Button>}
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log, i) => (
            <motion.div key={log.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card variant="elevated" className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center">
                    <BookOpenCheck className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {log.surah_name} ({log.from_ayah}-{log.to_ayah})
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={log.type === 'memorization' ? 'primary' : log.type === 'revision' ? 'warning' : 'outline'} size="sm">
                        {log.type}
                      </Badge>
                      <span className="text-xs text-[var(--foreground-muted)]">{log.pages_read} pages • {log.date}</span>
                    </div>
                    {log.notes && <p className="text-xs text-[var(--foreground-muted)] mt-1">{log.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setForm(log); setEditId(log.id); setShowAdd(true); }}>
                      <Edit className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setEditId(null); }} title={editId ? 'Edit Session' : 'Log Quran Session'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>Type</Label><Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'reading' | 'memorization' | 'revision' }))}>{TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Surah Number</Label><Input type="number" min={1} max={114} value={form.surah_number} onChange={e => setForm(f => ({ ...f, surah_number: +e.target.value }))} /></div>
            <div><Label>Surah Name</Label><Input placeholder="Al-Fatiha" value={form.surah_name} onChange={e => setForm(f => ({ ...f, surah_name: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>From Ayah</Label><Input type="number" min={1} value={form.from_ayah} onChange={e => setForm(f => ({ ...f, from_ayah: +e.target.value }))} /></div>
            <div><Label>To Ayah</Label><Input type="number" min={1} value={form.to_ayah} onChange={e => setForm(f => ({ ...f, to_ayah: +e.target.value }))} /></div>
            <div><Label>Pages</Label><Input type="number" min={0} step={0.5} value={form.pages_read} onChange={e => setForm(f => ({ ...f, pages_read: +e.target.value }))} /></div>
          </div>
          <div><Label>Notes</Label><Input placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setShowAdd(false); setEditId(null); }}>Cancel</Button>
            <Button onClick={handleSubmit}>{editId ? 'Update' : 'Log'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
