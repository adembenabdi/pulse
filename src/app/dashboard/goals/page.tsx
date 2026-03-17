'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, TextArea, Label, Modal, StatCard, EmptyState, ProgressRing } from '@/components/ui/primitives';
import { Target, Plus, Check, Trophy, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { getFromStorage, saveToStorage, generateId } from '@/lib/storage';
import type { Goal, Milestone } from '@/types';
import { format } from 'date-fns';

const CATEGORY_COLORS: Record<string, string> = {
  academic: '#06B6D4', career: '#34D399', personal: '#A855F7', health: '#F97316', financial: '#FBBF24', spiritual: '#EC4899',
};

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState({
    title: '', description: '', category: 'personal' as Goal['category'], deadline: '',
  });
  const [newMilestone, setNewMilestone] = useState('');

  useEffect(() => {
    if (!user) return;
    setGoals(getFromStorage<Goal[]>(user.id, 'goals', []));
  }, [user]);

  const save = (updated: Goal[]) => {
    if (!user) return;
    setGoals(updated);
    saveToStorage(user.id, 'goals', updated);
  };

  const addGoal = () => {
    if (!newGoal.title.trim()) return;
    save([...goals, {
      id: generateId(), title: newGoal.title.trim(),
      description: newGoal.description.trim(),
      category: newGoal.category,
      deadline: newGoal.deadline || undefined,
      milestones: [], progress: 0, status: 'active',
      createdAt: new Date().toISOString(),
    }]);
    setShowAdd(false);
    setNewGoal({ title: '', description: '', category: 'personal', deadline: '' });
  };

  const addMilestone = (goalId: string) => {
    if (!newMilestone.trim()) return;
    save(goals.map(g => {
      if (g.id !== goalId) return g;
      const ms = [...g.milestones, { id: generateId(), title: newMilestone.trim(), completed: false }];
      return { ...g, milestones: ms, progress: Math.round((ms.filter(m => m.completed).length / ms.length) * 100) };
    }));
    setNewMilestone('');
  };

  const toggleMilestone = (goalId: string, msId: string) => {
    save(goals.map(g => {
      if (g.id !== goalId) return g;
      const ms = g.milestones.map(m => m.id === msId ? { ...m, completed: !m.completed } : m);
      const progress = ms.length > 0 ? Math.round((ms.filter(m => m.completed).length / ms.length) * 100) : 0;
      return { ...g, milestones: ms, progress, status: progress === 100 ? 'completed' : 'active' };
    }));
  };

  const active = goals.filter(g => g.status === 'active');
  const completed = goals.filter(g => g.status === 'completed');

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Goals" description="Set and track your goals" icon={<Target className="w-5 h-5" />}>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> New Goal</Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={<Target className="w-5 h-5" />} label="Active" value={active.length} color="#A855F7" />
        <StatCard icon={<Trophy className="w-5 h-5" />} label="Completed" value={completed.length} color="#34D399" />
        <StatCard icon={<Target className="w-5 h-5" />} label="Avg Progress"
          value={`${active.length > 0 ? Math.round(active.reduce((s, g) => s + g.progress, 0) / active.length) : 0}%`} color="#06B6D4" />
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={<Target className="w-8 h-8" />} title="No goals" description="Set your first goal" action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> New Goal</Button>} />
      ) : (
        <>
          {active.map((goal, i) => {
            const isOpen = expanded === goal.id;
            const col = CATEGORY_COLORS[goal.category] || '#A855F7';
            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card variant="elevated" className="overflow-hidden">
                  <div className="p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : goal.id)}>
                    <div className="flex items-center gap-3">
                      <ProgressRing size={42} progress={goal.progress} color={col} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[var(--foreground)]">{goal.title}</p>
                          <Badge variant="outline" size="sm" style={{ borderColor: `${col}40`, color: col }}>{goal.category}</Badge>
                        </div>
                        {goal.description && <p className="text-xs text-[var(--foreground-muted)] mt-0.5 line-clamp-1">{goal.description}</p>}
                      </div>
                      {isOpen ? <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)]" />}
                      <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); save(goals.filter(g => g.id !== goal.id)); }}>
                        <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="border-t border-[var(--border)] px-4 py-3">
                      <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase mb-2">Milestones</p>
                      <div className="space-y-1.5">
                        {goal.milestones.map(ms => (
                          <div key={ms.id} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleMilestone(goal.id, ms.id)}>
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${ms.completed ? '' : 'border-[var(--border)]'}`}
                              style={{ backgroundColor: ms.completed ? col : 'transparent', borderColor: ms.completed ? col : undefined }}>
                              {ms.completed && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm ${ms.completed ? 'line-through text-[var(--foreground-muted)]' : 'text-[var(--foreground)]'}`}>{ms.title}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Input placeholder="Add milestone..." value={newMilestone} onChange={e => setNewMilestone(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addMilestone(goal.id)} className="flex-1" />
                        <Button size="sm" onClick={() => addMilestone(goal.id)} disabled={!newMilestone.trim()}>Add</Button>
                      </div>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            );
          })}

          {completed.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">Completed ({completed.length})</p>
              {completed.map(goal => (
                <Card key={goal.id} variant="default" className="p-3 mb-2 opacity-50">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[var(--success)]" />
                    <span className="text-sm text-[var(--foreground)] line-through">{goal.title}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="New Goal">
        <div className="space-y-4">
          <div><Label>Title</Label><Input placeholder="What do you want to achieve?" value={newGoal.title} onChange={e => setNewGoal(m => ({ ...m, title: e.target.value }))} /></div>
          <div><Label>Description</Label><TextArea placeholder="Why is this important?" value={newGoal.description} onChange={e => setNewGoal(m => ({ ...m, description: e.target.value }))} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <select className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--background-surface)] border border-[var(--border)] text-[var(--foreground)]"
                value={newGoal.category} onChange={e => setNewGoal(m => ({ ...m, category: e.target.value as Goal['category'] }))}>
                {Object.entries(CATEGORY_COLORS).map(([k]) => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
              </select>
            </div>
            <div><Label>Deadline</Label><Input type="date" value={newGoal.deadline} onChange={e => setNewGoal(m => ({ ...m, deadline: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addGoal} disabled={!newGoal.title.trim()}>Create Goal</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
