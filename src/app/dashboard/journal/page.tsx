'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Button, PageHeader, TextArea, Label, Modal, StatCard, EmptyState, Badge } from '@/components/ui/primitives';
import { BookOpen, Plus, Trash2, Calendar, Smile, Meh, Frown, Heart } from 'lucide-react';
import { getFromStorage, saveToStorage, generateId } from '@/lib/storage';
import type { JournalEntry } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';

const MOODS: { value: JournalEntry['mood']; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'great', label: 'Great', icon: <Heart className="w-5 h-5" />, color: '#34D399' },
  { value: 'good', label: 'Good', icon: <Smile className="w-5 h-5" />, color: '#06B6D4' },
  { value: 'neutral', label: 'Neutral', icon: <Meh className="w-5 h-5" />, color: '#FBBF24' },
  { value: 'bad', label: 'Bad', icon: <Frown className="w-5 h-5" />, color: '#F97316' },
  { value: 'terrible', label: 'Terrible', icon: <Frown className="w-5 h-5" />, color: '#F87171' },
];

export default function JournalPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ content: '', mood: 'neutral' as JournalEntry['mood'], tags: '' });
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setEntries(getFromStorage<JournalEntry[]>(user.id, 'journal', []));
  }, [user]);

  const save = (updated: JournalEntry[]) => {
    if (!user) return;
    setEntries(updated);
    saveToStorage(user.id, 'journal', updated);
  };

  const addEntry = () => {
    if (!newEntry.content.trim()) return;
    save([{
      id: generateId(),
      content: newEntry.content.trim(),
      mood: newEntry.mood,
      tags: newEntry.tags.split(',').map(t => t.trim()).filter(Boolean),
      date: new Date().toISOString(),
    }, ...entries]);
    setShowAdd(false);
    setNewEntry({ content: '', mood: 'neutral', tags: '' });
  };

  const moodFor = (m: string) => MOODS.find(mood => mood.value === m) || MOODS[2];

  // today already wrote?
  const todayEntry = entries.find(e => format(new Date(e.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'));

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Journal" description="Reflect on your day" icon={<BookOpen className="w-5 h-5" />}>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Write</Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={<BookOpen className="w-5 h-5" />} label="Entries" value={entries.length} color="#A855F7" />
        <StatCard icon={<Calendar className="w-5 h-5" />} label="Today" value={todayEntry ? 'Written ✓' : 'Not yet'} color={todayEntry ? '#34D399' : '#F87171'} />
        <StatCard icon={<Smile className="w-5 h-5" />} label="Mood Trend" value={entries.length > 0 ? moodFor(entries[0].mood).label : '—'} color={entries.length > 0 ? moodFor(entries[0].mood).color : '#6E6B8A'} />
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={<BookOpen className="w-8 h-8" />} title="No entries" description="Start journaling your thoughts" action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Write First Entry</Button>} />
      ) : (
        <div className="space-y-3">
          {entries.slice(0, 50).map((entry, i) => {
            const mood = moodFor(entry.mood);
            const isExpanded = expanded === entry.id;
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Card variant="elevated" className="p-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : entry.id)}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${mood.color}20`, color: mood.color }}>
                      {mood.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-[var(--foreground-muted)]">
                          {format(new Date(entry.date), 'MMM d, yyyy • HH:mm')}
                        </span>
                        <Badge variant="outline" size="sm" style={{ borderColor: `${mood.color}40`, color: mood.color }}>{mood.label}</Badge>
                      </div>
                      <p className={`text-sm text-[var(--foreground)] ${isExpanded ? '' : 'line-clamp-2'}`} style={{ whiteSpace: 'pre-wrap' }}>
                        {entry.content}
                      </p>
                      {entry.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {entry.tags.map(tag => <Badge key={tag} variant="outline" size="sm">#{tag}</Badge>)}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); save(entries.filter(en => en.id !== entry.id)); }}>
                      <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Journal Entry">
        <div className="space-y-4">
          <div>
            <Label>How are you feeling?</Label>
            <div className="flex gap-2 mt-1">
              {MOODS.map(m => (
                <button key={m.value} onClick={() => setNewEntry(n => ({ ...n, mood: m.value }))}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${newEntry.mood === m.value ? 'bg-[var(--background-surface)]' : ''}`}
                  style={{ color: newEntry.mood === m.value ? m.color : 'var(--foreground-muted)' }}
                >
                  {m.icon}
                  <span className="text-[10px]">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>What&apos;s on your mind?</Label>
            <TextArea placeholder="Write about your day..." value={newEntry.content} onChange={e => setNewEntry(n => ({ ...n, content: e.target.value }))} rows={6} />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <input className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--background-surface)] border border-[var(--border)] text-[var(--foreground)]"
              placeholder="gratitude, reflection, goals" value={newEntry.tags} onChange={e => setNewEntry(n => ({ ...n, tags: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addEntry} disabled={!newEntry.content.trim()}>Save Entry</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
