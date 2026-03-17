'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, TextArea, Label, Select, Modal, Tabs, EmptyState } from '@/components/ui/primitives';
import { CheckSquare, Plus, Check, Circle, Timer, Trash2, Calendar } from 'lucide-react';
import { getFromStorage, saveToStorage, generateId } from '@/lib/storage';
import type { Task } from '@/types';
import { format } from 'date-fns';

const CATEGORY_COLORS: Record<string, string> = {
  personal: '#A855F7', study: '#06B6D4', work: '#34D399', club: '#FBBF24', other: '#6E6B8A',
};

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [newTask, setNewTask] = useState({
    title: '', description: '', priority: 'medium' as Task['priority'],
    category: 'personal' as Task['category'], dueDate: '',
  });

  useEffect(() => {
    if (!user) return;
    setTasks(getFromStorage<Task[]>(user.id, 'tasks', []));
  }, [user]);

  const save = (updated: Task[]) => {
    if (!user) return;
    setTasks(updated);
    saveToStorage(user.id, 'tasks', updated);
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;
    save([{
      id: generateId(), title: newTask.title.trim(),
      description: newTask.description.trim(),
      status: 'pending', priority: newTask.priority,
      category: newTask.category,
      dueDate: newTask.dueDate || undefined,
      createdAt: new Date().toISOString(),
    }, ...tasks]);
    setShowAdd(false);
    setNewTask({ title: '', description: '', priority: 'medium', category: 'personal', dueDate: '' });
  };

  const cycleStatus = (id: string) => {
    const order: Task['status'][] = ['pending', 'in-progress', 'completed'];
    save(tasks.map(t => {
      if (t.id !== id) return t;
      const next = order[(order.indexOf(t.status) + 1) % order.length];
      return { ...t, status: next, completedAt: next === 'completed' ? new Date().toISOString() : undefined };
    }));
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter);
  const pending = filtered.filter(t => t.status !== 'completed');
  const completed = filtered.filter(t => t.status === 'completed');

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Manage your to-do list" icon={<CheckSquare className="w-5 h-5" />}>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Task</Button>
      </PageHeader>

      <Tabs
        tabs={[
          { id: 'all', label: 'All', count: tasks.filter(t => t.status !== 'completed').length },
          { id: 'personal', label: 'Personal' },
          { id: 'study', label: 'Study' },
          { id: 'work', label: 'Work' },
          { id: 'club', label: 'Club' },
        ]}
        active={filter}
        onChange={setFilter}
      />

      {/* Pending tasks */}
      <div className="space-y-2">
        {pending.length === 0 && completed.length === 0 ? (
          <EmptyState icon={<CheckSquare className="w-8 h-8" />} title="No tasks" description="Add your first task" action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add</Button>} />
        ) : (
          pending.map((task, i) => (
            <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card variant="default" className="p-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => cycleStatus(task.id)} className="flex-shrink-0">
                    {task.status === 'pending' ? <Circle className="w-5 h-5 text-[var(--foreground-muted)]" /> :
                     task.status === 'in-progress' ? <Timer className="w-5 h-5 text-[var(--warning)]" /> :
                     <Check className="w-5 h-5 text-[var(--success)]" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" style={{ borderColor: `${CATEGORY_COLORS[task.category]}40`, color: CATEGORY_COLORS[task.category] }}>
                        {task.category}
                      </Badge>
                      <Badge variant={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : 'outline'}>
                        {task.priority}
                      </Badge>
                      {task.dueDate && <span className="text-[10px] text-[var(--foreground-muted)]">{task.dueDate}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => save(tasks.filter(t => t.id !== task.id))}>
                    <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">Completed ({completed.length})</p>
          <div className="space-y-1">
            {completed.slice(0, 20).map(task => (
              <Card key={task.id} variant="default" className="p-2.5 opacity-50">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--success)]" />
                  <p className="text-sm text-[var(--foreground)] line-through">{task.title}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={newTask.priority} onChange={e => setNewTask(m => ({ ...m, priority: e.target.value as Task['priority'] }))}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newTask.category} onChange={e => setNewTask(m => ({ ...m, category: e.target.value as Task['category'] }))}>
                <option value="personal">Personal</option><option value="study">Study</option><option value="work">Work</option><option value="club">Club</option><option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={newTask.dueDate} onChange={e => setNewTask(m => ({ ...m, dueDate: e.target.value }))} />
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
