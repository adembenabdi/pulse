'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { usePrayerTimes, ALGERIAN_CITIES } from '@/hooks/usePrayerTimes';
import { Card, Badge, Button, PageHeader, Select, ProgressRing, Spinner } from '@/components/ui/primitives';
import { Moon, Sun, Sunrise, Sunset, Clock, Check, MapPin, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { PrayerLog, PrayerTimes } from '@/types';
import { format } from 'date-fns';

const PRAYER_ICONS: Record<string, React.ReactNode> = {
  Fajr: <Sunrise className="w-5 h-5" />,
  Sunrise: <Sun className="w-5 h-5" />,
  Dhuhr: <Sun className="w-5 h-5" />,
  Asr: <Sunset className="w-5 h-5" />,
  Maghrib: <Sunset className="w-5 h-5" />,
  Isha: <Moon className="w-5 h-5" />,
};

const PRAYER_COLORS: Record<string, string> = {
  Fajr: '#A855F7',
  Sunrise: '#FBBF24',
  Dhuhr: '#FB923C',
  Asr: '#F97316',
  Maghrib: '#F87171',
  Isha: '#8B5CF6',
};

export default function PrayerPage() {
  const { user } = useAuth();
  const [city, setCity] = useState(user?.city || 'Algiers');
  const { times, loading, error, nextPrayer, refetch } = usePrayerTimes(city);
  const today = format(new Date(), 'yyyy-MM-dd');

  const [logs, setLogs] = useState<PrayerLog[]>([]);

  useEffect(() => {
    if (!user) return;
    api.prayer.get(today).then((data) => {
      const mapped = (data as { prayer: string; completed: boolean; on_time?: boolean; time?: string; id?: string; date?: string }[]).map(d => ({
        id: d.id || '',
        date: d.date || today,
        prayer: d.prayer as keyof PrayerTimes,
        completed: d.completed,
        onTime: d.on_time ?? false,
        time: d.time || '',
      }));
      setLogs(mapped);
    }).catch(() => {});
  }, [user, today]);

  const togglePrayer = (prayerName: keyof PrayerTimes) => {
    if (!user) return;
    const existing = logs.find(l => l.prayer === prayerName);
    const nowCompleted = !existing;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    // Optimistic UI update
    let updated: PrayerLog[];
    if (existing) {
      updated = logs.filter(l => l.prayer !== prayerName);
    } else {
      updated = [...logs, {
        id: '',
        date: today,
        prayer: prayerName,
        completed: true,
        onTime: true,
        time: timeStr,
      }];
    }
    setLogs(updated);

    // Sync to backend
    api.prayer.upsert({
      date: today,
      prayer: prayerName as string,
      completed: nowCompleted,
      on_time: nowCompleted,
      time: nowCompleted ? timeStr : '',
    }).catch(() => {});
  };

  const completedCount = logs.filter(l => l.completed).length;
  const totalPrayers = 5; // exclude Sunrise
  const progress = Math.round((completedCount / totalPrayers) * 100);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prayer Times"
        description="Track your daily salah"
        icon={<Moon className="w-5 h-5" />}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--foreground-muted)]" />
            <Select value={city} onChange={e => setCity(e.target.value)} className="w-40">
              {ALGERIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <Button variant="ghost" size="icon" onClick={refetch} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size={32} />
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <p className="text-[var(--danger)]">{error}</p>
          <Button variant="secondary" className="mt-3" onClick={refetch}>Retry</Button>
        </Card>
      ) : times ? (
        <>
          {/* Next Prayer Banner */}
          {nextPrayer && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <Card variant="elevated" glow className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--violet)] flex items-center justify-center prayer-pulse">
                      {PRAYER_ICONS[nextPrayer.name]}
                    </div>
                    <div>
                      <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">Next Prayer</p>
                      <p className="text-xl font-bold text-[var(--foreground)]">{nextPrayer.name}</p>
                      <p className="text-sm text-[var(--primary)]">{nextPrayer.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="primary" className="text-sm px-3 py-1">{nextPrayer.remaining}</Badge>
                    <div className="mt-2">
                      <ProgressRing progress={progress} size={56} strokeWidth={3}>
                        <span className="text-xs font-bold text-[var(--foreground)]">{completedCount}/5</span>
                      </ProgressRing>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Prayer Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as (keyof PrayerTimes)[]).map((name, i) => {
              const isDone = logs.some(l => l.prayer === name && l.completed);
              const color = PRAYER_COLORS[name];
              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    variant="interactive"
                    depth
                    className={`p-4 ${isDone ? 'opacity-70' : ''}`}
                    onClick={() => togglePrayer(name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: `${color}15`, color }}
                        >
                          {PRAYER_ICONS[name]}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">{name}</p>
                          <p className="text-sm text-[var(--foreground-muted)]">{times[name]}</p>
                        </div>
                      </div>
                      <motion.div
                        animate={isDone ? { scale: [1, 1.2, 1] } : {}}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          isDone
                            ? 'bg-[var(--success)]/20 text-[var(--success)]'
                            : 'bg-[var(--background-surface)] text-[var(--foreground-muted)]'
                        }`}
                      >
                        {isDone ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </motion.div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}

            {/* Sunrise info card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card variant="glass" className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--warning)]/15 text-[var(--warning)]">
                    <Sunrise className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">Sunrise</p>
                    <p className="text-sm text-[var(--foreground-muted)]">{times.Sunrise}</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">Info</Badge>
                </div>
              </Card>
            </motion.div>
          </div>
        </>
      ) : null}
    </div>
  );
}
