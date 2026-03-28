'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, CheckSquare, Handshake } from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'task' | 'meeting' | null>(null);
  const [value, setValue] = useState('');
  const [meetingDate, setMeetingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode && inputRef.current) inputRef.current.focus();
  }, [mode]);

  const submit = async () => {
    if (!value.trim()) return;
    try {
      if (mode === 'task') {
        await api.tasks.create({
          title: value.trim(),
          status: 'pending',
          priority: 'medium',
          category: 'personal',
        });
        toast.success('Task added!');
      } else if (mode === 'meeting') {
        await api.meetings.create({
          title: value.trim(),
          date: meetingDate,
        });
        toast.success('Meeting added!');
      }
      setValue('');
      setMeetingDate(format(new Date(), 'yyyy-MM-dd'));
      setMode(null);
      setOpen(false);
    } catch {
      toast.error('Failed to add');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') { setMode(null); setOpen(false); }
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--violet)] text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        whileTap={{ scale: 0.9 }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="plus" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Plus className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Quick action buttons */}
      <AnimatePresence>
        {open && !mode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-50 flex flex-col gap-3 items-end"
          >
            <motion.button
              onClick={() => setMode('task')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--background-card)] border border-[var(--border)] shadow-lg text-sm font-medium text-[var(--foreground)] hover:border-[var(--primary)] transition-colors"
              whileHover={{ x: -4 }}
            >
              <CheckSquare className="w-4 h-4 text-[var(--primary)]" /> Quick Task
            </motion.button>
            <motion.button
              onClick={() => setMode('meeting')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--background-card)] border border-[var(--border)] shadow-lg text-sm font-medium text-[var(--foreground)] hover:border-amber-400 transition-colors"
              whileHover={{ x: -4 }}
            >
              <Handshake className="w-4 h-4 text-amber-400" /> Quick Meeting
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input panel */}
      <AnimatePresence>
        {mode && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-80 p-4 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-3">
              {mode === 'task' ? (
                <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
              ) : (
                <Handshake className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-sm font-bold text-[var(--foreground)]">
                {mode === 'task' ? 'Quick Task' : 'Quick Meeting'}
              </span>
              <button onClick={() => { setMode(null); setOpen(false); }} className="ml-auto">
                <X className="w-4 h-4 text-[var(--foreground-muted)]" />
              </button>
            </div>
            <input
              ref={inputRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'task' ? 'What needs to be done?' : 'Meeting title...'}
              className="w-full px-3 py-2 rounded-lg bg-[var(--background-surface)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--primary)]"
            />
            {mode === 'meeting' && (
              <input
                type="date"
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                className="w-full mt-2 px-3 py-2 rounded-lg bg-[var(--background-surface)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
              />
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => { setMode(null); setValue(''); }}
                className="px-3 py-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!value.trim()}
                className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {(open || mode) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setMode(null); setOpen(false); }}
            className="fixed inset-0 z-40 bg-black/20"
          />
        )}
      </AnimatePresence>
    </>
  );
}
