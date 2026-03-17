'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  Card, Badge, Button, PageHeader, TextArea, Input, Modal, EmptyState, Spinner,
} from '@/components/ui/primitives';
import {
  Lightbulb, Sparkles, Plus, Trash2, CheckCircle2, Circle,
  Package, ListTodo, Wrench, Rocket, ChevronDown, ChevronUp, Pencil,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Task { title: string; done: boolean }
interface Material { name: string; category: string; note: string }
interface Feature { title: string; description: string }
interface Idea {
  id: string;
  title: string;
  raw_description: string;
  description: string;
  tasks: Task[];
  materials: Material[];
  extra_features: Feature[];
  status: string;
  ai_generated: boolean;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#94A3B8',
  refined: '#3B82F6',
  'in-progress': '#F59E0B',
  done: '#10B981',
};

const MATERIAL_ICONS: Record<string, string> = {
  tool: '🛠️', service: '☁️', hardware: '🔧', knowledge: '📚', other: '📦',
};

export default function IdeasPage() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'refined' | 'in-progress' | 'done'>('all');

  // AI result staging (before save)
  const [staged, setStaged] = useState<{
    description: string; tasks: Task[]; materials: Material[]; extra_features: Feature[];
  } | null>(null);
  const [stagedTitle, setStagedTitle] = useState('');

  const fetchIdeas = useCallback(async () => {
    try {
      const data = await api.ideas.get();
      setIdeas(data as unknown as Idea[]);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchIdeas(); }, [user, fetchIdeas]);

  const handleGenerate = async () => {
    if (rawInput.trim().length < 10) return;
    setGenerating(true);
    try {
      const result = await api.ideas.generate(rawInput.trim());
      setStaged(result);
      setStagedTitle(rawInput.trim().slice(0, 80));
    } catch {
      alert('AI generation failed — check your GROQ_API_KEY');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!staged || !stagedTitle.trim()) return;
    try {
      await api.ideas.create({
        title: stagedTitle.trim(),
        raw_description: rawInput,
        description: staged.description,
        tasks: staged.tasks,
        materials: staged.materials,
        extra_features: staged.extra_features,
        status: 'refined',
      });
      setShowNew(false);
      setRawInput('');
      setStaged(null);
      setStagedTitle('');
      fetchIdeas();
    } catch {
      alert('Failed to save');
    }
  };

  const toggleTask = async (idea: Idea, taskIdx: number) => {
    const updated = [...idea.tasks];
    updated[taskIdx] = { ...updated[taskIdx], done: !updated[taskIdx].done };
    try {
      await api.ideas.update(idea.id, { tasks: updated });
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, tasks: updated } : i));
    } catch { /* ignore */ }
  };

  const updateStatus = async (idea: Idea, status: string) => {
    try {
      await api.ideas.update(idea.id, { status });
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status } : i));
    } catch { /* ignore */ }
  };

  const deleteIdea = async (id: string) => {
    try {
      await api.ideas.delete(id);
      setIdeas(prev => prev.filter(i => i.id !== id));
    } catch { /* ignore */ }
  };

  const filtered = activeTab === 'all' ? ideas : ideas.filter(i => i.status === activeTab);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Ideas Lab" description="Describe it, AI organizes it" icon={<Lightbulb className="w-5 h-5" />}>
        <Button onClick={() => { setShowNew(true); setStaged(null); setRawInput(''); }}>
          <Plus className="w-4 h-4 mr-1" /> New Idea
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'draft', 'refined', 'in-progress', 'done'] as const).map(tab => (
          <Button key={tab} size="sm" variant={activeTab === tab ? 'primary' : 'secondary'} onClick={() => setActiveTab(tab)}>
            {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'all' ? ` (${ideas.length})` : ` (${ideas.filter(i => i.status === tab).length})`}
          </Button>
        ))}
      </div>

      {/* Ideas List */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="w-8 h-8" />}
          title="No ideas yet"
          description="Describe your project idea and let AI organize it for you"
          action={<Button onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-1" /> New Idea</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((idea, idx) => {
            const tasksDone = idea.tasks.filter(t => t.done).length;
            const expanded = expandedId === idea.id;
            return (
              <motion.div key={idea.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                <Card variant="elevated" className="overflow-hidden">
                  {/* Header */}
                  <button className="w-full p-4 text-left flex items-start gap-3" onClick={() => setExpandedId(expanded ? null : idea.id)}>
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[idea.status] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-[var(--foreground)] truncate">{idea.title}</h3>
                        {idea.ai_generated && <Sparkles className="w-3 h-3 text-[var(--primary)] flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-[var(--foreground-muted)] line-clamp-2">{idea.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" size="sm">{idea.status}</Badge>
                        {idea.tasks.length > 0 && (
                          <span className="text-[10px] text-[var(--foreground-muted)]">
                            <ListTodo className="w-3 h-3 inline mr-0.5" />{tasksDone}/{idea.tasks.length}
                          </span>
                        )}
                        {idea.materials.length > 0 && (
                          <span className="text-[10px] text-[var(--foreground-muted)]">
                            <Wrench className="w-3 h-3 inline mr-0.5" />{idea.materials.length}
                          </span>
                        )}
                      </div>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-[var(--foreground-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" />}
                  </button>

                  {/* Expanded */}
                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-4 border-t border-[var(--border)] pt-3">

                          {/* Description */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Pencil className="w-3.5 h-3.5 text-[var(--primary)]" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Description</h4>
                            </div>
                            <p className="text-sm text-[var(--foreground)] leading-relaxed">{idea.description}</p>
                          </div>

                          {/* Tasks */}
                          {idea.tasks.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <ListTodo className="w-3.5 h-3.5 text-[#3B82F6]" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Tasks</h4>
                                <span className="text-[10px] text-[var(--foreground-muted)] ml-auto">{tasksDone}/{idea.tasks.length}</span>
                              </div>
                              <div className="space-y-1">
                                {idea.tasks.map((task, ti) => (
                                  <button key={ti} onClick={() => toggleTask(idea, ti)}
                                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--background-surface)] transition-colors text-left"
                                  >
                                    {task.done ?
                                      <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" /> :
                                      <Circle className="w-4 h-4 text-[var(--foreground-muted)] flex-shrink-0" />
                                    }
                                    <span className={`text-sm ${task.done ? 'line-through text-[var(--foreground-muted)]' : 'text-[var(--foreground)]'}`}>
                                      {task.title}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Materials */}
                          {idea.materials.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-3.5 h-3.5 text-[#F59E0B]" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">What You Need</h4>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {idea.materials.map((mat, mi) => (
                                  <div key={mi} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--background-surface)]">
                                    <span className="text-sm">{MATERIAL_ICONS[mat.category] || '📦'}</span>
                                    <div>
                                      <p className="text-xs font-medium text-[var(--foreground)]">{mat.name}</p>
                                      {mat.note && <p className="text-[10px] text-[var(--foreground-muted)]">{mat.note}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Extra Features */}
                          {idea.extra_features.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Rocket className="w-3.5 h-3.5 text-[#A855F7]" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">More Ideas You Might Like</h4>
                              </div>
                              <div className="space-y-1.5">
                                {idea.extra_features.map((feat, fi) => (
                                  <div key={fi} className="p-2 rounded-lg bg-[var(--background-surface)]">
                                    <p className="text-xs font-medium text-[var(--foreground)]">{feat.title}</p>
                                    <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">{feat.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                            <select
                              value={idea.status}
                              onChange={e => updateStatus(idea, e.target.value)}
                              className="text-xs px-2 py-1 rounded-lg bg-[var(--background-surface)] text-[var(--foreground)] border border-[var(--border)]"
                            >
                              <option value="draft">Draft</option>
                              <option value="refined">Refined</option>
                              <option value="in-progress">In Progress</option>
                              <option value="done">Done</option>
                            </select>
                            <div className="flex-1" />
                            <Button variant="ghost" size="sm" onClick={() => deleteIdea(idea.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* New Idea Modal */}
      <Modal isOpen={showNew} onClose={() => { setShowNew(false); setStaged(null); }} title="New Idea" size="lg">
        <div className="space-y-4">
          {!staged ? (
            <>
              <div>
                <p className="text-xs text-[var(--foreground-muted)] mb-2">
                  Describe your project or idea — be as detailed or rough as you want. AI will organize it.
                </p>
                <TextArea
                  value={rawInput}
                  onChange={e => setRawInput(e.target.value)}
                  placeholder="e.g. I want to build a mobile app that helps students find study groups near them using GPS. It should have a chat feature and maybe integrate with university schedules..."
                  rows={6}
                />
              </div>
              <Button onClick={handleGenerate} disabled={generating || rawInput.trim().length < 10}>
                {generating ? (
                  <><Spinner size={16} className="mr-2" /> AI is thinking...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-1.5" /> Organize with AI</>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-[var(--foreground-muted)] mb-1 block">Title</label>
                <Input value={stagedTitle} onChange={e => setStagedTitle(e.target.value)} placeholder="Idea title" />
              </div>

              {/* AI Results Preview */}
              <div className="space-y-3 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto pr-1">
                <div className="p-3 rounded-xl bg-[var(--background-surface)]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Pencil className="w-3 h-3 text-[var(--primary)]" />
                    <span className="text-xs font-bold text-[var(--foreground-muted)]">DESCRIPTION</span>
                  </div>
                  <p className="text-sm text-[var(--foreground)]">{staged.description}</p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--background-surface)]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ListTodo className="w-3 h-3 text-[#3B82F6]" />
                    <span className="text-xs font-bold text-[var(--foreground-muted)]">TASKS ({staged.tasks.length})</span>
                  </div>
                  <ul className="space-y-1">
                    {staged.tasks.map((t, i) => (
                      <li key={i} className="text-sm text-[var(--foreground)] flex items-center gap-2">
                        <Circle className="w-3 h-3 text-[var(--foreground-muted)]" /> {t.title}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-[var(--background-surface)]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Package className="w-3 h-3 text-[#F59E0B]" />
                    <span className="text-xs font-bold text-[var(--foreground-muted)]">WHAT YOU NEED ({staged.materials.length})</span>
                  </div>
                  <div className="space-y-1">
                    {staged.materials.map((m, i) => (
                      <div key={i} className="text-sm text-[var(--foreground)]">
                        {MATERIAL_ICONS[m.category] || '📦'} {m.name}
                        {m.note && <span className="text-[var(--foreground-muted)]"> — {m.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--background-surface)]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Rocket className="w-3 h-3 text-[#A855F7]" />
                    <span className="text-xs font-bold text-[var(--foreground-muted)]">MORE IDEAS ({staged.extra_features.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {staged.extra_features.map((f, i) => (
                      <div key={i}>
                        <p className="text-sm font-medium text-[var(--foreground)]">{f.title}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">{f.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStaged(null)}>Back</Button>
                <Button onClick={handleSave} disabled={!stagedTitle.trim()}>
                  <Plus className="w-4 h-4 mr-1" /> Save Idea
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
