'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, TextArea, Modal, Label, Select, StatCard, Tabs } from '@/components/ui/primitives';
import { BookOpen, Plus, Check, Clock, Globe, Code, Brain, Lightbulb, ExternalLink, Trash2, Calendar } from 'lucide-react';
import { getFromStorage, saveToStorage, generateId } from '@/lib/storage';
import type { LearningEntry } from '@/types';
import { format, subDays } from 'date-fns';

const CATEGORIES: { id: LearningEntry['category']; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'field', label: 'Field of Study', icon: <Brain className="w-4 h-4" />, color: '#A855F7' },
  { id: 'world', label: 'World News', icon: <Globe className="w-4 h-4" />, color: '#06B6D4' },
  { id: 'tech', label: 'Tech & Dev', icon: <Code className="w-4 h-4" />, color: '#34D399' },
  { id: 'other', label: 'Other', icon: <Lightbulb className="w-4 h-4" />, color: '#FBBF24' },
];

export default function LearningPage() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [tab, setTab] = useState('today');

  const [todayEntry, setTodayEntry] = useState<LearningEntry | null>(null);
  const [entries, setEntries] = useState<LearningEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({
    topic: '', category: 'field' as LearningEntry['category'],
    duration: 30, summary: '', links: '',
  });

  useEffect(() => {
    if (!user) return;
    const todaySaved = getFromStorage<LearningEntry | null>(user.id, `learning:${today}`, null);
    setTodayEntry(todaySaved);
    const allEntries = getFromStorage<LearningEntry[]>(user.id, 'learning:history', []);
    setEntries(allEntries);
  }, [user, today]);

  const saveEntry = () => {
    if (!user || !newEntry.topic.trim()) return;
    const entry: LearningEntry = {
      id: generateId(),
      date: today,
      topic: newEntry.topic.trim(),
      category: newEntry.category,
      duration: newEntry.duration,
      summary: newEntry.summary.trim(),
      links: newEntry.links.split('\n').map(s => s.trim()).filter(Boolean),
      completed: true,
    };
    setTodayEntry(entry);
    saveToStorage(user.id, `learning:${today}`, entry);

    // Add to history
    const history = getFromStorage<LearningEntry[]>(user.id, 'learning:history', []);
    const updated = [entry, ...history.filter(e => e.date !== today)].slice(0, 100);
    setEntries(updated);
    saveToStorage(user.id, 'learning:history', updated);
    setShowAdd(false);
    setNewEntry({ topic: '', category: 'field', duration: 30, summary: '', links: '' });
  };

  const markComplete = () => {
    if (!todayEntry || !user) return;
    const updated = { ...todayEntry, completed: true };
    setTodayEntry(updated);
    saveToStorage(user.id, `learning:${today}`, updated);
  };

  // Stats
  const streak = (() => {
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (entries.some(e => e.date === d && e.completed)) count++;
      else break;
    }
    return count;
  })();

  const totalTime = entries.reduce((sum, e) => sum + e.duration, 0);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Learning"
        description="30 minutes of learning every day"
        icon={<BookOpen className="w-5 h-5" />}
      >
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Log Learning</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<BookOpen className="w-5 h-5" />} label="Today" value={todayEntry ? `${todayEntry.duration}min` : '0min'} color="#A855F7" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Total Learning" value={`${Math.round(totalTime / 60)}h`} color="#06B6D4" />
        <StatCard icon={<Calendar className="w-5 h-5" />} label="Streak" value={`${streak} days`} color="#FBBF24" />
        <StatCard icon={<Lightbulb className="w-5 h-5" />} label="Topics Explored" value={entries.length} color="#34D399" />
      </div>

      <Tabs
        tabs={[
          { id: 'today', label: 'Today', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'history', label: 'History', icon: <Calendar className="w-4 h-4" />, count: entries.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'today' && (
        <>
          {/* Interests reminder */}
          {user.interests.length > 0 && (
            <Card variant="glass" className="p-4">
              <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">Your Interests</p>
              <div className="flex flex-wrap gap-1.5">
                {user.interests.map(i => <Badge key={i} variant="accent">{i}</Badge>)}
              </div>
            </Card>
          )}

          {todayEntry ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card variant="elevated" glow className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge variant={
                      todayEntry.category === 'field' ? 'primary' :
                      todayEntry.category === 'tech' ? 'success' :
                      todayEntry.category === 'world' ? 'accent' : 'warning'
                    }>
                      {CATEGORIES.find(c => c.id === todayEntry.category)?.label}
                    </Badge>
                    <h3 className="text-lg font-bold text-[var(--foreground)] mt-2">{todayEntry.topic}</h3>
                    <p className="text-sm text-[var(--foreground-muted)] flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {todayEntry.duration} minutes
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    todayEntry.completed ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--warning)]/15 text-[var(--warning)]'
                  }`}>
                    <Check className="w-5 h-5" />
                  </div>
                </div>
                {todayEntry.summary && (
                  <p className="text-sm text-[var(--foreground-muted)] mb-3">{todayEntry.summary}</p>
                )}
                {todayEntry.links.length > 0 && (
                  <div className="space-y-1">
                    {todayEntry.links.map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
                        <ExternalLink className="w-3 h-3" /> {link}
                      </a>
                    ))}
                  </div>
                )}
                {!todayEntry.completed && (
                  <Button variant="primary" className="mt-3" onClick={markComplete}>
                    <Check className="w-4 h-4" /> Mark Complete
                  </Button>
                )}
              </Card>
            </motion.div>
          ) : (
            <Card className="p-8 text-center">
              <BookOpen className="w-8 h-8 text-[var(--foreground-muted)]/30 mx-auto mb-3" />
              <p className="text-sm text-[var(--foreground-muted)] mb-3">No learning logged today. Spend 30 minutes exploring!</p>
              <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Log Today&apos;s Learning</Button>
            </Card>
          )}
        </>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {entries.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-[var(--foreground-muted)]">No learning history yet.</p>
            </Card>
          ) : (
            entries.slice(0, 30).map((entry, i) => {
              const cat = CATEGORIES.find(c => c.id === entry.category);
              return (
                <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                  <Card variant="default" className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${cat?.color}15`, color: cat?.color }}>
                          {cat?.icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">{entry.topic}</p>
                          <p className="text-xs text-[var(--foreground-muted)]">{entry.date} • {entry.duration}min</p>
                        </div>
                      </div>
                      <Badge variant={entry.completed ? 'success' : 'outline'}>
                        {entry.completed ? 'Done' : 'Partial'}
                      </Badge>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Log Today's Learning" description="What did you learn today?">
        <div className="space-y-4">
          <div>
            <Label>Topic</Label>
            <Input placeholder="e.g. New React Server Components features" value={newEntry.topic} onChange={e => setNewEntry(m => ({ ...m, topic: e.target.value }))} />
          </div>
          <div>
            <Label>Category</Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setNewEntry(m => ({ ...m, category: cat.id }))}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-sm ${
                    newEntry.category === cat.id
                      ? 'border-[var(--primary)]/30 bg-[var(--primary)]/[0.04]'
                      : 'border-[var(--border)] hover:border-[var(--card-border-hover)]'
                  }`}
                >
                  <span style={{ color: cat.color }}>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Duration (minutes)</Label>
            <Input type="number" value={newEntry.duration} onChange={e => setNewEntry(m => ({ ...m, duration: parseInt(e.target.value) || 0 }))} />
          </div>
          <div>
            <Label>Summary (optional)</Label>
            <TextArea placeholder="Brief notes..." value={newEntry.summary} onChange={e => setNewEntry(m => ({ ...m, summary: e.target.value }))} rows={3} />
          </div>
          <div>
            <Label>Links (one per line, optional)</Label>
            <TextArea placeholder="https://..." value={newEntry.links} onChange={e => setNewEntry(m => ({ ...m, links: e.target.value }))} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={saveEntry} disabled={!newEntry.topic.trim()}>Save Learning</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
