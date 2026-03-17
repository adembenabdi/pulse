'use client';

import React, { forwardRef, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════════════════
   PULSE — UI Primitives (Glass 3D Design System)
   ═══════════════════════════════════════════════════════ */

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// ── Card ──────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'outlined' | 'interactive' | 'elevated';
  glow?: boolean;
  depth?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', glow, depth, children, onMouseMove, onMouseLeave, ...props }, ref) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const cardRef = (ref as React.RefObject<HTMLDivElement>) || innerRef;

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!depth || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        cardRef.current.style.transform =
          `perspective(800px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg) translateZ(4px)`;
        onMouseMove?.(e);
      },
      [depth, cardRef, onMouseMove]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!depth || !cardRef.current) return;
        cardRef.current.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
        onMouseLeave?.(e);
      },
      [depth, cardRef, onMouseLeave]
    );

    const base = 'rounded-2xl relative overflow-hidden transition-all duration-300 ease-out';
    const variants = {
      default: 'bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-xl shadow-[var(--shadow-sm)]',
      glass: 'card-glass',
      outlined: 'bg-transparent border border-[var(--border)]',
      interactive: 'card-3d cursor-pointer',
      elevated: 'bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-xl shadow-[var(--shadow-lg)]',
    };

    return (
      <div
        ref={cardRef}
        className={cn(base, variants[variant], glow && 'glow-primary', depth && 'transform-gpu will-change-transform', className)}
        onMouseMove={depth ? handleMouseMove : onMouseMove}
        onMouseLeave={depth ? handleMouseLeave : onMouseLeave}
        style={depth ? { transformStyle: 'preserve-3d', transition: 'transform 0.15s ease-out' } : undefined}
        {...props}
      >
        {(variant === 'default' || variant === 'elevated' || variant === 'interactive') && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)]/10 to-transparent pointer-events-none" />
        )}
        <div className="relative z-[1]">{children}</div>
      </div>
    );
  }
);
Card.displayName = 'Card';

// ── Button ────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-gradient-to-br from-[var(--primary)] to-[var(--violet)] text-white font-semibold shadow-[0_2px_12px_rgba(168,85,247,0.3)] hover:shadow-[0_4px_20px_rgba(168,85,247,0.4)] hover:brightness-110',
      secondary: 'bg-[var(--background-surface)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--card-border-hover)] hover:bg-[var(--sidebar-hover)]',
      ghost: 'bg-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-hover)]',
      danger: 'bg-gradient-to-br from-[var(--danger)] to-[#DC2626] text-white font-semibold shadow-[0_2px_12px_rgba(248,113,113,0.2)]',
      accent: 'bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] text-white font-semibold shadow-[0_2px_12px_rgba(6,182,212,0.25)]',
      glass: 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] text-[var(--foreground)] hover:bg-white/[0.06] hover:border-[var(--primary)]/20',
    };
    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
      md: 'h-9 px-4 text-sm rounded-xl gap-2',
      lg: 'h-11 px-6 text-sm rounded-xl gap-2',
      icon: 'h-9 w-9 rounded-xl flex items-center justify-center',
    };
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200',
          'disabled:opacity-40 disabled:pointer-events-none',
          'active:scale-[0.96] active:brightness-95',
          variants[variant], sizes[size], className
        )}
        {...props}
      >
        {loading && (
          <motion.svg animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
            className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </motion.svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ── Input ─────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-9 px-3 rounded-xl text-sm',
        'bg-[var(--input-bg)] border text-[var(--foreground)]',
        'placeholder:text-[var(--foreground-muted)]/50',
        'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]/40',
        'transition-all duration-200',
        error ? 'border-[var(--danger)]/60' : 'border-[var(--input-border)]',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

// ── TextArea ──────────────────────────────
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full px-3 py-2.5 rounded-xl text-sm resize-none',
        'bg-[var(--input-bg)] border text-[var(--foreground)]',
        'placeholder:text-[var(--foreground-muted)]/50',
        'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]/40',
        'transition-all duration-200',
        error ? 'border-[var(--danger)]/60' : 'border-[var(--input-border)]',
        className
      )}
      {...props}
    />
  )
);
TextArea.displayName = 'TextArea';

// ── Select ────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full h-9 px-3 rounded-xl text-sm appearance-none',
        'bg-[var(--input-bg)] border text-[var(--foreground)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]/40',
        'transition-all duration-200',
        error ? 'border-[var(--danger)]/60' : 'border-[var(--input-border)]',
        className
      )}
      {...props}
    >{children}</select>
  )
);
Select.displayName = 'Select';

// ── Label ─────────────────────────────────
export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('block text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-1.5', className)} {...props}>
      {children}
    </label>
  );
}

// ── Badge ─────────────────────────────────
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'outline' | 'glass';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'default', size = 'md', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--background-surface)] text-[var(--foreground-muted)]',
    primary: 'bg-[var(--primary)]/10 text-[var(--primary-light)] border border-[var(--primary)]/15',
    accent: 'bg-[var(--accent)]/10 text-[var(--accent-light)] border border-[var(--accent)]/15',
    success: 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/15',
    warning: 'bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/15',
    danger: 'bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/15',
    outline: 'bg-transparent border border-[var(--border)] text-[var(--foreground-muted)]',
    glass: 'bg-white/[0.04] backdrop-blur-md border border-white/[0.08] text-[var(--foreground)]',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-semibold', size === 'sm' ? 'px-1.5 py-px text-[10px]' : 'px-2.5 py-0.5 text-[11px]', variants[variant], className)} {...props}>
      {children}
    </span>
  );
}

// ── Modal ─────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className={cn(
              'w-full rounded-t-2xl sm:rounded-2xl p-5 sm:p-6',
              'bg-[var(--background-secondary)] border border-[var(--card-border)]',
              'shadow-[var(--shadow-xl)] backdrop-blur-xl',
              'max-h-[85vh] overflow-y-auto',
              sizes[size]
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mb-4 sm:hidden" />
            {title && (
              <div className="mb-5">
                <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
                {description && <p className="text-sm text-[var(--foreground-muted)] mt-1">{description}</p>}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Tabs ──────────────────────────────────
interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode; count?: number }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-0.5 p-1 rounded-2xl bg-[var(--background-surface)] border border-[var(--border)] overflow-x-auto no-scrollbar', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 relative whitespace-nowrap flex-shrink-0',
            active === tab.id
              ? 'bg-gradient-to-br from-[var(--primary)]/15 to-[var(--violet)]/10 text-[var(--foreground)] shadow-[var(--shadow-sm)] border border-[var(--primary)]/15'
              : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-white/[0.02]'
          )}
        >
          <span className="flex items-center gap-1.5 sm:gap-2">
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.length > 8 ? tab.label.slice(0, 6) + '…' : tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(
                'text-[10px] px-1.5 py-px rounded-full',
                active === tab.id
                  ? 'bg-[var(--primary)]/20 text-[var(--primary-light)]'
                  : 'bg-[var(--background-surface)] text-[var(--foreground-muted)]'
              )}>
                {tab.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Empty State ───────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="mb-5 p-5 rounded-2xl bg-[var(--primary)]/[0.04] border border-[var(--primary)]/[0.06]">
        <div className="text-[var(--primary)]/40">{icon}</div>
      </div>
      <h3 className="text-base font-semibold text-[var(--foreground)] mb-1.5">{title}</h3>
      {description && <p className="text-sm text-[var(--foreground-muted)] max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

// ── Stat Card ─────────────────────────────
export function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <Card variant="interactive" depth className="p-5 group">
      <div className="flex items-start justify-between mb-4 relative">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[var(--shadow-sm)]"
          style={{
            background: `linear-gradient(135deg, ${color || 'var(--primary)'}18, ${color || 'var(--primary)'}08)`,
            color: color || 'var(--primary)',
            border: `1px solid ${color || 'var(--primary)'}15`,
          }}
        >
          {icon}
        </div>
        {sub && <Badge variant="primary">{sub}</Badge>}
      </div>
      <p className="text-3xl font-bold text-[var(--foreground)] tracking-tight font-[family-name:var(--font-display)]">{value}</p>
      <p className="text-xs text-[var(--foreground-muted)] mt-1 font-medium">{label}</p>
    </Card>
  );
}

// ── Page Header ───────────────────────────
export function PageHeader({ title, description, action, icon, children }: {
  title: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4"
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)]/15 to-[var(--violet)]/10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/10 flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] tracking-tight font-[family-name:var(--font-display)] truncate">{title}</h1>
          {description && <p className="text-xs sm:text-sm text-[var(--foreground-muted)] mt-0.5 truncate">{description}</p>}
        </div>
      </div>
      <div className="flex-shrink-0">{children || action}</div>
    </motion.div>
  );
}

// ── Spinner ───────────────────────────────
export function Spinner({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-10" cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="3" />
        <path className="opacity-80" fill="var(--primary)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </motion.div>
  );
}

// ── Progress Ring ─────────────────────────
export function ProgressRing({ progress, size = 64, strokeWidth = 4, color = 'var(--primary)', children }: {
  progress: number; size?: number; strokeWidth?: number; color?: string; children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="progress-ring">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="progress-ring__circle"
          style={{ strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset: offset }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
