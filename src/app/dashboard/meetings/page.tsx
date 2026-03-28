'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, TextArea, Label, Select, Modal, cn } from '@/components/ui/primitives';
import {
  Handshake, Plus, Trash2, Clock, MapPin, Bell, X, ChevronDown, ChevronUp,
  CheckSquare, Square, ListTodo, FileText, Sparkles, Send, RotateCcw, Loader2,
  StickyNote, ClipboardList, Bot, Calendar, Users, Repeat, Layout,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useUndoDelete } from '@/hooks/useUndoDelete';

// ── Types ──
interface Meeting {
  id: string;
  title: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  notes: string;
  report: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  reminder_at?: string | null;
  reminder_sent?: boolean;
  created_at: string;
}

interface MeetingTask {
  id: string;
  meeting_id: string;
  title: string;
  completed: boolean;
  source: 'manual' | 'ai';
}

interface Friend {
  id: string;
  name: string;
  relationship?: string;
}

interface MeetingTemplate {
  id: string;
  name: string;
  type: string;
  default_location: string | null;
  default_notes: string;
  default_tasks: string[];
}

interface Participant {
  friend_id: string;
  name: string;
}

const RECURRING_OPTIONS = [
  { value: '', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const TEMPLATE_TYPES: Record<string, { label: string; icon: string }> = {
  study: { label: 'Study', icon: '📚' },
  club: { label: 'Club', icon: '🎯' },
  work: { label: 'Work', icon: '💼' },
  faculty: { label: 'Faculty', icon: '🏫' },
  other: { label: 'Other', icon: '📋' },
};

const LOCATION_OPTIONS: Record<string, { label: string; icon: string }> = {
  local: { label: 'Local', icon: '🏠' },
  faculty: { label: 'Faculty', icon: '🏫' },
  discord: { label: 'Discord', icon: '💬' },
  online: { label: 'Online', icon: '🌐' },
  cafe: { label: 'Café', icon: '☕' },
  other: { label: 'Other', icon: '📍' },
};

const STATUS_OPTIONS: Record<string, { label: string; color: string; icon: string }> = {
  upcoming: { label: 'Upcoming', color: 'bg-blue-500/20 text-blue-400', icon: '🔵' },
  completed: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400', icon: '✅' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400', icon: '❌' },
};

const REMINDER_OPTIONS = [
  { value: 'none', label: 'No reminder' },
  { value: '5', label: '5 min before' },
  { value: '15', label: '15 min before' },
  { value: '30', label: '30 min before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
];

function computeReminderAt(date: string, startTime: string, minutesBefore: string): string | null {
  if (minutesBefore === 'none' || !startTime) return null;
  const dt = new Date(`${date}T${startTime}`);
  dt.setMinutes(dt.getMinutes() - parseInt(minutesBefore));
  return dt.toISOString();
}

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Form state
  const [form, setForm] = useState({
    title: '', date: '', start_time: '', end_time: '',
    location: '', notes: '', reminder: 'none',
    recurring: '', participant_ids: [] as string[],
  });

  // Friends & templates
  const [friends, setFriends] = useState<Friend[]>([]);
  const [templates, setTemplates] = useState<MeetingTemplate[]>([]);
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({});

  // Detail/report state
  const [meetingTasks, setMeetingTasks] = useState<Record<string, MeetingTask[]>>({});
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [reportText, setReportText] = useState<Record<string, string>>({});
  const [notesText, setNotesText] = useState<Record<string, string>>({});
  const [processingAI, setProcessingAI] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<Record<string, string>>({});
  const [savingReport, setSavingReport] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState<string | null>(null);

  const loadMeetings = useCallback(async () => {
    try {
      const data = await api.meetings.get() as unknown as Meeting[];
      setMeetings(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  const { triggerDelete } = useUndoDelete({
    restoreFn: (id: string) => api.meetings.restore(id),
    onRestore: loadMeetings,
    label: 'Meeting',
  });

  useEffect(() => {
    if (user) {
      loadMeetings();
      api.friends.get().then(d => setFriends(d as unknown as Friend[])).catch(() => {});
      api.meetings.templates.get().then(d => setTemplates(d as unknown as MeetingTemplate[])).catch(() => {});
    }
  }, [user, loadMeetings]);

  const loadTasks = useCallback(async (meetingId: string) => {
    try {
      const data = await api.meetings.tasks.get(meetingId) as unknown as MeetingTask[];
      setMeetingTasks(prev => ({ ...prev, [meetingId]: data }));
    } catch { /* silent */ }
  }, []);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      const m = meetings.find(mt => mt.id === id);
      if (m) {
        setReportText(prev => ({ ...prev, [id]: m.report || '' }));
        setNotesText(prev => ({ ...prev, [id]: m.notes || '' }));
      }
      if (!meetingTasks[id]) loadTasks(id);
    }
  };

  const resetForm = () => {
    setForm({ title: '', date: '', start_time: '', end_time: '', location: '', notes: '', reminder: 'none', recurring: '', participant_ids: [] });
    setEditingId(null);
    setShowAdd(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location || null,
      notes: form.notes.trim(),
      reminder_at: computeReminderAt(form.date, form.start_time, form.reminder),
      recurring: form.recurring || null,
      participant_ids: form.participant_ids,
    };

    try {
      if (editingId) {
        await api.meetings.update(editingId, payload);
        if (form.participant_ids.length >= 0) {
          await api.meetings.participants.update(editingId, form.participant_ids);
        }
      } else {
        await api.meetings.create(payload);
      }
      resetForm();
      loadMeetings();
    } catch { /* silent */ }
  };

  const handleEdit = async (m: Meeting) => {
    setForm({
      title: m.title,
      date: m.date,
      start_time: m.start_time || '',
      end_time: m.end_time || '',
      location: m.location || '',
      notes: m.notes || '',
      reminder: 'none',
      recurring: (m as unknown as Record<string, string>).recurring || '',
      participant_ids: [],
    });
    // Load existing participants
    try {
      const p = await api.meetings.participants.get(m.id) as unknown as Participant[];
      setForm(f => ({ ...f, participant_ids: p.map(x => x.friend_id) }));
    } catch { /* silent */ }
    setEditingId(m.id);
    setShowAdd(true);
  };

  const handleDelete = (m: Meeting) => {
    triggerDelete(m.id, async () => {
      await api.meetings.delete(m.id);
      loadMeetings();
    });
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.meetings.update(id, { status });
      loadMeetings();
    } catch { /* silent */ }
  };

  const saveNotes = async (id: string) => {
    setSavingNotes(id);
    try {
      await api.meetings.update(id, { notes: notesText[id] || '' });
      loadMeetings();
    } catch { /* silent */ } finally {
      setSavingNotes(null);
    }
  };

  const saveReport = async (id: string) => {
    setSavingReport(id);
    try {
      await api.meetings.update(id, { report: reportText[id] || '' });
      loadMeetings();
    } catch { /* silent */ } finally {
      setSavingReport(null);
    }
  };

  const processWithAI = async (id: string) => {
    // Save report first
    await api.meetings.update(id, { report: reportText[id] || '' });
    setProcessingAI(id);
    try {
      const result = await api.meetings.processReport(id);
      if (result.summary) {
        setAiSummary(prev => ({ ...prev, [id]: result.summary }));
      }
      await loadTasks(id);
      await loadMeetings();
    } catch { /* silent */ } finally {
      setProcessingAI(null);
    }
  };

  const toggleTask = async (taskId: string, meetingId: string, completed: boolean) => {
    try {
      await api.meetings.tasks.update(taskId, { completed: !completed });
      await loadTasks(meetingId);
    } catch { /* silent */ }
  };

  const addTask = async (meetingId: string) => {
    if (!newTaskTitle.trim()) return;
    try {
      await api.meetings.tasks.create(meetingId, newTaskTitle.trim());
      setNewTaskTitle('');
      await loadTasks(meetingId);
    } catch { /* silent */ }
  };

  const deleteTask = async (taskId: string, meetingId: string) => {
    try {
      await api.meetings.tasks.delete(taskId);
      await loadTasks(meetingId);
    } catch { /* silent */ }
  };

  // Filter meetings
  const today = new Date().toISOString().split('T')[0];
  const filtered = meetings.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return m.status === 'upcoming';
    if (filter === 'completed') return m.status === 'completed';
    if (filter === 'today') return m.date === today;
    return true;
  });

  // Split into upcoming and past
  const upcoming = filtered.filter(m => m.date >= today && m.status === 'upcoming').sort((a, b) => a.date.localeCompare(b.date));
  const past = filtered.filter(m => m.date < today || m.status !== 'upcoming').sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6 pb-24">

      <div className="flex items-center justify-between">
        <PageHeader title="Meetings" description="Organize, track, and review your meetings" />
        <Button onClick={() => { resetForm(); setShowAdd(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Meeting
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'today', label: 'Today' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'completed', label: 'Completed' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              filter === f.key
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--background-surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--foreground-muted)] tracking-wider uppercase">Upcoming</h3>
          {upcoming.map(m => (
            <MeetingCard
              key={m.id}
              meeting={m}
              expanded={expandedId === m.id}
              onToggle={() => toggleExpand(m.id)}
              onEdit={() => handleEdit(m)}
              onDelete={() => handleDelete(m)}
              onStatusChange={handleStatusChange}
              tasks={meetingTasks[m.id] || []}
              onToggleTask={toggleTask}
              onAddTask={addTask}
              onDeleteTask={deleteTask}
              newTaskTitle={newTaskTitle}
              setNewTaskTitle={setNewTaskTitle}
              reportText={reportText[m.id] || ''}
              setReportText={(v) => setReportText(prev => ({ ...prev, [m.id]: v }))}
              notesText={notesText[m.id] || ''}
              setNotesText={(v) => setNotesText(prev => ({ ...prev, [m.id]: v }))}
              onSaveNotes={() => saveNotes(m.id)}
              onSaveReport={() => saveReport(m.id)}
              onProcessAI={() => processWithAI(m.id)}
              processingAI={processingAI === m.id}
              savingReport={savingReport === m.id}
              savingNotes={savingNotes === m.id}
              aiSummary={aiSummary[m.id] || ''}
              today={today}
            />
          ))}
        </div>
      )}

      {/* Past / Completed */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--foreground-muted)] tracking-wider uppercase">Past & Completed</h3>
          {past.map(m => (
            <MeetingCard
              key={m.id}
              meeting={m}
              expanded={expandedId === m.id}
              onToggle={() => toggleExpand(m.id)}
              onEdit={() => handleEdit(m)}
              onDelete={() => handleDelete(m)}
              onStatusChange={handleStatusChange}
              tasks={meetingTasks[m.id] || []}
              onToggleTask={toggleTask}
              onAddTask={addTask}
              onDeleteTask={deleteTask}
              newTaskTitle={newTaskTitle}
              setNewTaskTitle={setNewTaskTitle}
              reportText={reportText[m.id] || ''}
              setReportText={(v) => setReportText(prev => ({ ...prev, [m.id]: v }))}
              notesText={notesText[m.id] || ''}
              setNotesText={(v) => setNotesText(prev => ({ ...prev, [m.id]: v }))}
              onSaveNotes={() => saveNotes(m.id)}
              onSaveReport={() => saveReport(m.id)}
              onProcessAI={() => processWithAI(m.id)}
              processingAI={processingAI === m.id}
              savingReport={savingReport === m.id}
              savingNotes={savingNotes === m.id}
              aiSummary={aiSummary[m.id] || ''}
              today={today}
            />
          ))}
        </div>
      )}

      {!loading && meetings.length === 0 && (
        <Card className="p-12 text-center">
          <Handshake className="w-12 h-12 mx-auto mb-3 text-[var(--foreground-muted)] opacity-40" />
          <p className="text-[var(--foreground-muted)]">No meetings yet</p>
          <p className="text-xs text-[var(--foreground-muted)] mt-1">Create your first meeting to get started</p>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAdd} onClose={resetForm} title={editingId ? 'Edit Meeting' : 'New Meeting'}>
        <div className="space-y-4">
          {/* Template quick-fill */}
          {!editingId && templates.length > 0 && (
            <div>
              <Label>From Template</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {templates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      title: f.title || t.name,
                      location: t.default_location || f.location,
                      notes: t.default_notes || f.notes,
                    }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
                  >
                    {TEMPLATE_TYPES[t.type]?.icon || '📋'} {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Team standup, 1-on-1 with Prof..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label>Reminder</Label>
              <Select value={form.reminder} onChange={e => setForm(f => ({ ...f, reminder: e.target.value }))}>
                {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>

          {/* Location chips */}
          <div>
            <Label>Location</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(LOCATION_OPTIONS).map(([key, { label, icon }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, location: f.location === key ? '' : key }))}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    form.location === key
                      ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]'
                      : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--card-border-hover)]'
                  )}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Recurring */}
          <div>
            <Label className="flex items-center gap-1"><Repeat className="w-3 h-3" /> Recurring</Label>
            <Select value={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.value }))}>
              {RECURRING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>

          {/* Participants */}
          {friends.length > 0 && (
            <div>
              <Label className="flex items-center gap-1"><Users className="w-3 h-3" /> Participants</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {friends.map(f => {
                  const selected = form.participant_ids.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        participant_ids: selected
                          ? prev.participant_ids.filter(x => x !== f.id)
                          : [...prev.participant_ids, f.id],
                      }))}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        selected
                          ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]'
                          : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--card-border-hover)]'
                      )}
                    >
                      {selected ? '✓ ' : ''}{f.name}
                    </button>
                  );
                })}
              </div>
              {form.participant_ids.length > 0 && (
                <p className="text-xs text-[var(--foreground-muted)] mt-1">{form.participant_ids.length} selected</p>
              )}
            </div>
          )}

          <div>
            <Label>Pre-meeting notes / agenda</Label>
            <TextArea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Topics to discuss, things to prepare..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || !form.date}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Meeting Card Component ──
interface MeetingCardProps {
  meeting: Meeting;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (id: string, status: string) => void;
  tasks: MeetingTask[];
  onToggleTask: (taskId: string, meetingId: string, completed: boolean) => void;
  onAddTask: (meetingId: string) => void;
  onDeleteTask: (taskId: string, meetingId: string) => void;
  newTaskTitle: string;
  setNewTaskTitle: (v: string) => void;
  reportText: string;
  setReportText: (v: string) => void;
  notesText: string;
  setNotesText: (v: string) => void;
  onSaveNotes: () => void;
  onSaveReport: () => void;
  onProcessAI: () => void;
  processingAI: boolean;
  savingReport: boolean;
  savingNotes: boolean;
  aiSummary: string;
  today: string;
}

function MeetingCard({
  meeting: m, expanded, onToggle, onEdit, onDelete, onStatusChange,
  tasks, onToggleTask, onAddTask, onDeleteTask,
  newTaskTitle, setNewTaskTitle,
  reportText, setReportText, notesText, setNotesText,
  onSaveNotes, onSaveReport, onProcessAI,
  processingAI, savingReport, savingNotes, aiSummary, today,
}: MeetingCardProps) {
  const isToday = m.date === today;
  const isPast = m.date < today;
  const st = STATUS_OPTIONS[m.status] || STATUS_OPTIONS.upcoming;
  const loc = m.location ? LOCATION_OPTIONS[m.location] : null;
  const doneTasks = tasks.filter(t => t.completed).length;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div
        className="p-4 cursor-pointer flex items-start justify-between gap-3 hover:bg-[var(--sidebar-hover)] transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[var(--foreground)] truncate">{m.title}</h3>
            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', st.color)}>{st.label}</span>
            {isToday && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">TODAY</span>}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--foreground-muted)]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {m.date}
            </span>
            {m.start_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {m.start_time.slice(0, 5)}{m.end_time ? `–${m.end_time.slice(0, 5)}` : ''}
              </span>
            )}
            {loc && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {loc.icon} {loc.label}
              </span>
            )}
            {m.reminder_at && (
              <span className="flex items-center gap-1">
                <Bell className="w-3 h-3" /> {m.reminder_sent ? '✓ Sent' : 'Set'}
              </span>
            )}
            {tasks.length > 0 && (
              <span className="flex items-center gap-1">
                <ListTodo className="w-3 h-3" /> {doneTasks}/{tasks.length}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--foreground-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" />}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-[var(--border)]">
              {/* Actions row */}
              <div className="flex items-center gap-2 pt-3 flex-wrap">
                {m.status === 'upcoming' && (
                  <Button size="sm" variant="accent" onClick={() => onStatusChange(m.id, 'completed')}>
                    <CheckSquare className="w-3.5 h-3.5 mr-1" /> Mark Done
                  </Button>
                )}
                {m.status === 'completed' && (
                  <Button size="sm" variant="ghost" onClick={() => onStatusChange(m.id, 'upcoming')}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reopen
                  </Button>
                )}
                {m.status !== 'cancelled' && (
                  <Button size="sm" variant="ghost" onClick={() => onStatusChange(m.id, 'cancelled')}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
                <Button size="sm" variant="danger" onClick={onDelete}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>

              {/* Notes (pre-meeting) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-[var(--foreground)]">Notes / Agenda</span>
                </div>
                <TextArea
                  value={notesText}
                  onChange={e => setNotesText(e.target.value)}
                  placeholder="Pre-meeting notes, topics to discuss, ideas..."
                  rows={3}
                  className="text-sm"
                />
                <Button size="sm" variant="secondary" onClick={onSaveNotes} loading={savingNotes}>
                  Save Notes
                </Button>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-[var(--foreground)]">Tasks</span>
                  {tasks.length > 0 && (
                    <span className="text-xs text-[var(--foreground-muted)]">{doneTasks}/{tasks.length} done</span>
                  )}
                </div>
                <div className="space-y-1">
                  {tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 group">
                      <button onClick={() => onToggleTask(t.id, m.id, t.completed)} className="flex-shrink-0">
                        {t.completed
                          ? <CheckSquare className="w-4 h-4 text-emerald-400" />
                          : <Square className="w-4 h-4 text-[var(--foreground-muted)]" />}
                      </button>
                      <span className={cn('text-sm flex-1', t.completed && 'line-through text-[var(--foreground-muted)]')}>
                        {t.title}
                      </span>
                      {t.source === 'ai' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 font-medium">AI</span>
                      )}
                      <button
                        onClick={() => onDeleteTask(t.id, m.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onAddTask(m.id)}
                    placeholder="Add a task..."
                    className="text-sm flex-1"
                  />
                  <Button size="sm" variant="secondary" onClick={() => onAddTask(m.id)} disabled={!newTaskTitle.trim()}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Report (post-meeting) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-[var(--foreground)]">Meeting Report</span>
                </div>
                <TextArea
                  value={reportText}
                  onChange={e => setReportText(e.target.value)}
                  placeholder="Write what happened in the meeting... decisions made, action items, follow-ups..."
                  rows={4}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={onSaveReport} loading={savingReport}>
                    Save Report
                  </Button>
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={onProcessAI}
                    disabled={!reportText.trim() || processingAI}
                    loading={processingAI}
                  >
                    <Bot className="w-3.5 h-3.5 mr-1" /> Extract Tasks with AI
                  </Button>
                </div>
              </div>

              {/* AI Summary */}
              {aiSummary && (
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-bold text-violet-400">AI Summary</span>
                  </div>
                  <p className="text-sm text-[var(--foreground-muted)]">{aiSummary}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
