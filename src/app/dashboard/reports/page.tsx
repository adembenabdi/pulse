'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, StatCard, EmptyState, Select, Label } from '@/components/ui/primitives';
import { BarChart3, FileText, Calendar, TrendingUp, RefreshCw, Brain } from 'lucide-react';
import { api } from '@/lib/api';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

interface Report {
  id: string;
  type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  data: Record<string, unknown>;
  created_at: string;
}

interface MoodCorrelation {
  factor: string;
  avgMoodWith: number;
  avgMoodWithout: number;
  daysWith: number;
  impact: number;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);
  const [correlations, setCorrelations] = useState<MoodCorrelation[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.reports.get({ limit: '20' });
      setReports(data as unknown as Report[]);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Mood correlations — cross-reference journal mood with sport, prayer, sleep
  useEffect(() => {
    if (!user) return;
    const computeCorrelations = async () => {
      try {
        const from = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        const to = format(new Date(), 'yyyy-MM-dd');
        const [journals, sports, prayers, sleepLogs] = await Promise.all([
          api.journal.get({ from, to }),
          api.sport.get(),
          api.prayer.get(),
          api.sleep.get({ from, to }),
        ]);

        // Build day→mood map from journal entries
        const moodMap: Record<string, number> = {};
        const MOOD_SCORES: Record<string, number> = { great: 5, good: 4, okay: 3, bad: 2, terrible: 1 };
        (journals as { date: string; mood?: string }[]).forEach(j => {
          if (j.mood && MOOD_SCORES[j.mood]) moodMap[j.date] = MOOD_SCORES[j.mood];
        });

        const moodDates = Object.keys(moodMap);
        if (moodDates.length < 3) { setCorrelations([]); return; }

        // Sport days
        const sportDays = new Set((sports as { date: string }[]).map(s => s.date));
        // Prayer complete days (5/5)
        const prayerByDate: Record<string, number> = {};
        (prayers as { date: string; completed?: boolean }[]).forEach(p => {
          if (p.completed) prayerByDate[p.date] = (prayerByDate[p.date] || 0) + 1;
        });
        const prayerDays = new Set(Object.entries(prayerByDate).filter(([, v]) => v >= 5).map(([d]) => d));
        // Good sleep days (>= 7h)
        const sleepDays = new Set(
          (sleepLogs as { date: string; duration_minutes?: number; is_nap: boolean }[])
            .filter(s => !s.is_nap && (s.duration_minutes || 0) >= 420)
            .map(s => s.date)
        );

        const factors = [
          { factor: 'Exercise', dataset: sportDays },
          { factor: 'All Prayers', dataset: prayerDays },
          { factor: 'Good Sleep (7h+)', dataset: sleepDays },
        ];

        const results: MoodCorrelation[] = [];
        for (const { factor, dataset } of factors) {
          const withMoods = moodDates.filter(d => dataset.has(d)).map(d => moodMap[d]);
          const withoutMoods = moodDates.filter(d => !dataset.has(d)).map(d => moodMap[d]);
          const avgWith = withMoods.length > 0 ? withMoods.reduce((a, b) => a + b, 0) / withMoods.length : 0;
          const avgWithout = withoutMoods.length > 0 ? withoutMoods.reduce((a, b) => a + b, 0) / withoutMoods.length : 0;
          results.push({
            factor,
            avgMoodWith: Math.round(avgWith * 10) / 10,
            avgMoodWithout: Math.round(avgWithout * 10) / 10,
            daysWith: withMoods.length,
            impact: Math.round((avgWith - avgWithout) * 10) / 10,
          });
        }
        setCorrelations(results);
      } catch { /* ignore */ }
    };
    computeCorrelations();
  }, [user]);

  const generateReport = async (type: 'weekly' | 'monthly') => {
    setGenerating(true);
    try {
      const now = new Date();
      let start: string, end: string;
      if (type === 'weekly') {
        start = format(startOfWeek(now, { weekStartsOn: 6 }), 'yyyy-MM-dd');
        end = format(endOfWeek(now, { weekStartsOn: 6 }), 'yyyy-MM-dd');
      } else {
        start = format(startOfMonth(now), 'yyyy-MM-dd');
        end = format(endOfMonth(now), 'yyyy-MM-dd');
      }
      await api.reports.generate(type, start, end);
      toast.success(`${type} report generated`);
      load();
    } catch { toast.error('Failed to generate'); }
    setGenerating(false);
  };

  if (!user) return null;

  const renderData = (data: Record<string, unknown>) => {
    const sections = Object.entries(data);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(([key, value]) => (
          <Card key={key} variant="default" className="p-4">
            <h4 className="text-sm font-bold text-[var(--foreground)] capitalize mb-2">{key.replace(/_/g, ' ')}</h4>
            {typeof value === 'object' && value !== null ? (
              <div className="space-y-1">
                {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-[var(--foreground-muted)] capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="text-[var(--foreground)] font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-lg font-bold text-[var(--foreground)]">{String(value)}</p>
            )}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Weekly & monthly summaries" icon={<BarChart3 className="w-5 h-5" />}>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => generateReport('weekly')} disabled={generating}>
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} /> Weekly
          </Button>
          <Button onClick={() => generateReport('monthly')} disabled={generating}>
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} /> Monthly
          </Button>
        </div>
      </PageHeader>

      {/* Mood Correlations */}
      {correlations.length > 0 && (
        <Card variant="elevated" className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-[var(--violet)]" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">Mood Correlations (30 days)</h3>
          </div>
          <div className="space-y-3">
            {correlations.map(c => (
              <div key={c.factor} className="flex items-center gap-4">
                <div className="w-32 text-xs font-medium text-[var(--foreground)]">{c.factor}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-[var(--background-surface)] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(c.avgMoodWith / 5) * 100}%`,
                          backgroundColor: c.impact > 0 ? 'var(--success)' : 'var(--warning)',
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[var(--foreground)] w-8">{c.avgMoodWith}</span>
                  </div>
                  <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                    {c.daysWith} days • {c.impact > 0 ? '+' : ''}{c.impact} mood impact
                  </p>
                </div>
                <Badge variant={c.impact > 0 ? 'success' : c.impact < 0 ? 'danger' : 'outline'} size="sm">
                  {c.impact > 0 ? 'Positive' : c.impact < 0 ? 'Negative' : 'Neutral'}
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--foreground-muted)] mt-3">
            Compares your average mood on days with vs. without each activity. Log journal entries with mood to improve accuracy.
          </p>
        </Card>
      )}

      {selectedReport ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[var(--foreground)] capitalize">{selectedReport.type} Report</h3>
              <p className="text-xs text-[var(--foreground-muted)]">{selectedReport.period_start} — {selectedReport.period_end}</p>
            </div>
            <Button variant="ghost" onClick={() => setSelectedReport(null)}>Back to list</Button>
          </div>
          {renderData(selectedReport.data)}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-8 h-8" />}
          title="No reports yet"
          description="Generate your first weekly or monthly report"
          action={<Button onClick={() => generateReport('weekly')}>Generate Weekly Report</Button>}
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report, i) => (
            <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card
                variant="elevated"
                className="p-4 cursor-pointer hover:scale-[1.01] transition-transform"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${report.type === 'weekly' ? 'bg-[var(--primary)]/15' : 'bg-[var(--cyan)]/15'}`}>
                    {report.type === 'weekly' ? <Calendar className="w-5 h-5 text-[var(--primary)]" /> : <TrendingUp className="w-5 h-5 text-[var(--cyan)]" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--foreground)] capitalize">{report.type} Report</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{report.period_start} — {report.period_end}</p>
                  </div>
                  <Badge variant={report.type === 'weekly' ? 'primary' : 'outline'}>{report.type}</Badge>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
