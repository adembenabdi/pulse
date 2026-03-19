'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export const SHORTCUTS: Omit<Shortcut, 'action'>[] = [
  { key: 'n', ctrl: true, description: 'New task' },
  { key: 'j', ctrl: true, description: 'Journal' },
  { key: 'h', ctrl: true, description: 'Habits' },
  { key: 'f', ctrl: true, shift: true, description: 'Finance' },
  { key: 'g', ctrl: true, description: 'Goals' },
  { key: 'p', ctrl: true, shift: true, description: 'Prayer' },
  { key: 'q', ctrl: true, description: 'Quran' },
  { key: '/', description: 'Show shortcuts help' },
];

export function useKeyboardShortcuts(onShowHelp?: () => void) {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl && e.key === 'n') {
        e.preventDefault();
        router.push('/dashboard/tasks');
      } else if (ctrl && e.key === 'j') {
        e.preventDefault();
        router.push('/dashboard/journal');
      } else if (ctrl && e.key === 'h') {
        e.preventDefault();
        router.push('/dashboard/habits');
      } else if (ctrl && shift && e.key === 'F') {
        e.preventDefault();
        router.push('/dashboard/finance');
      } else if (ctrl && e.key === 'g') {
        e.preventDefault();
        router.push('/dashboard/goals');
      } else if (ctrl && shift && e.key === 'P') {
        e.preventDefault();
        router.push('/dashboard/prayer');
      } else if (ctrl && e.key === 'q') {
        e.preventDefault();
        router.push('/dashboard/quran');
      } else if (e.key === '/' && !ctrl && !shift) {
        e.preventDefault();
        onShowHelp?.();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router, onShowHelp]);
}
