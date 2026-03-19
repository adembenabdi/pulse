'use client';

import { useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UndoDeleteOptions {
  restoreFn: (id: string) => Promise<unknown>;
  onRestore?: () => void;
  duration?: number; // ms, default 30000
  label?: string;
}

export function useUndoDelete({ restoreFn, onRestore, duration = 30000, label = 'Item' }: UndoDeleteOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDelete = useCallback(
    async (id: string, deleteFn: () => Promise<unknown>) => {
      await deleteFn();

      if (timerRef.current) clearTimeout(timerRef.current);

      const toastId = toast(
        (t) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>{label} deleted</span>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                if (timerRef.current) clearTimeout(timerRef.current);
                try {
                  await restoreFn(id);
                  onRestore?.();
                  toast.success(`${label} restored`);
                } catch {
                  toast.error('Failed to restore');
                }
              }}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                background: '#A855F7',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              Undo
            </button>
          </div>
        ),
        { duration, style: { background: '#1E1E2E', color: '#E0E0E0', border: '1px solid #333' } }
      );

      timerRef.current = setTimeout(() => {
        toast.dismiss(toastId);
      }, duration);
    },
    [restoreFn, onRestore, duration, label]
  );

  return { triggerDelete };
}
