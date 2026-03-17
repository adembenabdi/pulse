'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, TextArea, Modal, Label, Select, Tabs, EmptyState } from '@/components/ui/primitives';
import { Code, Briefcase, Rocket, Plus, Check, Trash2, ArrowRight, FolderKanban, Circle, CheckCircle2, Timer, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkTask, WorkProject, WorkCategory } from '@/types';

const CATEGORIES: { id: WorkCategory; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  { id: 'development', label: 'Development', icon: <Code className="w-5 h-5" />, color: '#A855F7', desc: 'Personal dev projects & coding' },
  { id: 'startup', label: 'Startup', icon: <Rocket className="w-5 h-5" />, color: '#06B6D4', desc: 'Startup & business projects' },
  { id: 'job', label: 'Job', icon: <Briefcase className="w-5 h-5" />, color: '#34D399', desc: 'Employment & freelance work' },
];

interface AISuggestion {
  category: WorkCategory;
  description: string;
  suggested_tasks: { title: string; description: string; priority: string; selected: boolean }[];
}

function mapTask(t: Record<string, unknown>): WorkTask {
  return {
    id: t.id as string,
    category: t.category as WorkCategory,
    title: t.title as string,
    description: (t.description || '') as string,
    status: (t.status || 'todo') as WorkTask['status'],
    priority: (t.priority || 'medium') as WorkTask['priority'],
    dueDate: (t.due_date || undefined) as string | undefined,
    createdAt: (t.created_at || '') as string,
    completedAt: (t.completed_at || undefined) as string | undefined,
  };
}

function mapProject(p: Record<string, unknown>): WorkProject {
  return {
    id: p.id as string,
    category: p.category as WorkCategory,
    name: p.name as string,
    description: (p.description || '') as string,
    tasks: [],
    status: (p.status || 'active') as WorkProject['status'],
    createdAt: (p.created_at || '') as string,
  };
}

export default function WorkPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<WorkCategory>('development');
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as WorkTask['priority'], dueDate: '' });
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  // AI state
  const [aiStep, setAiStep] = useState<'input' | 'loading' | 'review'>('input');
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [tasksData, projectsData] = await Promise.all([
        api.work.tasks.get(),
        api.work.projects.get(),
      ]);
      setTasks(tasksData.map(mapTask));
      setProjects(projectsData.map(mapProject));
    } catch (err) {
      console.error('Failed to load work data', err);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      const data = await api.work.tasks.create({
        category: tab,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        due_date: newTask.dueDate || null,
      });
      setTasks(prev => [mapTask(data), ...prev]);
      setShowAddTask(false);
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
    } catch (err) {
      console.error('Failed to create task', err);
    }
  };

  const updateTaskStatus = async (id: string, status: WorkTask['status']) => {
    try {
      await api.work.tasks.update(id, {
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      });
      setTasks(prev => prev.map(t =>
        t.id === id ? { ...t, status, completedAt: status === 'done' ? new Date().toISOString() : undefined } : t
      ));
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await api.work.tasks.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await api.work.projects.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  // AI organize flow
  const handleOrganize = async () => {
    if (!newProject.name.trim()) return;
    setAiStep('loading');
    try {
      const result = await api.work.organize({
        name: newProject.name.trim(),
        description: newProject.description.trim(),
      });
      setAiSuggestion({
        category: (result.category || 'development') as WorkCategory,
        description: result.description || newProject.description,
        suggested_tasks: (result.suggested_tasks || []).map(t => ({ ...t, selected: true })),
      });
      setAiStep('review');
    } catch {
      // Fallback: skip AI, go straight to review with defaults
      setAiSuggestion({
        category: tab,
        description: newProject.description,
        suggested_tasks: [],
      });
      setAiStep('review');
    }
  };

  const handleSaveProject = async () => {
    if (!aiSuggestion) return;
    setSaving(true);
    try {
      const projectData = await api.work.projects.create({
        category: aiSuggestion.category,
        name: newProject.name.trim(),
        description: aiSuggestion.description,
      });
      setProjects(prev => [mapProject(projectData), ...prev]);

      // Create selected tasks
      const selectedTasks = aiSuggestion.suggested_tasks.filter(t => t.selected);
      const createdTasks = await Promise.all(
        selectedTasks.map(t =>
          api.work.tasks.create({
            category: aiSuggestion.category,
            title: t.title,
            description: t.description,
            priority: t.priority,
            project_id: projectData.id,
          })
        )
      );
      setTasks(prev => [...createdTasks.map(mapTask), ...prev]);

      setTab(aiSuggestion.category);
      closeProjectModal();
    } catch (err) {
      console.error('Failed to save project', err);
    } finally {
      setSaving(false);
    }
  };

  const closeProjectModal = () => {
    setShowAddProject(false);
    setNewProject({ name: '', description: '' });
    setAiSuggestion(null);
    setAiStep('input');
  };

  const filteredTasks = tasks.filter(t => t.category === tab);
  const filteredProjects = projects.filter(p => p.category === tab);
  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress');
  const doneTasks = filteredTasks.filter(t => t.status === 'done');

  const PRIORITY_COLORS: Record<string, string> = { low: 'success', medium: 'warning', high: 'danger', urgent: 'danger' };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Work" description="Development, startup & job tasks" icon={<Code className="w-5 h-5" />}>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowAddProject(true)}><FolderKanban className="w-4 h-4" /> New Project</Button>
          <Button onClick={() => setShowAddTask(true)}><Plus className="w-4 h-4" /> Add Task</Button>
        </div>
      </PageHeader>

      <Tabs tabs={CATEGORIES.map(c => ({ id: c.id, label: c.label, icon: c.icon, count: tasks.filter(t => t.category === c.id && t.status !== 'done').length }))} active={tab} onChange={(id) => setTab(id as WorkCategory)} />

      <Card variant="glass" className="p-3">
        <div className="flex items-center gap-2">
          <div style={{ color: CATEGORIES.find(c => c.id === tab)?.color }}>{CATEGORIES.find(c => c.id === tab)?.icon}</div>
          <p className="text-sm text-[var(--foreground-muted)]">{CATEGORIES.find(c => c.id === tab)?.desc}</p>
        </div>
      </Card>

      {filteredProjects.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">Projects</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredProjects.map(project => (
              <Card key={project.id} variant="interactive" depth className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--foreground)]">{project.name}</p>
                    <p className="text-xs text-[var(--foreground-muted)] mt-0.5 line-clamp-2">{project.description}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Badge variant={project.status === 'active' ? 'success' : project.status === 'paused' ? 'warning' : 'outline'}>{project.status}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => deleteProject(project.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Circle className="w-4 h-4 text-[var(--foreground-muted)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">To Do</p>
            <Badge variant="outline">{todoTasks.length}</Badge>
          </div>
          <div className="space-y-2">
            {todoTasks.map((task, i) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card variant="default" className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-[var(--foreground)] flex-1">{task.title}</p>
                    <Badge variant={PRIORITY_COLORS[task.priority] as 'success' | 'warning' | 'danger'}>{task.priority}</Badge>
                  </div>
                  {task.description && <p className="text-xs text-[var(--foreground-muted)] mb-2">{task.description}</p>}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => updateTaskStatus(task.id, 'in-progress')}><ArrowRight className="w-3 h-3" /> Start</Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id)}><Trash2 className="w-3 h-3 text-[var(--danger)]" /></Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-4 h-4 text-[var(--warning)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">In Progress</p>
            <Badge variant="warning">{inProgressTasks.length}</Badge>
          </div>
          <div className="space-y-2">
            {inProgressTasks.map((task, i) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card variant="default" className="p-3 border-l-2 border-l-[var(--warning)]">
                  <p className="text-sm font-semibold text-[var(--foreground)] mb-1">{task.title}</p>
                  {task.description && <p className="text-xs text-[var(--foreground-muted)] mb-2">{task.description}</p>}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => updateTaskStatus(task.id, 'done')}><Check className="w-3 h-3" /> Done</Button>
                    <Button variant="ghost" size="sm" onClick={() => updateTaskStatus(task.id, 'todo')}>Back</Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">Done</p>
            <Badge variant="success">{doneTasks.length}</Badge>
          </div>
          <div className="space-y-2">
            {doneTasks.slice(0, 10).map((task, i) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card variant="default" className="p-3 opacity-60">
                  <p className="text-sm font-semibold text-[var(--foreground)] line-through">{task.title}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{task.completedAt ? new Date(task.completedAt).toLocaleDateString() : ''}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {filteredTasks.length === 0 && (
        <EmptyState icon={<Code className="w-8 h-8" />} title="No tasks yet" description="Start adding tasks to track your work" action={<Button onClick={() => setShowAddTask(true)}><Plus className="w-4 h-4" /> Add Task</Button>} />
      )}

      {/* Add Task Modal */}
      <Modal isOpen={showAddTask} onClose={() => setShowAddTask(false)} title="Add Work Task">
        <div className="space-y-4">
          <div><Label>Title</Label><Input placeholder="What needs to be done?" value={newTask.title} onChange={e => setNewTask(m => ({ ...m, title: e.target.value }))} /></div>
          <div><Label>Description</Label><TextArea placeholder="Details..." value={newTask.description} onChange={e => setNewTask(m => ({ ...m, description: e.target.value }))} rows={2} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Priority</Label><Select value={newTask.priority} onChange={e => setNewTask(m => ({ ...m, priority: e.target.value as WorkTask['priority'] }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></Select></div>
            <div><Label>Due Date</Label><Input type="date" value={newTask.dueDate} onChange={e => setNewTask(m => ({ ...m, dueDate: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAddTask(false)}>Cancel</Button>
            <Button onClick={addTask} disabled={!newTask.title.trim()}>Add Task</Button>
          </div>
        </div>
      </Modal>

      {/* New Project Modal — AI-powered */}
      <Modal isOpen={showAddProject} onClose={closeProjectModal} title="New Project" size="lg">
        {aiStep === 'input' && (
          <div className="space-y-4">
            <div>
              <Label>Project Name</Label>
              <Input placeholder="e.g. E-commerce mobile app, Portfolio redesign..." value={newProject.name} onChange={e => setNewProject(m => ({ ...m, name: e.target.value }))} />
            </div>
            <div>
              <Label>Description <span className="text-[var(--foreground-muted)] font-normal">(optional — helps AI organize better)</span></Label>
              <TextArea placeholder="Describe what this project is about, what you want to build or achieve..." value={newProject.description} onChange={e => setNewProject(m => ({ ...m, description: e.target.value }))} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={closeProjectModal}>Cancel</Button>
              <Button onClick={handleOrganize} disabled={!newProject.name.trim()}>
                <Sparkles className="w-4 h-4" /> Organize with AI
              </Button>
            </div>
          </div>
        )}

        {aiStep === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
              <Sparkles className="w-8 h-8 text-[var(--accent)]" />
            </motion.div>
            <p className="text-sm text-[var(--foreground-muted)]">AI is organizing your project...</p>
          </div>
        )}

        {aiStep === 'review' && aiSuggestion && (
          <div className="space-y-5">
            {/* Category */}
            <div>
              <Label>Category</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setAiSuggestion(prev => prev ? { ...prev, category: c.id } : prev)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      aiSuggestion.category === c.id
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--foreground-muted)]'
                    }`}
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>AI-Enhanced Description</Label>
              <TextArea
                value={aiSuggestion.description}
                onChange={e => setAiSuggestion(prev => prev ? { ...prev, description: e.target.value } : prev)}
                rows={2}
                className="mt-1"
              />
            </div>

            {/* Suggested Tasks */}
            {aiSuggestion.suggested_tasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Suggested Tasks</Label>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    {aiSuggestion.suggested_tasks.filter(t => t.selected).length}/{aiSuggestion.suggested_tasks.length} selected
                  </p>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {aiSuggestion.suggested_tasks.map((task, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        setAiSuggestion(prev => {
                          if (!prev) return prev;
                          const updated = [...prev.suggested_tasks];
                          updated[i] = { ...updated[i], selected: !updated[i].selected };
                          return { ...prev, suggested_tasks: updated };
                        });
                      }}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        task.selected
                          ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                          : 'border-[var(--border)] opacity-50'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        task.selected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--foreground-muted)]'
                      }`}>
                        {task.selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-[var(--foreground)]">{task.title}</p>
                          <Badge variant={PRIORITY_COLORS[task.priority] as 'success' | 'warning' | 'danger'}>{task.priority}</Badge>
                        </div>
                        <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{task.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setAiStep('input'); setAiSuggestion(null); }}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={closeProjectModal}>Cancel</Button>
                <Button onClick={handleSaveProject} disabled={saving}>
                  {saving ? 'Creating...' : `Create Project${aiSuggestion.suggested_tasks.filter(t => t.selected).length > 0 ? ` + ${aiSuggestion.suggested_tasks.filter(t => t.selected).length} Tasks` : ''}`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
