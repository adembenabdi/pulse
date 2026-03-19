'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  Card, Badge, Button, PageHeader, Input, Modal, EmptyState, Spinner,
} from '@/components/ui/primitives';
import {
  Library, Plus, Trash2, ExternalLink, Sparkles, Link2, Tag,
  Globe, Code, BookOpen, Video, GraduationCap, Wrench, Package, Search, X,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  source_url: string;
  category: string;
  tags: string[];
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  tool: { icon: <Wrench className="w-4 h-4" />, color: '#3B82F6', label: 'Tool' },
  project: { icon: <Code className="w-4 h-4" />, color: '#A855F7', label: 'Project' },
  article: { icon: <BookOpen className="w-4 h-4" />, color: '#F59E0B', label: 'Article' },
  video: { icon: <Video className="w-4 h-4" />, color: '#EF4444', label: 'Video' },
  course: { icon: <GraduationCap className="w-4 h-4" />, color: '#10B981', label: 'Course' },
  library: { icon: <Package className="w-4 h-4" />, color: '#8B5CF6', label: 'Library' },
  website: { icon: <Globe className="w-4 h-4" />, color: '#06B6D4', label: 'Website' },
  other: { icon: <Link2 className="w-4 h-4" />, color: '#94A3B8', label: 'Other' },
};

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<Partial<Resource> | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchResources = useCallback(async () => {
    try {
      const data = await api.resources.get(filter === 'all' ? undefined : filter) as unknown as Resource[];
      setResources(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (user) fetchResources();
  }, [user, fetchResources]);

  const handleExtract = async () => {
    if (!urlInput.trim()) return;
    setExtracting(true);
    try {
      const result = await api.resources.extract(urlInput.trim());
      setExtracted({
        title: result.title,
        description: result.description,
        url: result.url,
        source_url: result.source_url,
        category: result.category,
        tags: result.tags,
      });
    } catch {
      setExtracted({
        title: '',
        description: '',
        url: '',
        source_url: urlInput.trim(),
        category: 'other',
        tags: [],
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!extracted?.title) return;
    setSaving(true);
    try {
      const saved = await api.resources.create(extracted) as unknown as Resource;
      setResources(prev => [saved, ...prev]);
      setShowAdd(false);
      setUrlInput('');
      setExtracted(null);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.resources.delete(id);
      setResources(prev => prev.filter(r => r.id !== id));
    } catch {
      // ignore
    }
  };

  const filtered = resources.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const categories = ['all', ...Object.keys(CATEGORY_CONFIG)];

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Save links, tools & projects with AI extraction"
        icon={<Library className="w-5 h-5" />}
      >
        <Button onClick={() => { setShowAdd(true); setExtracted(null); setUrlInput(''); }}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => {
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filter === cat
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--background-surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {cat === 'all' ? 'All' : cfg?.label || cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Library className="w-10 h-10" />}
          title="No resources yet"
          description="Paste a link to save and organize resources with AI"
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          <AnimatePresence>
            {filtered.map(r => {
              const cfg = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.other;
              return (
                <motion.div
                  key={r.id}
                  layout
                  variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card variant="interactive" depth className="p-4 group">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `${cfg.color}15`, color: cfg.color }}
                      >
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm text-[var(--foreground)] line-clamp-1">{r.title}</h3>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="opacity-0 group-hover:opacity-100 text-[var(--foreground-muted)] hover:text-[var(--danger)] transition-all shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-[var(--foreground-muted)] mt-0.5 line-clamp-2">{r.description}</p>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" size="sm" style={{ borderColor: `${cfg.color}40`, color: cfg.color }}>
                            {cfg.label}
                          </Badge>
                          {r.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--background-surface)] text-[var(--foreground-muted)]">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          {r.url && (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-[var(--primary)] hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Link
                            </a>
                          )}
                          {r.source_url && (
                            <a
                              href={r.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-[var(--foreground-muted)] hover:underline flex items-center gap-1"
                            >
                              <Globe className="w-3 h-3" /> Source
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add Resource Modal */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setExtracted(null); }} title="Save Resource" description="Paste a link and AI will extract the info for you">
        <div className="space-y-4">
          {/* URL Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Paste a URL (Threads, GitHub, website...)"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleExtract()}
              className="flex-1"
            />
            <Button onClick={handleExtract} disabled={extracting || !urlInput.trim()}>
              {extracting ? <Spinner size={16} /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>

          {/* Extracted Preview */}
          {extracted && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <Card variant="elevated" className="p-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-[var(--foreground-muted)] mb-1 block">Title</label>
                  <Input
                    value={extracted.title || ''}
                    onChange={e => setExtracted(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--foreground-muted)] mb-1 block">Description</label>
                  <Input
                    value={extracted.description || ''}
                    onChange={e => setExtracted(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                {extracted.url && (
                  <div className="flex items-center gap-2 text-xs">
                    <Link2 className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <a href={extracted.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline truncate">
                      {extracted.url}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {extracted.category && (
                    <Badge variant="primary" size="sm">{CATEGORY_CONFIG[extracted.category]?.label || extracted.category}</Badge>
                  )}
                  {extracted.tags?.map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--background-surface)] text-[var(--foreground-muted)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setShowAdd(false); setExtracted(null); }}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || !extracted.title}>
                  {saving ? <Spinner size={16} /> : 'Save Resource'}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </Modal>
    </div>
  );
}
