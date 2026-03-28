'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, TextArea, Label, Select, Modal, cn } from '@/components/ui/primitives';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Clock, MapPin,
  Star, Flag, Moon, Heart, Briefcase, Users, GraduationCap, Sparkles, X, GripVertical, Bell,
  CheckSquare, Square, ListTodo,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useUndoDelete } from '@/hooks/useUndoDelete';

// ── Types ──
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  category: string;
  color?: string | null;
  description: string;
  all_day: boolean;
  location?: string | null;
  reminder_at?: string | null;
  reminder_sent?: boolean;
  isHoliday?: boolean; // virtual — not stored in DB
}

interface EventTask {
  id: string;
  event_id: string;
  title: string;
  completed: boolean;
}

const LOCATION_OPTIONS: Record<string, { label: string; icon: string }> = {
  local: { label: 'Local', icon: '🏠' },
  faculty: { label: 'Faculty', icon: '🏫' },
  discord: { label: 'Discord', icon: '💬' },
  online: { label: 'Online', icon: '🌐' },
  cafe: { label: 'Café', icon: '☕' },
  other: { label: 'Other', icon: '📍' },
};

// ── Event categories ──
const EVENT_CATEGORIES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  personal:    { label: 'Personal',    icon: <Heart className="w-3.5 h-3.5" />,          color: '#A855F7' },
  club:        { label: 'Club',        icon: <Users className="w-3.5 h-3.5" />,          color: '#06B6D4' },
  university:  { label: 'University',  icon: <GraduationCap className="w-3.5 h-3.5" />,  color: '#3B82F6' },
  work:        { label: 'Work',        icon: <Briefcase className="w-3.5 h-3.5" />,      color: '#34D399' },
  deadline:    { label: 'Deadline',    icon: <Flag className="w-3.5 h-3.5" />,           color: '#F87171' },
  religious:   { label: 'Religious',   icon: <Moon className="w-3.5 h-3.5" />,           color: '#FBBF24' },
  national:    { label: 'National',    icon: <Star className="w-3.5 h-3.5" />,           color: '#10B981' },
  international: { label: 'International', icon: <Sparkles className="w-3.5 h-3.5" />,   color: '#EC4899' },
};

const CATEGORY_COLORS = Object.values(EVENT_CATEGORIES).map(c => c.color);

// ── Built-in holidays for Algeria + Islamic + International ──
function getBuiltInHolidays(year: number): CalendarEvent[] {
  const h = (date: string, title: string, category: string, color: string): CalendarEvent => ({
    id: `holiday-${date}-${title.replace(/\s/g, '')}`,
    title, date, category, color, description: '', all_day: true, isHoliday: true,
  });

  const holidays: CalendarEvent[] = [
    // ── Algerian National Days ──
    h(`${year}-01-01`, "New Year's Day", 'national', '#10B981'),
    h(`${year}-01-12`, 'Yennayer (Amazigh New Year)', 'national', '#10B981'),
    h(`${year}-02-24`, 'Youm El Chahid', 'national', '#10B981'),
    h(`${year}-03-19`, 'Victory Day (Fête de la Victoire)', 'national', '#10B981'),
    h(`${year}-05-01`, 'Labour Day', 'national', '#10B981'),
    h(`${year}-07-05`, 'Independence Day', 'national', '#10B981'),
    h(`${year}-11-01`, 'Revolution Day', 'national', '#10B981'),

    // ── International Days ──
    h(`${year}-02-14`, "Valentine's Day", 'international', '#EC4899'),
    h(`${year}-03-08`, "International Women's Day", 'international', '#EC4899'),
    h(`${year}-03-20`, 'International Day of Happiness', 'international', '#EC4899'),
    h(`${year}-03-21`, 'World Poetry Day', 'international', '#EC4899'),
    h(`${year}-04-07`, 'World Health Day', 'international', '#EC4899'),
    h(`${year}-04-22`, 'Earth Day', 'international', '#EC4899'),
    h(`${year}-05-03`, 'World Press Freedom Day', 'international', '#EC4899'),
    h(`${year}-06-05`, 'World Environment Day', 'international', '#EC4899'),
    h(`${year}-09-08`, 'International Literacy Day', 'international', '#EC4899'),
    h(`${year}-09-21`, 'International Day of Peace', 'international', '#EC4899'),
    h(`${year}-10-05`, "World Teachers' Day", 'international', '#EC4899'),
    h(`${year}-10-16`, 'World Food Day', 'international', '#EC4899'),
    h(`${year}-10-24`, 'United Nations Day', 'international', '#EC4899'),
    h(`${year}-11-16`, 'International Day of Tolerance', 'international', '#EC4899'),
    h(`${year}-12-10`, 'Human Rights Day', 'international', '#EC4899'),
    h(`${year}-12-25`, 'Christmas', 'international', '#EC4899'),
  ];

  return holidays;
}

// ── Helpers ──
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(Object.keys(EVENT_CATEGORIES)));
  const [islamicHolidays, setIslamicHolidays] = useState<CalendarEvent[]>([]);
  const [friendBirthdays, setFriendBirthdays] = useState<CalendarEvent[]>([]);
  const [studyExams, setStudyExams] = useState<CalendarEvent[]>([]);
  const [calendarMeetings, setCalendarMeetings] = useState<CalendarEvent[]>([]);

  const [form, setForm] = useState({
    title: '', date: '', start_time: '', end_time: '',
    category: 'personal', color: '', description: '', all_day: true,
    reminder: 'none' as string, location: '' as string,
  });
  const [formTasks, setFormTasks] = useState<string[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Drag state for event rescheduling
  const [dragEventId, setDragEventId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Event tasks for detail view
  const [eventTasks, setEventTasks] = useState<Record<string, EventTask[]>>({});
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');

  const loadEventTasks = useCallback(async (eventId: string) => {
    try {
      const data = await api.calendar.tasks.get(eventId) as unknown as EventTask[];
      setEventTasks(prev => ({ ...prev, [eventId]: data }));
    } catch { /* silent */ }
  }, []);

  const toggleEventExpand = (eventId: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
    } else {
      setExpandedEventId(eventId);
      if (!eventTasks[eventId]) loadEventTasks(eventId);
    }
  };

  const toggleEventTask = async (taskId: string, eventId: string, completed: boolean) => {
    try {
      await api.calendar.tasks.update(taskId, { completed: !completed });
      await loadEventTasks(eventId);
    } catch { /* silent */ }
  };

  const addInlineTask = async (eventId: string) => {
    if (!inlineTaskTitle.trim()) return;
    try {
      await api.calendar.tasks.create(eventId, inlineTaskTitle.trim());
      setInlineTaskTitle('');
      await loadEventTasks(eventId);
    } catch { /* silent */ }
  };

  const deleteEventTask = async (taskId: string, eventId: string) => {
    try {
      await api.calendar.tasks.delete(taskId);
      await loadEventTasks(eventId);
    } catch { /* silent */ }
  };

  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const loadEvents = useCallback(async () => {
    try {
      const data = await api.calendar.get(monthStr) as unknown as CalendarEvent[];
      setEvents(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => {
    if (user) loadEvents();
  }, [user, loadEvents]);

  // Fetch Islamic holidays from Aladhan API via backend
  useEffect(() => {
    let cancelled = false;
    api.calendar.islamicHolidays(currentYear).then(data => {
      if (cancelled) return;
      setIslamicHolidays(data.map(d => ({
        id: `islamic-${d.date}-${d.title.replace(/\s/g, '')}`,
        title: d.title,
        date: d.date,
        category: 'religious',
        color: '#FBBF24',
        description: '',
        all_day: true,
        isHoliday: true,
      })));
    }).catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [currentYear]);

  // Fetch friend birthdays
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.calendar.birthdays(currentYear).then(data => {
      if (cancelled) return;
      setFriendBirthdays(data.map(d => ({
        id: `bday-${d.friendId}`,
        title: `${d.title}${d.relationship ? ` (${d.relationship})` : ''}`,
        date: d.date,
        category: 'personal',
        color: '#F97316',
        description: '',
        all_day: true,
        isHoliday: true,
      })));
    }).catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [user, currentYear]);

  // Fetch study exams
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.study.exams.get().then(data => {
      if (cancelled) return;
      const typeLabels: Record<string, { label: string; icon: string; color: string }> = {
        tp_test: { label: 'TP Test', icon: '🧪', color: '#06B6D4' },
        td_test: { label: 'TD Test', icon: '📝', color: '#FBBF24' },
        exam: { label: 'EMD', icon: '📋', color: '#F87171' },
        project: { label: 'Project', icon: '💻', color: '#8B5CF6' },
        presentation: { label: 'Presentation', icon: '🎤', color: '#34D399' },
      };
      setStudyExams(data.map((e: Record<string, unknown>) => {
        const examType = (e.exam_type || 'exam') as string;
        const cfg = typeLabels[examType] || typeLabels.exam;
        return {
          id: `exam-${e.id}`,
          title: `${cfg.icon} ${e.title} (${e.course_name})`,
          date: e.date as string,
          start_time: (e.start_time || null) as string | null,
          end_time: null,
          category: 'university',
          color: cfg.color,
          description: (e.notes || '') as string,
          all_day: !e.start_time,
          isHoliday: true, // prevents editing/deleting via calendar UI
        };
      }));
    }).catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [user]);

  // Fetch meetings for calendar
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.meetings.get().then(data => {
      if (cancelled) return;
      const STATUS_COLORS: Record<string, string> = { upcoming: '#3B82F6', completed: '#10B981', cancelled: '#6B7280' };
      setCalendarMeetings((data as unknown as { id: string; title: string; date: string; start_time?: string; end_time?: string; location?: string; status: string }[]).map(m => ({
        id: `meeting-${m.id}`,
        title: `🤝 ${m.title}`,
        date: m.date,
        start_time: m.start_time || null,
        end_time: m.end_time || null,
        category: 'personal',
        color: STATUS_COLORS[m.status] || '#3B82F6',
        description: m.location ? `📍 ${(LOCATION_OPTIONS[m.location] || { label: m.location }).label}` : '',
        all_day: !m.start_time,
        isHoliday: true, // prevents editing via calendar UI (edit in meetings page)
      })));
    }).catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [user]);

  const holidays = useMemo(() => getBuiltInHolidays(currentYear), [currentYear]);

  // Merge user events + static holidays + Islamic holidays + birthdays + exams
  const allEvents = useMemo(() => {
    const merged = [...events];
    holidays.forEach(h => {
      if (h.date.startsWith(monthStr)) {
        merged.push(h);
      }
    });
    islamicHolidays.forEach(h => {
      if (h.date.startsWith(monthStr)) {
        merged.push(h);
      }
    });
    friendBirthdays.forEach(h => {
      if (h.date.startsWith(monthStr)) {
        merged.push(h);
      }
    });
    studyExams.forEach(e => {
      if (e.date.startsWith(monthStr)) {
        merged.push(e);
      }
    });
    calendarMeetings.forEach(m => {
      if (m.date.startsWith(monthStr)) {
        merged.push(m);
      }
    });
    return merged.filter(e => activeFilters.has(e.category));
  }, [events, holidays, islamicHolidays, friendBirthdays, studyExams, calendarMeetings, monthStr, activeFilters]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    allEvents.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [allEvents]);

  // Navigation
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };
  const goToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); };

  // CRUD
  const { triggerDelete } = useUndoDelete({
    restoreFn: (id: string) => api.calendar.restore(id),
    onRestore: loadEvents,
    label: 'Event',
  });

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;

    // Compute reminder_at from the selected option
    let reminder_at: string | null = null;
    if (form.reminder !== 'none') {
      const baseTime = !form.all_day && form.start_time
        ? `${form.date}T${form.start_time}:00`
        : `${form.date}T09:00:00`;
      const baseDate = new Date(baseTime);
      const minutesBefore = parseInt(form.reminder, 10);
      if (!isNaN(minutesBefore)) {
        baseDate.setMinutes(baseDate.getMinutes() - minutesBefore);
        reminder_at = baseDate.toISOString();
      }
    }

    const payload = {
      title: form.title.trim(),
      date: form.date,
      start_time: form.all_day ? null : (form.start_time || null),
      end_time: form.all_day ? null : (form.end_time || null),
      category: form.category,
      color: EVENT_CATEGORIES[form.category]?.color || '#A855F7',
      description: form.description.trim(),
      all_day: form.all_day,
      location: form.location || null,
      reminder_at,
    };
    try {
      const created = await api.calendar.create(payload) as unknown as CalendarEvent;
      // Create linked tasks
      for (const taskTitle of formTasks) {
        if (taskTitle.trim()) {
          await api.calendar.tasks.create(created.id, taskTitle.trim());
        }
      }
      await loadEvents();
      setShowAdd(false);
      resetForm();
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    triggerDelete(id, async () => {
      await api.calendar.delete(id);
      setEvents(ev => ev.filter(e => e.id !== id));
    });
  };

  // Drag & drop to reschedule events
  const handleDrop = async (dateStr: string) => {
    if (!dragEventId) return;
    const ev = events.find(e => e.id === dragEventId);
    if (!ev || ev.date === dateStr) {
      setDragEventId(null);
      setDropTarget(null);
      return;
    }
    try {
      await api.calendar.update(dragEventId, { date: dateStr });
      await loadEvents();
    } catch { /* silent */ }
    setDragEventId(null);
    setDropTarget(null);
  };

  const resetForm = () => {
    setForm({ title: '', date: '', start_time: '', end_time: '', category: 'personal', color: '', description: '', all_day: true, reminder: 'none', location: '' });
    setFormTasks([]);
    setNewTaskTitle('');
  };

  const openAddForDate = (dateStr: string) => {
    resetForm();
    setForm(f => ({ ...f, date: dateStr }));
    setShowAdd(true);
  };

  const toggleFilter = (cat: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // Calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Selected date events
  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" description="Events, deadlines & holidays" icon={<CalendarDays className="w-5 h-5" />}>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Sparkles className="w-3.5 h-3.5" /> Filter
          </Button>
          <Button onClick={() => { resetForm(); setForm(f => ({ ...f, date: todayStr })); setShowAdd(true); }}>
            <Plus className="w-4 h-4" /> Event
          </Button>
        </div>
      </PageHeader>

      {/* Filter chips */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card variant="glass" className="p-4">
              <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase mb-2">Show categories</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border',
                      activeFilters.has(key)
                        ? 'border-transparent text-white shadow-lg'
                        : 'border-[var(--border)] text-[var(--foreground-muted)] bg-transparent opacity-50'
                    )}
                    style={activeFilters.has(key) ? { backgroundColor: cat.color, boxShadow: `0 4px 14px ${cat.color}30` } : {}}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Month navigation */}
      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-[var(--foreground)]">{MONTH_NAMES[currentMonth]} {currentYear}</h2>
            <button onClick={goToday} className="text-[10px] text-[var(--primary)] hover:underline mt-0.5">Today</button>
          </div>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </Card>

      {/* Calendar grid */}
      <Card
        variant="elevated"
        className="p-3 sm:p-5 overflow-hidden relative"
        style={{ background: 'var(--card-bg)', backdropFilter: 'blur(24px)' }}
      >
        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[var(--primary)]/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-[var(--violet)]/5 blur-3xl pointer-events-none" />

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2 relative z-[1]">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] sm:text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1 relative z-[1]">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square sm:aspect-auto sm:min-h-[80px]" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayEvents = eventsByDate[dateStr] || [];
            const isFriday = new Date(currentYear, currentMonth, day).getDay() === 5;

            return (
              <motion.div
                key={day}
                whileHover={{ scale: 1.04, zIndex: 10 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                onDoubleClick={() => openAddForDate(dateStr)}
                onDragOver={e => { e.preventDefault(); setDropTarget(dateStr); }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={e => { e.preventDefault(); handleDrop(dateStr); }}
                className={cn(
                  'aspect-square sm:aspect-auto sm:min-h-[80px] rounded-xl p-1 sm:p-1.5 cursor-pointer transition-all duration-200 relative group',
                  'border backdrop-blur-sm',
                  isToday
                    ? 'bg-gradient-to-br from-[var(--primary)]/15 to-[var(--violet)]/10 border-[var(--primary)]/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                    : isSelected
                    ? 'bg-[var(--primary)]/10 border-[var(--primary)]/25'
                    : dropTarget === dateStr
                    ? 'bg-[var(--primary)]/20 border-[var(--primary)]/40 ring-2 ring-[var(--primary)]/30'
                    : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.1]',
                  isFriday && !isToday && !isSelected && 'bg-[var(--warning)]/[0.03] border-[var(--warning)]/[0.08]'
                )}
                style={isToday ? { boxShadow: '0 4px 20px rgba(168,85,247,0.1), inset 0 1px 0 rgba(255,255,255,0.05)' } : {}}
              >
                {/* Day number */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs sm:text-sm font-bold',
                      isToday ? 'text-[var(--primary)]' : 'text-[var(--foreground)]',
                      isFriday && !isToday && 'text-[var(--warning)]'
                    )}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="hidden sm:block text-[8px] px-1.5 py-px rounded-full bg-[var(--primary)] text-white font-bold">
                      TODAY
                    </span>
                  )}
                </div>

                {/* Event dots (mobile) */}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-1 sm:hidden justify-center flex-wrap">
                    {dayEvents.slice(0, 4).map((e, idx) => (
                      <div
                        key={idx}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: e.color || EVENT_CATEGORIES[e.category]?.color || '#A855F7' }}
                      />
                    ))}
                    {dayEvents.length > 4 && (
                      <span className="text-[7px] text-[var(--foreground-muted)]">+{dayEvents.length - 4}</span>
                    )}
                  </div>
                )}

                {/* Event pills (desktop) */}
                <div className="hidden sm:flex flex-col gap-0.5 mt-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((e, idx) => {
                    const col = e.color || EVENT_CATEGORIES[e.category]?.color || '#A855F7';
                    return (
                      <div
                        key={idx}
                        className="text-[9px] leading-tight font-medium truncate rounded-md px-1 py-px"
                        style={{
                          backgroundColor: `${col}18`,
                          color: col,
                          borderLeft: `2px solid ${col}`,
                        }}
                      >
                        {e.isHoliday && '✦ '}{e.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-[var(--foreground-muted)] pl-1">+{dayEvents.length - 3} more</span>
                  )}
                </div>

                {/* Glow on hover */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }} />
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Selected date detail panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <Card variant="glass" className="p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--violet)] to-[var(--accent)] opacity-60" />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    {new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <p className="text-xs text-[var(--foreground-muted)]">{selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => openAddForDate(selectedDate)}>
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {selectedEvents.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)] text-center py-6">No events — double-click a date or press Add</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((e, i) => {
                    const cat = EVENT_CATEGORIES[e.category];
                    const col = e.color || cat?.color || '#A855F7';
                    return (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="group relative"
                        draggable={!e.isHoliday}
                        onDragStart={() => !e.isHoliday && setDragEventId(e.id)}
                        onDragEnd={() => setDragEventId(null)}
                      >
                        <div
                          className="p-3 rounded-xl border backdrop-blur-sm transition-all hover:scale-[1.01] cursor-pointer"
                          style={{
                            backgroundColor: `${col}08`,
                            borderColor: `${col}20`,
                            boxShadow: `0 2px 12px ${col}08`,
                          }}
                          onClick={() => !e.isHoliday && toggleEventExpand(e.id)}
                        >
                          <div className="flex items-start gap-3">
                            {/* Color dot */}
                            {!e.isHoliday && (
                              <GripVertical className="w-3 h-3 text-[var(--foreground-muted)] opacity-0 group-hover:opacity-50 cursor-grab flex-shrink-0" />
                            )}
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                              style={{ backgroundColor: col, boxShadow: `0 0 8px ${col}40` }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-[var(--foreground)]">
                                  {e.isHoliday && '✦ '}{e.title}
                                </p>
                                <Badge variant="outline" size="sm" style={{ borderColor: `${col}40`, color: col }}>
                                  {cat?.icon} {cat?.label}
                                </Badge>
                              </div>
                              {!e.all_day && e.start_time && (
                                <p className="text-xs text-[var(--foreground-muted)] mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {e.start_time}{e.end_time ? ` — ${e.end_time}` : ''}
                                </p>
                              )}
                              {e.location && (
                                <p className="text-xs text-[var(--foreground-muted)] mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {LOCATION_OPTIONS[e.location]?.icon || '📍'} {LOCATION_OPTIONS[e.location]?.label || e.location}
                                </p>
                              )}
                              {e.description && (
                                <p className="text-xs text-[var(--foreground-muted)] mt-1 line-clamp-2">{e.description}</p>
                              )}
                              {e.reminder_at && (
                                <p className="text-xs text-[var(--foreground-muted)] mt-0.5 flex items-center gap-1">
                                  <Bell className="w-3 h-3" />
                                  Reminder: {new Date(e.reminder_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  {e.reminder_sent && ' ✓'}
                                </p>
                              )}
                            </div>
                            {!e.isHoliday && (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={(ev) => { ev.stopPropagation(); toggleEventExpand(e.id); }}
                                  className="opacity-60 hover:opacity-100 transition-opacity">
                                  <ListTodo className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Expandable tasks section */}
                          {expandedEventId === e.id && !e.isHoliday && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="mt-3 pt-3 border-t border-[var(--border)]/30"
                              onClick={ev => ev.stopPropagation()}
                            >
                              <p className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase mb-2">Tasks to do</p>
                              <div className="space-y-1.5">
                                {(eventTasks[e.id] || []).map(task => (
                                  <div key={task.id} className="flex items-center gap-2 group/task">
                                    <button onClick={() => toggleEventTask(task.id, e.id, task.completed)}>
                                      {task.completed
                                        ? <CheckSquare className="w-3.5 h-3.5 text-[var(--success)]" />
                                        : <Square className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />}
                                    </button>
                                    <span className={cn('text-xs flex-1', task.completed && 'line-through text-[var(--foreground-muted)]')}>
                                      {task.title}
                                    </span>
                                    <button
                                      onClick={() => deleteEventTask(task.id, e.id)}
                                      className="opacity-0 group-hover/task:opacity-100 text-[var(--danger)] transition-opacity"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                {(eventTasks[e.id] || []).length === 0 && (
                                  <p className="text-[10px] text-[var(--foreground-muted)]">No tasks yet</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <Input
                                    placeholder="Add task..."
                                    value={inlineTaskTitle}
                                    onChange={ev => setInlineTaskTitle(ev.target.value)}
                                    onKeyDown={ev => {
                                      if (ev.key === 'Enter') { ev.preventDefault(); addInlineTask(e.id); }
                                    }}
                                    className="flex-1 !text-xs !py-1"
                                  />
                                  <Button variant="secondary" size="sm" onClick={() => addInlineTask(e.id)} disabled={!inlineTaskTitle.trim()}>
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming events sidebar */}
      <Card variant="elevated" className="p-5">
        <h3 className="text-sm font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--primary)]" /> Upcoming This Month
        </h3>
        {(() => {
          const upcoming = allEvents
            .filter(e => e.date >= todayStr)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 8);
          if (upcoming.length === 0) return <p className="text-sm text-[var(--foreground-muted)]">No upcoming events</p>;
          return (
            <div className="space-y-2">
              {upcoming.map((e, i) => {
                const col = e.color || EVENT_CATEGORIES[e.category]?.color || '#A855F7';
                const dateObj = new Date(e.date + 'T00:00');
                const dayNum = dateObj.getDate();
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                return (
                  <motion.div
                    key={e.id + i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 cursor-pointer hover:bg-white/[0.03] rounded-lg p-1.5 -mx-1.5 transition-colors"
                    onClick={() => setSelectedDate(e.date)}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white font-bold flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${col}, ${col}BB)`,
                        boxShadow: `0 4px 12px ${col}25`,
                      }}
                    >
                      <span className="text-[10px] uppercase leading-none opacity-80">{dayName}</span>
                      <span className="text-sm leading-none">{dayNum}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">{e.isHoliday && '✦ '}{e.title}</p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">
                        {EVENT_CATEGORIES[e.category]?.label}
                        {!e.all_day && e.start_time && ` • ${e.start_time}`}
                      </p>
                    </div>
                    {e.date === todayStr && (
                      <Badge variant="primary" size="sm">Today</Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>
          );
        })()}
      </Card>

      {/* Add Event Modal */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); resetForm(); }} title="New Event" size="md">
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input placeholder="Event name..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {Object.entries(EVENT_CATEGORIES).filter(([k]) => !['national', 'international', 'religious'].includes(k)).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* All day toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setForm(f => ({ ...f, all_day: !f.all_day }))}
              className={cn(
                'w-10 h-6 rounded-full transition-all duration-200 relative',
                form.all_day ? 'bg-[var(--primary)]' : 'bg-[var(--background-surface)] border border-[var(--border)]'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-200 shadow-sm',
                form.all_day ? 'left-5' : 'left-1'
              )} />
            </button>
            <span className="text-sm text-[var(--foreground)]">All day event</span>
          </div>

          {!form.all_day && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
          )}

          <div>
            <Label>Description</Label>
            <TextArea placeholder="Optional details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          </div>

          {/* Location */}
          <div>
            <Label><MapPin className="w-3 h-3 inline mr-1" />Location</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(LOCATION_OPTIONS).map(([key, loc]) => (
                <button
                  key={key}
                  onClick={() => setForm(f => ({ ...f, location: f.location === key ? '' : key }))}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    form.location === key
                      ? 'bg-[var(--primary)]/15 border-[var(--primary)]/30 text-[var(--primary)]'
                      : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--primary)]/20'
                  )}
                >
                  {loc.icon} {loc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div>
            <Label><Bell className="w-3 h-3 inline mr-1" />Reminder</Label>
            <Select value={form.reminder} onChange={e => setForm(f => ({ ...f, reminder: e.target.value }))}>
              <option value="none">No reminder</option>
              <option value="0">At time of event</option>
              <option value="5">5 minutes before</option>
              <option value="10">10 minutes before</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
              <option value="120">2 hours before</option>
              <option value="1440">1 day before</option>
            </Select>
            {form.reminder !== 'none' && (
              <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                {form.all_day && !form.start_time
                  ? 'Reminder based on 9:00 AM (set a start time for more precision)'
                  : 'You\u2019ll get a Telegram notification'}
              </p>
            )}
          </div>

          {/* Tasks to do before this event */}
          <div>
            <Label><ListTodo className="w-3 h-3 inline mr-1" />Tasks before this event</Label>
            <div className="space-y-1.5 mt-1">
              {formTasks.map((task, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--foreground)] flex-1 bg-[var(--background-surface)] rounded-lg px-3 py-1.5">{task}</span>
                  <button
                    onClick={() => setFormTasks(t => t.filter((_, i) => i !== idx))}
                    className="text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded p-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add a task..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTaskTitle.trim()) {
                      e.preventDefault();
                      setFormTasks(t => [...t, newTaskTitle.trim()]);
                      setNewTaskTitle('');
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (newTaskTitle.trim()) {
                      setFormTasks(t => [...t, newTaskTitle.trim()]);
                      setNewTaskTitle('');
                    }
                  }}
                  disabled={!newTaskTitle.trim()}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Category color preview */}
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: EVENT_CATEGORIES[form.category]?.color || '#A855F7', boxShadow: `0 0 8px ${EVENT_CATEGORIES[form.category]?.color || '#A855F7'}40` }}
            />
            <span className="text-xs text-[var(--foreground-muted)]">
              This event will appear as <strong>{EVENT_CATEGORIES[form.category]?.label}</strong>
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || !form.date}>Create Event</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
