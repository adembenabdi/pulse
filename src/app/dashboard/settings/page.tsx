'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button, PageHeader, Input, Label, Select } from '@/components/ui/primitives';
import { Settings, User, Palette, LogOut, Trash2, Moon, Sun, Save, Send, Bell, Layout, Clock, GripVertical, Eye, EyeOff } from 'lucide-react';
import { ALGERIAN_CITIES } from '@/hooks/usePrayerTimes';
import type { DashboardWidget } from '@/types';

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'prayer', type: 'prayer', visible: true, order: 0 },
  { id: 'tasks', type: 'tasks', visible: true, order: 1 },
  { id: 'habits', type: 'habits', visible: true, order: 2 },
  { id: 'finance', type: 'finance', visible: true, order: 3 },
  { id: 'study', type: 'study', visible: true, order: 4 },
  { id: 'calendar', type: 'calendar', visible: true, order: 5 },
  { id: 'sport', type: 'sport', visible: true, order: 6 },
  { id: 'quran', type: 'quran', visible: true, order: 7 },
  { id: 'goals', type: 'goals', visible: true, order: 8 },
  { id: 'pomodoro', type: 'pomodoro', visible: true, order: 9 },
];

const WIDGET_LABELS: Record<string, string> = {
  prayer: 'Prayer Times',
  tasks: 'Tasks',
  habits: 'Habits',
  finance: 'Finance',
  study: 'Study / Classes',
  calendar: 'Calendar',
  sport: 'Sport',
  quran: 'Quran',
  goals: 'Goals',
  pomodoro: 'Pomodoro',
};

export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { theme, toggleTheme, schedule, setSchedule } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState(user?.city || 'algiers');
  const [university, setUniversity] = useState(user?.university || '');
  const [timetableUrl, setTimetableUrl] = useState(user?.timetableUrl || '');
  const [saved, setSaved] = useState(false);

  // Telegram
  const [telegramNotifs, setTelegramNotifs] = useState(
    user?.telegramNotifications || { prayer: true, tasks: true, birthdays: true }
  );

  // Theme schedule
  const [themeScheduleEnabled, setThemeScheduleEnabled] = useState(schedule.enabled);
  const [lightFrom, setLightFrom] = useState(schedule.lightFrom);
  const [darkFrom, setDarkFrom] = useState(schedule.darkFrom);

  // Dashboard widgets
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const saved = user?.dashboardWidgets;
    if (saved && saved.length > 0) {
      return saved.map((w, i) => ({ ...w, id: w.id || `w-${w.type}-${i}` }));
    }
    return DEFAULT_WIDGETS;
  });

  const handleSave = async () => {
    if (!user) return;
    await updateProfile({ name: name.trim(), city, university: university.trim(), timetableUrl: timetableUrl.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveTelegram = async () => {
    if (!user) return;
    await updateProfile({ telegramNotifications: telegramNotifs });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveThemeSchedule = () => {
    const s = { enabled: themeScheduleEnabled, lightFrom, darkFrom };
    setSchedule(s);
    if (user) {
      updateProfile({ themeSchedule: s });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleWidgetVisibility = (id: string) => {
    setWidgets(w => w.map(x => x.id === id ? { ...x, visible: !x.visible } : x));
  };

  const moveWidget = (id: string, dir: -1 | 1) => {
    setWidgets(prev => {
      const idx = prev.findIndex(w => w.id === id);
      if (idx < 0 || (idx + dir < 0) || (idx + dir >= prev.length)) return prev;
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next.map((w, i) => ({ ...w, order: i }));
    });
  };

  const handleSaveWidgets = async () => {
    if (!user) return;
    await updateProfile({ dashboardWidgets: widgets });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account" icon={<Settings className="w-5 h-5" />} />

      {/* Profile */}
      <Card variant="elevated" className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="text-sm font-bold text-[var(--foreground)]">Profile</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <Label>City</Label>
            <Select value={city} onChange={e => setCity(e.target.value)}>
              {ALGERIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div>
            <Label>University</Label>
            <Input value={university} onChange={e => setUniversity(e.target.value)} placeholder="Your university" />
          </div>
          <div>
            <Label>Timetable URL</Label>
            <Input value={timetableUrl} onChange={e => setTimetableUrl(e.target.value)} placeholder="Link to your timetable" />
          </div>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </Card>

      {/* Telegram Notifications */}
      <Card variant="elevated" className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Send className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="text-sm font-bold text-[var(--foreground)]">Telegram Notifications</h3>
        </div>
        {user.telegramChatId ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--success)]/10">
              <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
              <p className="text-sm text-[var(--foreground)]">Linked to <strong>@{user.telegramUsername || 'your account'}</strong></p>
            </div>
            <div className="space-y-2">
              {[
                { key: 'prayer', label: 'Prayer time reminders', icon: '🕌' },
                { key: 'tasks', label: 'Task deadline reminders', icon: '📋' },
                { key: 'birthdays', label: 'Birthday reminders', icon: '🎂' },
              ].map(({ key, label, icon }) => (
                <div key={key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-[var(--foreground)]">{icon} {label}</span>
                  <button
                    onClick={() => setTelegramNotifs(n => ({ ...n, [key]: !n[key as keyof typeof n] }))}
                    className={`w-10 h-5 rounded-full transition-colors ${telegramNotifs[key as keyof typeof telegramNotifs] ? 'bg-[var(--primary)]' : 'bg-[var(--background-surface)]'}`}
                  >
                    <motion.div
                      className="w-4 h-4 rounded-full bg-white shadow"
                      animate={{ x: telegramNotifs[key as keyof typeof telegramNotifs] ? 20 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              ))}
            </div>
            <Button size="sm" onClick={handleSaveTelegram}>
              <Save className="w-3.5 h-3.5" /> Save Notification Preferences
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--foreground-muted)]">Connect your Telegram account to receive notifications.</p>
            <div className="bg-[var(--background-surface)] rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-[var(--foreground)] uppercase">How to link:</p>
              <ol className="text-sm text-[var(--foreground-muted)] space-y-1 list-decimal list-inside">
                <li>Open Telegram and search for your Pulse bot</li>
                <li>Send <code className="px-1.5 py-0.5 rounded bg-[var(--background)] text-[var(--primary)] text-xs">/start</code></li>
                <li>Then send <code className="px-1.5 py-0.5 rounded bg-[var(--background)] text-[var(--primary)] text-xs">/link {user.email}</code></li>
                <li>You&apos;ll start receiving notifications!</li>
              </ol>
            </div>
          </div>
        )}
      </Card>

      {/* Appearance + Theme Schedule */}
      <Card variant="elevated" className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="text-sm font-bold text-[var(--foreground)]">Appearance</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--foreground)]">Theme</p>
              <p className="text-xs text-[var(--foreground-muted)]">Switch between dark and light mode</p>
            </div>
            <Button variant="secondary" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--foreground-muted)]" />
                <div>
                  <p className="text-sm text-[var(--foreground)]">Auto Theme Schedule</p>
                  <p className="text-xs text-[var(--foreground-muted)]">Switch theme by time of day</p>
                </div>
              </div>
              <button
                onClick={() => setThemeScheduleEnabled(!themeScheduleEnabled)}
                className={`w-10 h-5 rounded-full transition-colors ${themeScheduleEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--background-surface)]'}`}
              >
                <motion.div
                  className="w-4 h-4 rounded-full bg-white shadow"
                  animate={{ x: themeScheduleEnabled ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            {themeScheduleEnabled && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label><Sun className="w-3 h-3 inline mr-1" /> Light Mode From</Label>
                  <Input type="time" value={lightFrom} onChange={e => setLightFrom(e.target.value)} />
                </div>
                <div>
                  <Label><Moon className="w-3 h-3 inline mr-1" /> Dark Mode From</Label>
                  <Input type="time" value={darkFrom} onChange={e => setDarkFrom(e.target.value)} />
                </div>
              </div>
            )}
            <Button size="sm" className="mt-3" onClick={handleSaveThemeSchedule}>
              <Save className="w-3.5 h-3.5" /> Save Theme Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* Dashboard Widgets */}
      <Card variant="elevated" className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Layout className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="text-sm font-bold text-[var(--foreground)]">Dashboard Widgets</h3>
        </div>
        <p className="text-xs text-[var(--foreground-muted)] mb-3">Toggle visibility and reorder your dashboard widgets</p>
        <div className="space-y-1">
          {widgets.map((w, i) => (
            <div key={w.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--background-surface)] transition-colors">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveWidget(w.id, -1)} disabled={i === 0} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-20">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 15l-6-6-6 6"/></svg>
                </button>
                <button onClick={() => moveWidget(w.id, 1)} disabled={i === widgets.length - 1} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-20">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
                </button>
              </div>
              <span className={`text-sm flex-1 ${w.visible ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)] line-through'}`}>
                {WIDGET_LABELS[w.type] || w.type}
              </span>
              <button onClick={() => toggleWidgetVisibility(w.id)} className="p-1">
                {w.visible ? <Eye className="w-4 h-4 text-[var(--primary)]" /> : <EyeOff className="w-4 h-4 text-[var(--foreground-muted)]" />}
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-3" onClick={handleSaveWidgets}>
          <Save className="w-3.5 h-3.5" /> Save Widget Layout
        </Button>
      </Card>

      {/* Modules */}
      <Card variant="elevated" className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="text-sm font-bold text-[var(--foreground)]">Active Modules</h3>
        </div>
        <div className="space-y-2">
          {Object.entries(user.modules).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-[var(--foreground)] capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              <button
                onClick={() => updateProfile({ modules: { ...user.modules, [key]: !enabled } })}
                className={`w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[var(--primary)]' : 'bg-[var(--background-surface)]'}`}
              >
                <motion.div
                  className="w-4 h-4 rounded-full bg-white shadow"
                  animate={{ x: enabled ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Danger zone */}
      <Card variant="elevated" className="p-5 border border-[var(--danger)]/20">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="w-5 h-5 text-[var(--danger)]" />
          <h3 className="text-sm font-bold text-[var(--danger)]">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--foreground)]">Sign out</p>
            <p className="text-xs text-[var(--foreground-muted)]">Your data stays saved on the server</p>
          </div>
          <Button variant="danger" onClick={logout}><LogOut className="w-4 h-4" /> Logout</Button>
        </div>
      </Card>
    </div>
  );
}
