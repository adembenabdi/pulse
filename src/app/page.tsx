'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Card, Button, Input, Label } from '@/components/ui/primitives';
import { Mail, ArrowRight, Plus, Sparkles, Lock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, isLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password');
      return;
    }
    setSubmitting(true);
    setError('');
    const { ok, error: err } = await login(trimmedEmail, password);
    setSubmitting(false);
    if (ok) {
      router.push('/dashboard');
    } else {
      setError(err || 'Login failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg grid-pattern flex items-center justify-center p-4">
      <div className="fixed top-20 left-20 w-96 h-96 rounded-full bg-[var(--primary)]/[0.03] blur-[120px] pointer-events-none" />
      <div className="fixed bottom-20 right-20 w-80 h-80 rounded-full bg-[var(--accent)]/[0.03] blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--violet)] shadow-[0_4px_20px_rgba(168,85,247,0.3)] mb-4"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold gradient-text font-[family-name:var(--font-display)]">Pulse</h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">Every Beat Counts</p>
        </div>

        <Card variant="elevated" className="p-6">
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="pl-10"
                    error={!!error}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="pl-10"
                    error={!!error}
                  />
                </div>
              </div>
            </div>
            {error && <p className="text-xs text-[var(--danger)] mt-3">{error}</p>}
            <Button type="submit" className="w-full mt-4" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>

          <div className="mt-4">
            <Button variant="ghost" className="w-full" onClick={() => router.push('/onboarding')}>
              <Plus className="w-4 h-4" /> Create New Account
            </Button>
          </div>
        </Card>

        <p className="text-center text-xs text-[var(--foreground-muted)] mt-6">
          Secure authentication • Your data on Supabase
        </p>
      </motion.div>
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </ThemeProvider>
  );
}
