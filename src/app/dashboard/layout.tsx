'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { cn } from '@/components/ui/primitives';
import {
  LayoutDashboard, Calendar, CalendarDays, CheckSquare, Moon, Dumbbell, UtensilsCrossed,
  BookOpen, Code, Briefcase, GraduationCap, Wallet, Target, BookHeart,
  PenLine, Settings, LogOut, Sun, MoonStar, ChevronLeft, ChevronRight,
  Menu, X, Sparkles, User, Lightbulb, Users
} from 'lucide-react';
import AssistantWidget from '@/components/AssistantWidget';

const NAV_SECTIONS = [
  {
    title: 'DAILY',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Today' },
      { href: '/dashboard/prayer', icon: Moon, label: 'Prayer Times' },
      { href: '/dashboard/sport', icon: Dumbbell, label: 'Sport' },
      { href: '/dashboard/meals', icon: UtensilsCrossed, label: 'Meals' },
      { href: '/dashboard/learning', icon: BookOpen, label: 'Learning' },
    ],
  },
  {
    title: 'PRODUCTIVITY',
    items: [
      { href: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks' },
      { href: '/dashboard/study', icon: GraduationCap, label: 'Study' },
      { href: '/dashboard/work', icon: Code, label: 'Work' },
      { href: '/dashboard/ideas', icon: Lightbulb, label: 'Ideas Lab' },
      { href: '/dashboard/schedule', icon: Calendar, label: 'Schedule' },
    ],
  },
  {
    title: 'LIFE',
    items: [
      { href: '/dashboard/finance', icon: Wallet, label: 'Finance' },
      { href: '/dashboard/goals', icon: Target, label: 'Goals' },
      { href: '/dashboard/habits', icon: BookHeart, label: 'Habits' },
      { href: '/dashboard/journal', icon: PenLine, label: 'Journal' },
      { href: '/dashboard/calendar', icon: CalendarDays, label: 'Calendar' },
      { href: '/dashboard/friends', icon: Users, label: 'Friends' },
    ],
  },
];

function Sidebar({ collapsed, setCollapsed, onNavigate }: { collapsed: boolean; setCollapsed: (v: boolean) => void; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 256 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col sidebar-float"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 h-14 border-b border-[var(--border)]">
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--violet)] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold gradient-text">Pulse</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--sidebar-hover)] transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)]" /> : <ChevronLeft className="w-4 h-4 text-[var(--foreground-muted)]" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
        {NAV_SECTIONS.map(section => (
          <div key={section.title}>
            <AnimatePresence>
              {!collapsed && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[10px] font-bold text-[var(--foreground-muted)] tracking-widest px-2 mb-1"
                >
                  {section.title}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => { router.push(item.href); onNavigate?.(); }}
                    className={cn(
                      'nav-item-3d w-full items-center gap-3 px-3 py-2',
                      active && 'active',
                      collapsed && 'justify-center px-0'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn('w-[18px] h-[18px] flex-shrink-0', active ? 'text-[var(--primary)]' : 'text-[var(--foreground-muted)]')} />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                          className={cn('text-sm font-medium whitespace-nowrap overflow-hidden', active ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)]')}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-[var(--border)] space-y-0.5">
        <button
          onClick={toggleTheme}
          className="nav-item-3d w-full items-center gap-3 px-3 py-2"
          title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
        >
          {theme === 'dark' ? <Sun className="w-[18px] h-[18px] text-[var(--warning)]" /> : <MoonStar className="w-[18px] h-[18px] text-[var(--primary)]" />}
          {!collapsed && <span className="text-sm text-[var(--foreground-muted)]">{theme === 'dark' ? 'Light' : 'Dark'}</span>}
        </button>

        <button
          onClick={() => { router.push('/dashboard/settings'); onNavigate?.(); }}
          className={cn('nav-item-3d w-full items-center gap-3 px-3 py-2', pathname === '/dashboard/settings' && 'active')}
        >
          <Settings className="w-[18px] h-[18px] text-[var(--foreground-muted)]" />
          {!collapsed && <span className="text-sm text-[var(--foreground-muted)]">Settings</span>}
        </button>

        <button
          onClick={() => { logout(); router.push('/'); onNavigate?.(); }}
          className="nav-item-3d w-full items-center gap-3 px-3 py-2"
        >
          <LogOut className="w-[18px] h-[18px] text-[var(--danger)]" />
          {!collapsed && <span className="text-sm text-[var(--danger)]">Logout</span>}
        </button>

        {/* User avatar at bottom */}
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-2 mt-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--primary)]/20 to-[var(--violet)]/10 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-[var(--primary)]" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-[var(--foreground)] truncate">{user.name}</p>
              <p className="text-[10px] text-[var(--foreground-muted)] truncate">{user.field}</p>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <div className="animate-pulse text-[var(--foreground-muted)]">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen gradient-bg">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4 bg-[var(--sidebar-bg)] border-b border-[var(--border)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--violet)] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold gradient-text">Pulse</span>
        </div>
        <button onClick={() => setMobileMenu(!mobileMenu)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--sidebar-hover)]">
          {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenu && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenu(false)}
          >
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-64 h-full"
              onClick={e => e.stopPropagation()}
            >
              <Sidebar collapsed={false} setCollapsed={() => setMobileMenu(false)} onNavigate={() => setMobileMenu(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <motion.main
        animate={{ marginLeft: collapsed ? 68 : 256 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="hidden md:block min-h-screen"
      >
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </motion.main>

      {/* Mobile main */}
      <div className="md:hidden pt-14 min-h-screen">
        <div className="p-4">{children}</div>
      </div>

      {/* AI Assistant */}
      <AssistantWidget />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DashboardShell>{children}</DashboardShell>
      </AuthProvider>
    </ThemeProvider>
  );
}
