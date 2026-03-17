'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Card, Button, Input, Label, Select, Badge } from '@/components/ui/primitives';
import {
  User, Mail, GraduationCap, MapPin, Briefcase, Users,
  Moon, Dumbbell, UtensilsCrossed, BookOpen, ArrowRight, ArrowLeft,
  Check, Link, Sparkles, X, Plus, Lock, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ALGERIAN_CITIES } from '@/hooks/usePrayerTimes';

function OnboardingForm() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('Algiers');

  // Step 2: University
  const [university, setUniversity] = useState('');
  const [field, setField] = useState('');
  const [year, setYear] = useState(1);
  const [timetableUrl, setTimetableUrl] = useState('');

  // Step 3: Activities
  const [clubs, setClubs] = useState<string[]>([]);
  const [clubInput, setClubInput] = useState('');
  const [hasJob, setHasJob] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');

  // Step 4: Modules
  const [modules, setModules] = useState({
    prayer: true,
    sport: true,
    food: true,
    learning: true,
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, isLoading, router]);

  const addClub = () => {
    const trimmed = clubInput.trim();
    if (trimmed && !clubs.includes(trimmed)) {
      setClubs([...clubs, trimmed]);
      setClubInput('');
    }
  };

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
      setInterestInput('');
    }
  };

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    setError('');

    const { ok, error: err } = await register({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      university: university.trim() || undefined,
      field_of_study: field.trim() || undefined,
      year,
      clubs,
      has_job: hasJob,
      job_title: hasJob ? jobTitle.trim() : undefined,
      city,
      interests,
      mod_prayer: modules.prayer,
      mod_sport: modules.sport,
      mod_food: modules.food,
      mod_learning: modules.learning,
    });

    setSubmitting(false);
    if (ok) {
      router.push('/dashboard');
    } else {
      setError(err || 'Registration failed');
    }
  };

  const canNext = () => {
    switch (step) {
      case 1: return name.trim() && email.trim() && password.length >= 8 && password === confirmPassword;
      case 2: return university.trim() && field.trim();
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen gradient-bg grid-pattern flex items-center justify-center p-4">
      <div className="fixed top-20 right-20 w-96 h-96 rounded-full bg-[var(--primary)]/[0.03] blur-[120px] pointer-events-none" />
      <div className="fixed bottom-20 left-20 w-80 h-80 rounded-full bg-[var(--accent)]/[0.03] blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--violet)] shadow-[0_4px_20px_rgba(168,85,247,0.3)] mb-3"
          >
            <Sparkles className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold gradient-text font-[family-name:var(--font-display)]">Setup Your Pulse</h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">Tell us about yourself to personalize your experience</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                i < step ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--violet)]' :
                i === step ? 'bg-[var(--primary)]/30' : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </div>

        <Card variant="elevated" className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-2 mb-5">
                  <User className="w-5 h-5 text-[var(--primary)]" />
                  <h2 className="text-lg font-bold">Basic Information</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input placeholder="Ahmed Benali" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" placeholder="ahmed@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label>Password (min 8 characters)</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
                      <Input type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} className="pl-10" />
                    </div>
                  </div>
                  <div>
                    <Label>Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                        className="pl-10"
                        error={!!confirmPassword && password !== confirmPassword}
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-[var(--danger)] mt-1">Passwords do not match</p>
                    )}
                  </div>
                  <div>
                    <Label>City in Algeria</Label>
                    <Select value={city} onChange={e => setCity(e.target.value)}>
                      {ALGERIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: University */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-2 mb-5">
                  <GraduationCap className="w-5 h-5 text-[var(--accent)]" />
                  <h2 className="text-lg font-bold">University & Study</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>University</Label>
                    <Input placeholder="University of Science and Technology Houari Boumediene" value={university} onChange={e => setUniversity(e.target.value)} />
                  </div>
                  <div>
                    <Label>Field of Study</Label>
                    <Input placeholder="Computer Science" value={field} onChange={e => setField(e.target.value)} />
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Select value={year} onChange={e => setYear(Number(e.target.value))}>
                      {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5">
                      <Link className="w-3 h-3" /> Timetable Link (optional)
                    </Label>
                    <Input
                      placeholder="https://your-university.dz/timetable/..."
                      value={timetableUrl}
                      onChange={e => setTimetableUrl(e.target.value)}
                    />
                    <p className="text-xs text-[var(--foreground-muted)] mt-1.5">
                      Paste your timetable link — we&apos;ll help you add courses from it
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Activities */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-2 mb-5">
                  <Users className="w-5 h-5 text-[var(--success)]" />
                  <h2 className="text-lg font-bold">Activities & Work</h2>
                </div>
                <div className="space-y-4">
                  {/* Clubs */}
                  <div>
                    <Label>Clubs & Organizations</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. Google Developer Club"
                        value={clubInput}
                        onChange={e => setClubInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addClub())}
                      />
                      <Button variant="secondary" size="icon" onClick={addClub}><Plus className="w-4 h-4" /></Button>
                    </div>
                    {clubs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {clubs.map(c => (
                          <Badge key={c} variant="primary">
                            {c}
                            <button onClick={() => setClubs(clubs.filter(x => x !== c))} className="ml-1 hover:text-[var(--danger)]">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Job */}
                  <div>
                    <Label>Do you have a job?</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={hasJob ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setHasJob(true)}
                      >
                        <Briefcase className="w-3.5 h-3.5" /> Yes
                      </Button>
                      <Button
                        variant={!hasJob ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setHasJob(false)}
                      >
                        No
                      </Button>
                    </div>
                    {hasJob && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="mt-2">
                        <Input placeholder="Job title or role" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                      </motion.div>
                    )}
                  </div>

                  {/* Interests */}
                  <div>
                    <Label>Interests (for daily learning)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. AI, Web Dev, Cybersecurity"
                        value={interestInput}
                        onChange={e => setInterestInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                      />
                      <Button variant="secondary" size="icon" onClick={addInterest}><Plus className="w-4 h-4" /></Button>
                    </div>
                    {interests.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {interests.map(i => (
                          <Badge key={i} variant="accent">
                            {i}
                            <button onClick={() => setInterests(interests.filter(x => x !== i))} className="ml-1 hover:text-[var(--danger)]">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Modules */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles className="w-5 h-5 text-[var(--warning)]" />
                  <h2 className="text-lg font-bold">Choose Your Modules</h2>
                </div>
                <p className="text-sm text-[var(--foreground-muted)] mb-4">
                  Enable the routine modules you want. You can change these later.
                </p>
                <div className="space-y-3">
                  {[
                    { key: 'prayer' as const, icon: <Moon className="w-5 h-5" />, title: 'Prayer Times', desc: 'Daily salah tracking with Algerian prayer times', color: 'var(--primary)' },
                    { key: 'sport' as const, icon: <Dumbbell className="w-5 h-5" />, title: 'Sport & Exercise', desc: '20 push-ups, pull-ups, squats, abs daily + Friday 10km run', color: 'var(--success)' },
                    { key: 'food' as const, icon: <UtensilsCrossed className="w-5 h-5" />, title: 'Meal Preparation', desc: 'Plan and prep your meals each morning', color: 'var(--warning)' },
                    { key: 'learning' as const, icon: <BookOpen className="w-5 h-5" />, title: 'Daily Learning (30min)', desc: 'Stay updated in your field and interests', color: 'var(--accent)' },
                  ].map(m => (
                    <motion.button
                      key={m.key}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setModules(prev => ({ ...prev, [m.key]: !prev[m.key] }))}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        modules[m.key]
                          ? 'bg-[var(--primary)]/[0.04] border-[var(--primary)]/20'
                          : 'bg-[var(--background-surface)] border-[var(--border)] opacity-60'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${m.color}15`, color: m.color }}
                      >
                        {m.icon}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{m.title}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">{m.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        modules[m.key] ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border)]'
                      }`}>
                        {modules[m.key] && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          {error && <p className="text-xs text-[var(--danger)] mt-4">{error}</p>}
          <div className="flex justify-between mt-6 pt-4 border-t border-[var(--border)]">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(s => s - 1)}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => router.push('/')}>
                <ArrowLeft className="w-4 h-4" /> Login
              </Button>
            )}

            {step < totalSteps ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Start My Pulse</>}
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OnboardingForm />
      </AuthProvider>
    </ThemeProvider>
  );
}
