'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button, PageHeader, Input, Label, Select } from '@/components/ui/primitives';
import { Settings, User, Palette, LogOut, Trash2, Moon, Sun, Save } from 'lucide-react';
import { ALGERIAN_CITIES } from '@/hooks/usePrayerTimes';

export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState(user?.city || 'algiers');
  const [university, setUniversity] = useState(user?.university || '');
  const [timetableUrl, setTimetableUrl] = useState(user?.timetableUrl || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!user) return;
    updateProfile({ name: name.trim(), city, university: university.trim(), timetableUrl: timetableUrl.trim() });
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

      {/* Appearance */}
      <Card variant="elevated" className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="text-sm font-bold text-[var(--foreground)]">Appearance</h3>
        </div>
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
            <p className="text-xs text-[var(--foreground-muted)]">Your data stays saved locally</p>
          </div>
          <Button variant="danger" onClick={logout}><LogOut className="w-4 h-4" /> Logout</Button>
        </div>
      </Card>
    </div>
  );
}
