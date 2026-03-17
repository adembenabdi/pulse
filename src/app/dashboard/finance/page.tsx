'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, Label, Select, Modal, Tabs, StatCard, EmptyState } from '@/components/ui/primitives';
import { Wallet, Plus, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, Trash2, Calendar, PieChart } from 'lucide-react';
import { getFromStorage, saveToStorage, generateId } from '@/lib/storage';
import type { Transaction, TransactionType, ExpenseCategory, IncomeCategory } from '@/types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

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

function getCategoryInfo(category: string, type?: TransactionType) {
  return EXPENSE_CATEGORIES[category as ExpenseCategory] || INCOME_CATEGORIES[category as IncomeCategory] || { label: category, emoji: '📦' };
}

export default function FinancePage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState('overview');
  const [newTx, setNewTx] = useState({
    type: 'expense' as TransactionType,
    amount: '', category: 'food' as ExpenseCategory | IncomeCategory,
    description: '',
  });

  useEffect(() => {
    if (!user) return;
    setTransactions(getFromStorage<Transaction[]>(user.id, 'finance:transactions', []));
  }, [user]);

  const addTransaction = () => {
    if (!user || !newTx.amount) return;
    const tx: Transaction = {
      id: generateId(),
      type: newTx.type,
      amount: parseFloat(newTx.amount) || 0,
      category: newTx.category,
      description: newTx.description.trim(),
      date: format(new Date(), 'yyyy-MM-dd'),
    };
    const updated = [tx, ...transactions];
    setTransactions(updated);
    saveToStorage(user.id, 'finance:transactions', updated);
    setShowAdd(false);
    setNewTx({ type: 'expense', amount: '', category: 'food', description: '' });
  };

  const deleteTx = (id: string) => {
    if (!user) return;
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    saveToStorage(user.id, 'finance:transactions', updated);
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

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Track your income and expenses"
        icon={<Wallet className="w-5 h-5" />}
      >
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Transaction</Button>
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
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[var(--foreground)]">{info?.emoji} {info?.label}</span>
                        <span className="text-sm font-semibold text-[var(--foreground)]">{amount.toFixed(0)} DA</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--background-surface)]">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--violet)]"
                          animate={{ width: `${pct}%` }}
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
                    setNewTx(m => ({ ...m, category: key as ExpenseCategory, type: 'expense' }));
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

      {/* Add Modal */}
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
            <Select value={newTx.category} onChange={e => setNewTx(m => ({ ...m, category: e.target.value as ExpenseCategory | IncomeCategory }))}>
              {Object.entries(newTx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Input placeholder="What was it for?" value={newTx.description} onChange={e => setNewTx(m => ({ ...m, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addTransaction} disabled={!newTx.amount}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
