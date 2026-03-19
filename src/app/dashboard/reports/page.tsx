'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, StatCard, EmptyState, Select, Label } from '@/components/ui/primitives';
import { BarChart3, FileText, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
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

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.reports.get({ limit: '20' });
      setReports(data as unknown as Report[]);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { load(); }, [load]);

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
