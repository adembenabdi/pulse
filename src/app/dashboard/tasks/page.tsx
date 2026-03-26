'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, TextArea, Label, Select, Modal, Tabs, EmptyState } from '@/components/ui/primitives';
import { CheckSquare, Plus, Check, Circle, Timer, Trash2, Calendar, Repeat, GraduationCap, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import type { ModuleChapter, ChapterTask, TaskType, Course } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  personal: '#A855F7', study: '#06B6D4', work: '#34D399', club: '#FBBF24', other: '#6E6B8A',
};

const TASK_TYPE_ICONS: Record<TaskType, string> = {
  study: '📖', td: '✏️', tp: '🧪', review: '🔄', custom: '📌',
};

interface TaskItem {
  id: string; title: string; description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string; due_date?: string; recurring?: string | null;
  created_at: string; completed_at?: string;
}

function mapCourse(c: Record<string, unknown>): Course {
  return {
    id: c.id as string, name: c.name as string, code: (c.code || '') as string,
    professor: (c.professor || '') as string, room: (c.room || '') as string,
    color: (c.color || '#A855F7') as string, day: c.day as number,
    startTime: (c.start_time || '') as string, endTime: (c.end_time || '') as string,
    type: (c.type || 'lecture') as Course['type'],
    sourceId: (c.source_id || null) as string | null,
    semester: (c.semester || null) as string | null,
  };
}

function mapChapter(c: Record<string, unknown>): ModuleChapter {
  const tasks = (c.chapter_tasks as Record<string, unknown>[]) || [];
  return {
    id: c.id as string,
    courseName: c.course_name as string,
    title: c.title as string,
    orderIndex: (c.order_index || 0) as number,
    tasks: tasks.map(t => ({
      id: t.id as string,
      chapterId: t.chapter_id as string,
      title: t.title as string,
      taskType: (t.task_type || 'custom') as TaskType,
      isPreset: (t.is_preset ?? false) as boolean,
      completed: (t.completed ?? false) as boolean,
    })),
  };
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [chapters, setChapters] = useState<ModuleChapter[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: '', description: '', priority: 'medium' as TaskItem['priority'],
    category: 'personal', dueDate: '', recurring: '' as string, studyModule: '',
  });

  // Get unique module names from courses
  const moduleNames = [...new Set(courses.map(c => c.name))];

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [taskData, chapterData, courseData] = await Promise.all([
        api.tasks.get(),
        api.study.chapters.get(),
        api.study.courses.get(),
      ]);
      setTasks(taskData as unknown as TaskItem[]);
      setChapters(chapterData.map(mapChapter));
      setCourses(courseData.map(mapCourse));
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const { triggerDelete } = useUndoDelete({
    restoreFn: (id) => api.tasks.restore(id),
    onRestore: load,
    label: 'Task',
  });

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    await api.tasks.create({
      title: newTask.title.trim(),
      description: newTask.description.trim() || undefined,
      priority: newTask.priority,
      category: newTask.category,
      due_date: newTask.dueDate || undefined,
      recurring: newTask.recurring || undefined,
    });
    setShowAdd(false);
    setNewTask({ title: '', description: '', priority: 'medium', category: 'personal', dueDate: '', recurring: '', studyModule: '' });
    load();
  };

  const cycleStatus = async (task: TaskItem) => {
    const order: TaskItem['status'][] = ['pending', 'in-progress', 'completed'];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    await api.tasks.update(task.id, {
      status: next,
      completed_at: next === 'completed' ? new Date().toISOString() : null,
    });
    load();
  };

  const toggleStudyTask = async (taskId: string, completed: boolean) => {
    try {
      await api.study.chapterTasks.update(taskId, { completed });
      setChapters(prev => prev.map(ch => ({
        ...ch,
        tasks: ch.tasks.map(t => t.id === taskId ? { ...t, completed } : t),
      })));
    } catch { /* ignore */ }
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter);
  const pending = filtered.filter(t => t.status !== 'completed');
  const completed = filtered.filter(t => t.status === 'completed');

  // Study tasks for module buttons
  const allStudyTasks = chapters.flatMap(ch => ch.tasks.map(t => ({ ...t, chapterTitle: ch.title, moduleName: ch.courseName })));
  const pendingStudyTasks = allStudyTasks.filter(t => !t.completed);

  // Active module tasks
  const activeModuleTasks = activeModule
    ? chapters
        .filter(ch => ch.courseName.toLowerCase() === activeModule.toLowerCase())
        .flatMap(ch => ch.tasks.filter(t => !t.completed).map(t => ({ ...t, chapterTitle: ch.title, moduleName: ch.courseName })))
    : [];

  // Global study tasks = general tasks with category 'study' (not module-linked chapter tasks)
  const globalStudyTasks = tasks.filter(t => t.category === 'study' && t.status !== 'completed');
  const completedGlobalStudyTasks = tasks.filter(t => t.category === 'study' && t.status === 'completed');

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Manage your to-do list" icon={<CheckSquare className="w-5 h-5" />}>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Task</Button>
      </PageHeader>

      <Tabs
        tabs={[
          { id: 'all', label: 'All', count: tasks.filter(t => t.status !== 'completed').length + pendingStudyTasks.length },
          { id: 'personal', label: 'Personal' },
          { id: 'study', label: 'Study', count: pendingStudyTasks.length + globalStudyTasks.length },
          { id: 'work', label: 'Work' },
          { id: 'club', label: 'Club' },
        ]}
        active={filter}
        onChange={(f) => { setFilter(f); setActiveModule(null); }}
      />

      {/* Module buttons strip */}
      {(filter === 'all' || filter === 'study') && moduleNames.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Global button */}
          <button
            onClick={() => setActiveModule(activeModule === 'global' ? null : 'global')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              activeModule === 'global'
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'bg-[var(--background-surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
            }`}
          >
            📋 Global
            {globalStudyTasks.length > 0 && <span className="text-[10px] opacity-75">{globalStudyTasks.length}</span>}
          </button>

          {/* Per-module buttons */}
          {moduleNames.map(name => {
            const moduleColor = courses.find(c => c.name === name)?.color || '#06B6D4';
            const modulePending = chapters
              .filter(ch => ch.courseName.toLowerCase() === name.toLowerCase())
              .reduce((sum, ch) => sum + ch.tasks.filter(t => !t.completed).length, 0);
            const isActive = activeModule === name;
            return (
              <button
                key={name}
                onClick={() => setActiveModule(isActive ? null : name)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'bg-[var(--background-surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
                style={isActive ? { background: moduleColor } : undefined}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isActive ? 'white' : moduleColor }} />
                <span className="truncate max-w-[120px]">{name}</span>
                {modulePending > 0 && <span className="text-[10px] opacity-75">{modulePending}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Active module study tasks panel */}
      <AnimatePresence mode="wait">
        {activeModule && activeModule !== 'global' && (
          <motion.div key={activeModule} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card variant="elevated" className="overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" style={{ color: courses.find(c => c.name === activeModule)?.color || '#06B6D4' }} />
                  <span className="text-sm font-bold text-[var(--foreground)]">{activeModule}</span>
                  <Badge variant="primary" size="sm">{activeModuleTasks.length} pending</Badge>
                </div>
                <button onClick={() => setActiveModule(null)} className="p-1 rounded-lg hover:bg-[var(--background-surface)] transition-colors">
                  <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" />
                </button>
              </div>
              <div className="p-3 space-y-1">
                {activeModuleTasks.length === 0 ? (
                  <p className="text-xs text-[var(--foreground-muted)] text-center py-3">All tasks done for this module! 🎉</p>
                ) : (
                  activeModuleTasks.map((task, i) => (
                    <motion.div key={task.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                      <div className="flex items-center gap-2 py-1.5 group">
                        <button
                          onClick={() => toggleStudyTask(task.id, true)}
                          className="w-4 h-4 rounded border border-[var(--border)] hover:border-[var(--primary)] flex items-center justify-center flex-shrink-0 transition-colors active:scale-90"
                        />
                        <span className="text-sm flex-shrink-0">{TASK_TYPE_ICONS[task.taskType] || '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-[var(--foreground)] truncate">{task.title}</p>
                          <p className="text-[9px] text-[var(--foreground-muted)] truncate">Ch: {task.chapterTitle}</p>
                        </div>
                        {task.isPreset && <span className="text-[9px] text-[var(--foreground-muted)] opacity-50 hidden sm:inline">preset</span>}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Global study tasks panel */}
        {activeModule === 'global' && (
          <motion.div key="global" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card variant="elevated" className="overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                  <span className="text-sm font-bold text-[var(--foreground)]">Global Study Tasks</span>
                  <Badge variant="primary" size="sm">{globalStudyTasks.length} pending</Badge>
                </div>
                <button onClick={() => setActiveModule(null)} className="p-1 rounded-lg hover:bg-[var(--background-surface)] transition-colors">
                  <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" />
                </button>
              </div>
              <div className="p-3 space-y-1">
                {globalStudyTasks.length === 0 ? (
                  <p className="text-xs text-[var(--foreground-muted)] text-center py-3">No global study tasks. Add one with the &quot;+ Add Task&quot; button.</p>
                ) : (
                  globalStudyTasks.map((task, i) => (
                    <motion.div key={task.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                      <Card variant="default" className="p-2.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => cycleStatus(task)} className="flex-shrink-0 active:scale-90 transition-transform">
                            {task.status === 'pending' ? <Circle className="w-4 h-4 text-[var(--foreground-muted)]" /> :
                             task.status === 'in-progress' ? <Timer className="w-4 h-4 text-[var(--warning)]" /> :
                             <Check className="w-4 h-4 text-[var(--success)]" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-[var(--foreground)] truncate">{task.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : 'outline'} size="sm">
                                {task.priority}
                              </Badge>
                              {task.due_date && <span className="text-[10px] text-[var(--foreground-muted)]">{task.due_date}</span>}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => triggerDelete(task.id, () => api.tasks.delete(task.id))}>
                            <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
                {completedGlobalStudyTasks.length > 0 && (
                  <p className="text-[10px] text-[var(--foreground-muted)] text-center pt-2">
                    {completedGlobalStudyTasks.length} completed
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regular Tasks (exclude study-category tasks when module buttons visible) */}
      {filter !== 'study' && (
        <>
          {(activeModule || pendingStudyTasks.length > 0) && pending.length > 0 && filter === 'all' && (
            <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5" /> General Tasks
            </p>
          )}
          <div className="space-y-2">
            {pending.length === 0 && completed.length === 0 && !activeModule ? (
              <EmptyState icon={<CheckSquare className="w-8 h-8" />} title="No tasks" description="Add your first task" action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add</Button>} />
            ) : (
              pending.filter(t => t.category !== 'study').map((task, i) => (
                <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Card variant="default" className="p-2.5 sm:p-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button onClick={() => cycleStatus(task)} className="flex-shrink-0 active:scale-90 transition-transform">
                        {task.status === 'pending' ? <Circle className="w-5 h-5 text-[var(--foreground-muted)]" /> :
                         task.status === 'in-progress' ? <Timer className="w-5 h-5 text-[var(--warning)]" /> :
                         <Check className="w-5 h-5 text-[var(--success)]" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{task.title}</p>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                          <Badge variant="outline" style={{ borderColor: `${CATEGORY_COLORS[task.category] || '#6E6B8A'}40`, color: CATEGORY_COLORS[task.category] || '#6E6B8A' }}>
                            {task.category}
                          </Badge>
                          <Badge variant={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : 'outline'}>
                            {task.priority}
                          </Badge>
                          {task.recurring && <Badge variant="primary" size="sm"><Repeat className="w-3 h-3" /> {task.recurring}</Badge>}
                          {task.due_date && <span className="text-[10px] text-[var(--foreground-muted)]">{task.due_date}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => triggerDelete(task.id, () => api.tasks.delete(task.id))}>
                        <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </>
      )}

      {completed.filter(t => t.category !== 'study').length > 0 && filter !== 'study' && (
        <div>
          <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">Completed ({completed.filter(t => t.category !== 'study').length})</p>
          <div className="space-y-1">
            {completed.filter(t => t.category !== 'study').slice(0, 20).map(task => (
              <Card key={task.id} variant="default" className="p-2 sm:p-2.5 opacity-50">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--success)]" />
                  <p className="text-sm text-[var(--foreground)] line-through truncate">{task.title}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Task">
        <div className="space-y-4">
          <div><Label>Title</Label><Input placeholder="What needs to be done?" value={newTask.title} onChange={e => setNewTask(m => ({ ...m, title: e.target.value }))} /></div>
          <div><Label>Description</Label><TextArea placeholder="Details..." value={newTask.description} onChange={e => setNewTask(m => ({ ...m, description: e.target.value }))} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={newTask.priority} onChange={e => setNewTask(m => ({ ...m, priority: e.target.value as TaskItem['priority'] }))}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newTask.category} onChange={e => setNewTask(m => ({ ...m, category: e.target.value, studyModule: '' }))}>
                <option value="personal">Personal</option><option value="study">Study</option><option value="work">Work</option><option value="club">Club</option><option value="other">Other</option>
              </Select>
            </div>
            {newTask.category === 'study' && moduleNames.length > 0 && (
              <div className="col-span-2">
                <Label>Module</Label>
                <Select value={newTask.studyModule} onChange={e => setNewTask(m => ({ ...m, studyModule: e.target.value }))}>
                  <option value="">Global (not linked to a module)</option>
                  {moduleNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={newTask.dueDate} onChange={e => setNewTask(m => ({ ...m, dueDate: e.target.value }))} />
            </div>
            <div>
              <Label>Recurring</Label>
              <Select value={newTask.recurring} onChange={e => setNewTask(m => ({ ...m, recurring: e.target.value }))}>
                <option value="">None</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addTask} disabled={!newTask.title.trim()}>Add Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
