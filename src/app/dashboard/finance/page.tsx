'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, Label, Select, Modal, Tabs, StatCard, EmptyState } from '@/components/ui/primitives';
import { Wallet, Plus, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, Trash2, Calendar, PieChart, Target, AlertTriangle, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import type { TransactionType, ExpenseCategory, IncomeCategory } from '@/types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface TxItem {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  recurring?: boolean;
}

interface BudgetItem {
  id: string;
  month: string;
  category: string;
  limit_amount: number;
  actual?: number;
}

interface FriendItem {
  id: string;
  name: string;
}

const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string; emoji: string }> = {
  food: { label: 'Food', emoji: '🍕' },
  transport: { label: 'Transport', emoji: '🚌' },
  education: { label: 'Education', emoji: '📚' },
  entertainment: { label: 'Entertainment', emoji: '🎮' },
  health: { label: 'Health', emoji: '💊' },
  clothing: { label: 'Clothing', emoji: '👕' },
  other: { label: 'Other', emoji: '📦' },
};

const INCOME_CATEGORIES: Record<IncomeCategory, { label: string; emoji: string }> = {
  work: { label: 'Work', emoji: '💼' },
  family: { label: 'Family', emoji: '👨‍👩‍👧' },
  freelance: { label: 'Freelance', emoji: '💻' },
  gift: { label: 'Gift', emoji: '🎁' },
  other: { label: 'Other', emoji: '📦' },
};

function getCategoryInfo(category: string) {
  return EXPENSE_CATEGORIES[category as ExpenseCategory] || INCOME_CATEGORIES[category as IncomeCategory] || { label: category, emoji: '📦' };
}

export default function FinancePage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [tab, setTab] = useState('overview');
  const [newTx, setNewTx] = useState({
    type: 'expense' as TransactionType,
    amount: '', category: 'food' as string,
    description: '',
    friend_ids: [] as string[],
  });
  const [budgetForm, setBudgetForm] = useState({ category: 'food', limit: '' });
  const [friends, setFriends] = useState<FriendItem[]>([]);

  const currentMonth = format(new Date(), 'yyyy-MM');

  const load = useCallback(async () => {
    try {
      const [txData, budgetData] = await Promise.all([
        api.finance.get(),
        api.budget.get(currentMonth),
      ]);
      setTransactions(txData as unknown as TxItem[]);
      setBudgets(budgetData as unknown as BudgetItem[]);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    if (user) {
      load();
      api.friends.get().then(d => setFriends(d as unknown as FriendItem[])).catch(() => {});
    }
  }, [user, load]);

  const { triggerDelete } = useUndoDelete({
    restoreFn: (id: string) => api.finance.restore(id),
    onRestore: load,
    label: 'Transaction',
  });

  const addTransaction = async () => {
    if (!newTx.amount) return;
    try {
      await api.finance.create({
        type: newTx.type,
        amount: parseFloat(newTx.amount) || 0,
        category: newTx.category,
        description: newTx.description.trim(),
        date: format(new Date(), 'yyyy-MM-dd'),
        friend_ids: newTx.friend_ids,
      });
      await load();
      setShowAdd(false);
      setNewTx({ type: 'expense', amount: '', category: 'food', description: '', friend_ids: [] });
    } catch { /* silent */ }
  };

  const deleteTx = (id: string) => {
    triggerDelete(id, async () => {
      await api.finance.delete(id);
      setTransactions(t => t.filter(x => x.id !== id));
    });
  };

  const saveBudget = async () => {
    if (!budgetForm.limit) return;
    try {
      await api.budget.set({
        month: currentMonth,
        category: budgetForm.category,
        limit_amount: parseFloat(budgetForm.limit) || 0,
      });
      await load();
      setShowBudget(false);
      setBudgetForm({ category: 'food', limit: '' });
    } catch { /* silent */ }
  };

  const deleteBudget = async (id: string) => {
    try {
      await api.budget.delete(id);
      setBudgets(b => b.filter(x => x.id !== id));
    } catch { /* silent */ }
  };

  // Monthly stats
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthlyTxs = transactions.filter(t => {
    const d = new Date(t.date);
    return isWithinInterval(d, { start: monthStart, end: monthEnd });
  });

  const monthlyIncome = monthlyTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = monthlyTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = monthlyIncome - monthlyExpense;

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    monthlyTxs.filter(t => t.type === 'expense').forEach(t => {
      breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
    });
    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  }, [monthlyTxs]);

  // Category actual spending for budgets
  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    monthlyTxs.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return map;
  }, [monthlyTxs]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Track your income and expenses"
        icon={<Wallet className="w-5 h-5" />}
      >
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowBudget(true)}><Target className="w-4 h-4" /> Budget</Button>
          <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Transaction</Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Wallet className="w-5 h-5" />} label="Balance" value={`${balance.toFixed(0)} DA`} color={balance >= 0 ? '#34D399' : '#F87171'} />
        <StatCard icon={<ArrowUpCircle className="w-5 h-5" />} label="Income" value={`${monthlyIncome.toFixed(0)} DA`} color="#34D399" />
        <StatCard icon={<ArrowDownCircle className="w-5 h-5" />} label="Expenses" value={`${monthlyExpense.toFixed(0)} DA`} color="#F87171" />
        <StatCard icon={<PieChart className="w-5 h-5" />} label="Transactions" value={monthlyTxs.length} sub={format(new Date(), 'MMM')} color="#A855F7" />
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview', icon: <PieChart className="w-4 h-4" /> },
          { id: 'budgets', label: 'Budgets', icon: <Target className="w-4 h-4" />, count: budgets.length },
          { id: 'history', label: 'History', icon: <Calendar className="w-4 h-4" />, count: transactions.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category breakdown */}
          <Card variant="elevated" className="p-5">
            <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">Expense Breakdown</h3>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">No expenses this month</p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map(([cat, amount]) => {
                  const info = getCategoryInfo(cat);
                  const pct = monthlyExpense > 0 ? Math.round((amount / monthlyExpense) * 100) : 0;
                  const budget = budgets.find(b => b.category === cat);
                  const overBudget = budget && amount > budget.limit_amount;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[var(--foreground)]">
                          {info?.emoji} {info?.label}
                          {overBudget && <AlertTriangle className="w-3 h-3 inline ml-1 text-[var(--danger)]" />}
                        </span>
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          {amount.toFixed(0)} DA
                          {budget && <span className="text-xs text-[var(--foreground-muted)]"> / {budget.limit_amount} DA</span>}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--background-surface)]">
                        <motion.div
                          className={`h-full rounded-full ${overBudget ? 'bg-[var(--danger)]' : 'bg-gradient-to-r from-[var(--primary)] to-[var(--violet)]'}`}
                          animate={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Quick add buttons */}
          <Card variant="elevated" className="p-5">
            <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">Quick Add</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => (
                <Button
                  key={key}
                  variant="secondary"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    setNewTx(m => ({ ...m, category: key, type: 'expense' }));
                    setShowAdd(true);
                  }}
                >
                  {val.emoji} {val.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'budgets' && (
        <div className="space-y-3">
          {budgets.length === 0 ? (
            <EmptyState
              icon={<Target className="w-8 h-8" />}
              title="No budget goals"
              description="Set monthly spending limits per category"
              action={<Button onClick={() => setShowBudget(true)}><Plus className="w-4 h-4" /> Set Budget</Button>}
            />
          ) : (
            budgets.map((b, i) => {
              const info = getCategoryInfo(b.category);
              const actual = b.actual ?? categorySpending[b.category] ?? 0;
              const pct = b.limit_amount > 0 ? Math.round((actual / b.limit_amount) * 100) : 0;
              const over = actual > b.limit_amount;
              return (
                <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card variant="elevated" className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{info.emoji}</span>
                        <div>
                          <p className="text-sm font-bold text-[var(--foreground)]">{info.label}</p>
                          <p className="text-xs text-[var(--foreground-muted)]">{format(new Date(), 'MMMM yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${over ? 'text-[var(--danger)]' : 'text-[var(--foreground)]'}`}>
                            {actual.toFixed(0)} / {b.limit_amount.toFixed(0)} DA
                          </p>
                          <p className="text-xs text-[var(--foreground-muted)]">{pct}% used</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteBudget(b.id)}>
                          <Trash2 className="w-3 h-3 text-[var(--danger)]" />
                        </Button>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--background-surface)]">
                      <motion.div
                        className={`h-full rounded-full transition-colors ${
                          over ? 'bg-[var(--danger)]' : pct > 80 ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'
                        }`}
                        animate={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    {over && (
                      <p className="text-xs text-[var(--danger)] mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Over budget by {(actual - b.limit_amount).toFixed(0)} DA
                      </p>
                    )}
                  </Card>
                </motion.div>
              );
            })
          )}
          <Button variant="secondary" className="w-full" onClick={() => setShowBudget(true)}>
            <Plus className="w-4 h-4" /> Add Budget Goal
          </Button>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <EmptyState
              icon={<Wallet className="w-8 h-8" />}
              title="No transactions"
              description="Start tracking your finances"
              action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Transaction</Button>}
            />
          ) : (
            transactions.slice(0, 50).map((tx, i) => (
              <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                <Card variant="default" className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tx.type === 'income' ? 'bg-[var(--success)]/15 text-[var(--success)]' : 'bg-[var(--danger)]/15 text-[var(--danger)]'
                      }`}>
                        {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {tx.description || getCategoryInfo(tx.category).label}
                        </p>
                        <p className="text-xs text-[var(--foreground-muted)]">{tx.date} • {getCategoryInfo(tx.category).emoji} {getCategoryInfo(tx.category).label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(0)} DA
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => deleteTx(tx.id)}>
                        <Trash2 className="w-3 h-3 text-[var(--danger)]" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Add Transaction Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Transaction">
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <div className="flex gap-2">
              <Button variant={newTx.type === 'expense' ? 'danger' : 'secondary'} size="sm" onClick={() => setNewTx(m => ({ ...m, type: 'expense', category: 'food' }))}>
                <TrendingDown className="w-3.5 h-3.5" /> Expense
              </Button>
              <Button variant={newTx.type === 'income' ? 'primary' : 'secondary'} size="sm" onClick={() => setNewTx(m => ({ ...m, type: 'income', category: 'work' }))}>
                <TrendingUp className="w-3.5 h-3.5" /> Income
              </Button>
            </div>
          </div>
          <div>
            <Label>Amount (DA)</Label>
            <Input type="number" placeholder="0" value={newTx.amount} onChange={e => setNewTx(m => ({ ...m, amount: e.target.value }))} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={newTx.category} onChange={e => setNewTx(m => ({ ...m, category: e.target.value }))}>
              {Object.entries(newTx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Input placeholder="What was it for?" value={newTx.description} onChange={e => setNewTx(m => ({ ...m, description: e.target.value }))} />
          </div>
          {/* Friend tagging */}
          {friends.length > 0 && (
            <div>
              <Label className="flex items-center gap-1"><Users className="w-3 h-3" /> Who was there?</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {friends.map(f => {
                  const selected = newTx.friend_ids.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setNewTx(prev => ({
                        ...prev,
                        friend_ids: selected
                          ? prev.friend_ids.filter(x => x !== f.id)
                          : [...prev.friend_ids, f.id],
                      }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selected
                          ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]'
                          : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--card-border-hover)]'
                      }`}
                    >
                      {selected ? '✓ ' : ''}{f.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addTransaction} disabled={!newTx.amount}>Add</Button>
          </div>
        </div>
      </Modal>

      {/* Budget Goal Modal */}
      <Modal isOpen={showBudget} onClose={() => setShowBudget(false)} title="Set Budget Goal">
        <div className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={budgetForm.category} onChange={e => setBudgetForm(f => ({ ...f, category: e.target.value }))}>
              {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Monthly Limit (DA)</Label>
            <Input type="number" placeholder="e.g. 5000" value={budgetForm.limit} onChange={e => setBudgetForm(f => ({ ...f, limit: e.target.value }))} />
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">
            Current spending for {getCategoryInfo(budgetForm.category).emoji} {getCategoryInfo(budgetForm.category).label}: <strong>{(categorySpending[budgetForm.category] || 0).toFixed(0)} DA</strong>
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowBudget(false)}>Cancel</Button>
            <Button onClick={saveBudget} disabled={!budgetForm.limit}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
