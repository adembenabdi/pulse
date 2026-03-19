'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, TextArea, Label, Modal, Tabs, StatCard, EmptyState } from '@/components/ui/primitives';
import { Users, Plus, Search, Trash2, Edit3, Phone, Mail, MessageCircle, Send, Instagram, Facebook, Sparkles, X, ChevronDown, ChevronRight, Loader2, Tag, FolderPlus } from 'lucide-react';
import { api } from '@/lib/api';

interface Friend {
  id: string;
  name: string;
  relationship: string;
  note: string;
  skills: string[];
  birthday: string | null;
  contacts: {
    phone?: string;
    email?: string;
    whatsapp?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    telegram?: string;
  };
}

interface FriendGroup {
  id: string;
  name: string;
  color: string;
  members: { friend_id: string; friend_name: string }[];
}

const RELATIONSHIP_TYPES = [
  'Friend', 'Classmate', 'Colleague', 'Family', 'Mentor', 'Acquaintance', 'Business', 'Administratif', 'Prof', 'Other',
];

const RELATIONSHIP_COLORS: Record<string, string> = {
  Friend: '#A855F7', Classmate: '#06B6D4', Colleague: '#34D399', Family: '#F97316',
  Mentor: '#EC4899', Acquaintance: '#6366F1', Business: '#FBBF24', Administratif: '#F87171', Prof: '#0EA5E9', Other: '#94A3B8',
};

const GROUP_COLORS = ['#A855F7', '#06B6D4', '#34D399', '#F97316', '#EC4899', '#6366F1', '#FBBF24', '#F87171'];

const CONTACT_FIELDS = [
  { key: 'phone', label: 'Phone', icon: Phone, placeholder: '+213...' },
  { key: 'email', label: 'Email', icon: Mail, placeholder: 'email@example.com' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, placeholder: '+213...' },
  { key: 'linkedin', label: 'LinkedIn', icon: null, placeholder: 'linkedin.com/in/...' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: '@username' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'facebook.com/...' },
  { key: 'telegram', label: 'Telegram', icon: Send, placeholder: '@username' },
] as const;

function ContactIcon({ type }: { type: string }) {
  const field = CONTACT_FIELDS.find(f => f.key === type);
  if (!field) return null;
  if (type === 'linkedin') {
    return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    );
  }
  const Icon = field.icon;
  return Icon ? <Icon className="w-3.5 h-3.5" /> : null;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRel, setFilterRel] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FriendGroup | null>(null);
  const [editing, setEditing] = useState<Friend | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState('contacts');

  // Form state
  const [form, setForm] = useState({
    name: '', relationship: 'Friend', note: '',
    skillInput: '', skills: [] as string[],
    contacts: {} as Record<string, string>,
    birthday: '',
  });
  const [groupForm, setGroupForm] = useState({ name: '', color: GROUP_COLORS[0], memberIds: [] as string[] });
  const [organizingSkills, setOrganizingSkills] = useState(false);

  const loadFriends = useCallback(async () => {
    try {
      const data = await api.friends.get() as unknown as Friend[];
      setFriends(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const data = await api.friends.groups.get() as unknown as FriendGroup[];
      setGroups(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (user) {
      loadFriends();
      loadGroups();
    }
  }, [user, loadFriends, loadGroups]);

  const resetForm = () => {
    setForm({ name: '', relationship: 'Friend', note: '', skillInput: '', skills: [], contacts: {}, birthday: '' });
    setEditing(null);
  };

  const openEdit = (friend: Friend) => {
    setEditing(friend);
    setForm({
      name: friend.name,
      relationship: friend.relationship || 'Friend',
      note: friend.note || '',
      skillInput: '',
      skills: friend.skills || [],
      contacts: friend.contacts || {},
      birthday: friend.birthday || '',
    });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      relationship: form.relationship,
      note: form.note, // keep raw text as-is
      skills: form.skills,
      contacts: Object.fromEntries(
        Object.entries(form.contacts).filter(([, v]) => v && v.trim())
      ),
      birthday: form.birthday || null,
    };
    try {
      if (editing) {
        await api.friends.update(editing.id, payload);
      } else {
        await api.friends.create(payload);
      }
      await loadFriends();
      setShowAdd(false);
      resetForm();
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.friends.delete(id);
      setFriends(f => f.filter(x => x.id !== id));
      if (expanded === id) setExpanded(null);
    } catch {
      // silent
    }
  };

  const addSkillManual = (skill: string) => {
    const s = skill.trim();
    if (s && !form.skills.includes(s)) {
      setForm(f => ({ ...f, skills: [...f.skills, s], skillInput: '' }));
    }
  };

  const removeSkill = (skill: string) => {
    setForm(f => ({ ...f, skills: f.skills.filter(s => s !== skill) }));
  };

  const organizeSkills = async () => {
    if (!form.skillInput.trim()) return;
    setOrganizingSkills(true);
    try {
      const { skills: organized } = await api.friends.organizeSkills(form.skillInput);
      const merged = [...new Set([...form.skills, ...organized])];
      setForm(f => ({ ...f, skills: merged, skillInput: '' }));
    } catch {
      // fallback: just add as single skill
      addSkillManual(form.skillInput);
    } finally {
      setOrganizingSkills(false);
    }
  };

  // Group CRUD
  const resetGroupForm = () => {
    setGroupForm({ name: '', color: GROUP_COLORS[0], memberIds: [] });
    setEditingGroup(null);
  };

  const openEditGroup = (g: FriendGroup) => {
    setEditingGroup(g);
    setGroupForm({ name: g.name, color: g.color || GROUP_COLORS[0], memberIds: g.members.map(m => m.friend_id) });
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) return;
    try {
      if (editingGroup) {
        await api.friends.groups.update(editingGroup.id, {
          name: groupForm.name.trim(),
          color: groupForm.color,
          member_ids: groupForm.memberIds,
        });
      } else {
        await api.friends.groups.create({
          name: groupForm.name.trim(),
          color: groupForm.color,
          member_ids: groupForm.memberIds,
        });
      }
      await loadGroups();
      setShowGroupModal(false);
      resetGroupForm();
    } catch { /* silent */ }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      await api.friends.groups.delete(id);
      setGroups(g => g.filter(x => x.id !== id));
    } catch { /* silent */ }
  };

  const toggleGroupMember = (friendId: string) => {
    setGroupForm(f => ({
      ...f,
      memberIds: f.memberIds.includes(friendId)
        ? f.memberIds.filter(id => id !== friendId)
        : [...f.memberIds, friendId],
    }));
  };

  // Get groups a friend belongs to
  const getFriendGroups = (friendId: string) =>
    groups.filter(g => g.members.some(m => m.friend_id === friendId));

  // Filtered friends
  const filtered = friends.filter(f => {
    const matchSearch = !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.skills || []).some(s => s.toLowerCase().includes(search.toLowerCase())) ||
      (f.note || '').toLowerCase().includes(search.toLowerCase());
    const matchRel = filterRel === 'all' || f.relationship === filterRel;
    return matchSearch && matchRel;
  });

  const relCounts = friends.reduce((acc, f) => {
    const r = f.relationship || 'Other';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalSkills = new Set(friends.flatMap(f => f.skills || [])).size;

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Friends" description="Your contacts & network" icon={<Users className="w-5 h-5" />}>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { resetGroupForm(); setShowGroupModal(true); }}><FolderPlus className="w-4 h-4" /> Group</Button>
          <Button onClick={() => { resetForm(); setShowAdd(true); }}><Plus className="w-4 h-4" /> Add Contact</Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Contacts" value={friends.length} color="#A855F7" />
        <StatCard icon={<Sparkles className="w-5 h-5" />} label="Unique Skills" value={totalSkills} color="#06B6D4" />
        <StatCard icon={<Users className="w-5 h-5" />} label="Relationships" value={Object.keys(relCounts).length} color="#34D399" />
        <StatCard icon={<MessageCircle className="w-5 h-5" />} label="With Contact Info" value={friends.filter(f => Object.values(f.contacts || {}).some(Boolean)).length} color="#F97316" />
      </div>

      {/* Search & Filter */}
      {friends.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
            <Input placeholder="Search by name, skill, or note..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <select
            className="h-9 px-3 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)]"
            value={filterRel}
            onChange={e => setFilterRel(e.target.value)}
          >
            <option value="all">All Types</option>
            {RELATIONSHIP_TYPES.map(r => (
              <option key={r} value={r}>{r} {relCounts[r] ? `(${relCounts[r]})` : ''}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'contacts', label: 'Contacts', icon: <Users className="w-4 h-4" />, count: friends.length },
          { id: 'groups', label: 'Groups', icon: <Tag className="w-4 h-4" />, count: groups.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Friends List */}
      {tab === 'contacts' && (loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : friends.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No contacts yet"
          description="Start building your network"
          action={<Button onClick={() => { resetForm(); setShowAdd(true); }}><Plus className="w-4 h-4" /> Add Contact</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Search className="w-8 h-8" />} title="No matches" description="Try a different search or filter" />
      ) : (
        <div className="space-y-2">
          {filtered.map((friend, i) => {
            const isOpen = expanded === friend.id;
            const color = RELATIONSHIP_COLORS[friend.relationship] || '#94A3B8';
            const contactEntries = Object.entries(friend.contacts || {}).filter(([, v]) => v);

            return (
              <motion.div key={friend.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Card variant="elevated" className="overflow-hidden">
                  {/* Header row */}
                  <div className="p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : friend.id)}>
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
                      >
                        {friend.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-[var(--foreground)]">{friend.name}</p>
                          {friend.relationship && (
                            <Badge variant="outline" size="sm" style={{ borderColor: `${color}40`, color }}>{friend.relationship}</Badge>
                          )}
                          {friend.birthday && (
                            <span className="text-[10px] text-[var(--foreground-muted)]">🎂 {new Date(friend.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          )}
                        </div>
                        {/* Skill pills preview */}
                        {(friend.skills || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {friend.skills.slice(0, 4).map(s => (
                              <span key={s} className="text-[10px] px-1.5 py-px rounded-full bg-[var(--primary)]/10 text-[var(--primary-light)]">{s}</span>
                            ))}
                            {friend.skills.length > 4 && (
                              <span className="text-[10px] px-1.5 py-px rounded-full bg-[var(--background-surface)] text-[var(--foreground-muted)]">
                                +{friend.skills.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Group badges */}
                        {getFriendGroups(friend.id).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {getFriendGroups(friend.id).map(g => (
                              <span key={g.id} className="text-[10px] px-1.5 py-px rounded-full text-white font-medium" style={{ backgroundColor: g.color || '#6366F1' }}>
                                {g.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Contact icons preview */}
                      <div className="hidden sm:flex items-center gap-1.5 text-[var(--foreground-muted)]">
                        {contactEntries.slice(0, 3).map(([key]) => (
                          <ContactIcon key={key} type={key} />
                        ))}
                        {contactEntries.length > 3 && (
                          <span className="text-[10px]">+{contactEntries.length - 3}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(friend); }}>
                          <Edit3 className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDelete(friend.id); }}>
                          <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                        </Button>
                        {isOpen ? <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)]" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[var(--border)] overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          {/* All skills */}
                          {(friend.skills || []).length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase mb-2">Skills</p>
                              <div className="flex flex-wrap gap-1.5">
                                {friend.skills.map(s => (
                                  <Badge key={s} variant="primary" size="sm">{s}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Note */}
                          {friend.note && (
                            <div>
                              <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase mb-1">Note</p>
                              <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{friend.note}</p>
                            </div>
                          )}

                          {/* Contact Info */}
                          {contactEntries.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase mb-2">Contact</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {contactEntries.map(([key, value]) => {
                                  const field = CONTACT_FIELDS.find(f => f.key === key);
                                  return (
                                    <div key={key} className="flex items-center gap-2 text-sm">
                                      <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                                        <ContactIcon type={key} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[10px] text-[var(--foreground-muted)] uppercase">{field?.label}</p>
                                        <p className="text-xs text-[var(--foreground)] truncate">{value}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ))}

      {/* Groups Tab */}
      {tab === 'groups' && (
        <div className="space-y-3">
          {groups.length === 0 ? (
            <EmptyState
              icon={<Tag className="w-8 h-8" />}
              title="No groups yet"
              description="Organize your contacts into groups"
              action={<Button onClick={() => { resetGroupForm(); setShowGroupModal(true); }}><Plus className="w-4 h-4" /> Create Group</Button>}
            />
          ) : (
            groups.map((group, i) => (
              <motion.div key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card variant="elevated" className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: group.color || '#6366F1' }}>
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--foreground)]">{group.name}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditGroup(group)}>
                        <Edit3 className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteGroup(group.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
                      </Button>
                    </div>
                  </div>
                  {group.members.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {group.members.map(m => (
                        <span key={m.friend_id} className="text-xs px-2 py-1 rounded-full bg-[var(--background-surface)] text-[var(--foreground)]">
                          {m.friend_name}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            ))
          )}
          <Button variant="secondary" className="w-full" onClick={() => { resetGroupForm(); setShowGroupModal(true); }}>
            <Plus className="w-4 h-4" /> Create Group
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); resetForm(); }} title={editing ? 'Edit Contact' : 'New Contact'} size="lg">
        <div className="space-y-5">
          {/* Name & Relationship */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Relationship</Label>
              <select
                className="w-full h-9 px-3 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)]"
                value={form.relationship}
                onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
              >
                {RELATIONSHIP_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Birthday */}
          <div>
            <Label>Birthday</Label>
            <Input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} />
          </div>

          {/* Skills — AI organized */}
          <div>
            <Label>Skills</Label>
            <p className="text-[11px] text-[var(--foreground-muted)] mb-2">Type skills as raw text — AI will organize them, or press Enter to add manually</p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. good at python, machine learning, web dev..."
                value={form.skillInput}
                onChange={e => setForm(f => ({ ...f, skillInput: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkillManual(form.skillInput);
                  }
                }}
                className="flex-1"
              />
              <Button size="sm" variant="accent" onClick={organizeSkills} disabled={!form.skillInput.trim() || organizingSkills}>
                {organizingSkills ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{organizingSkills ? 'Organizing...' : 'AI Organize'}</span>
              </Button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.skills.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary-light)] border border-[var(--primary)]/15">
                    {s}
                    <button onClick={() => removeSkill(s)} className="hover:text-[var(--danger)] transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Note — raw text preserved */}
          <div>
            <Label>Note</Label>
            <p className="text-[11px] text-[var(--foreground-muted)] mb-2">Your personal notes — saved exactly as you write them</p>
            <TextArea
              placeholder="Anything you want to remember about this person..."
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Contact Methods */}
          <div>
            <Label>Contact Info</Label>
            <p className="text-[11px] text-[var(--foreground-muted)] mb-2">Only fill what you have</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONTACT_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--background-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] flex-shrink-0">
                    <ContactIcon type={field.key} />
                  </div>
                  <Input
                    placeholder={field.placeholder}
                    value={form.contacts[field.key] || ''}
                    onChange={e => setForm(f => ({ ...f, contacts: { ...f.contacts, [field.key]: e.target.value } }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>{editing ? 'Save Changes' : 'Add Contact'}</Button>
          </div>
        </div>
      </Modal>

      {/* Group Modal */}
      <Modal isOpen={showGroupModal} onClose={() => { setShowGroupModal(false); resetGroupForm(); }} title={editingGroup ? 'Edit Group' : 'New Group'}>
        <div className="space-y-4">
          <div>
            <Label>Group Name</Label>
            <Input placeholder="e.g. Study Group, Football Team..." value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setGroupForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full transition-all ${groupForm.color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--background)] scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c, outlineColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Members ({groupForm.memberIds.length} selected)</Label>
            <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
              {friends.map(f => {
                const selected = groupForm.memberIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleGroupMember(f.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      selected ? 'bg-[var(--primary)]/15 text-[var(--foreground)]' : 'hover:bg-[var(--background-surface)] text-[var(--foreground-muted)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                      selected ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]'
                    }`}>
                      {selected && <span className="text-white text-xs">✓</span>}
                    </div>
                    {f.name}
                    {f.relationship && <span className="text-xs text-[var(--foreground-muted)] ml-auto">{f.relationship}</span>}
                  </button>
                );
              })}
              {friends.length === 0 && <p className="text-sm text-[var(--foreground-muted)] py-2">No contacts to add</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setShowGroupModal(false); resetGroupForm(); }}>Cancel</Button>
            <Button onClick={handleSaveGroup} disabled={!groupForm.name.trim()}>{editingGroup ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
