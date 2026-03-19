'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light';

interface ThemeSchedule {
  enabled: boolean;
  lightFrom: string; // "HH:mm"
  darkFrom: string;  // "HH:mm"
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  schedule: ThemeSchedule;
  setSchedule: (s: ThemeSchedule) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  schedule: { enabled: false, lightFrom: '07:00', darkFrom: '20:00' },
  setSchedule: () => {},
});

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getScheduledTheme(schedule: ThemeSchedule): Theme {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const lightMin = timeToMinutes(schedule.lightFrom);
  const darkMin = timeToMinutes(schedule.darkFrom);
  if (lightMin < darkMin) {
    return nowMin >= lightMin && nowMin < darkMin ? 'light' : 'dark';
  }
  return nowMin >= lightMin || nowMin < darkMin ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [schedule, setScheduleState] = useState<ThemeSchedule>({
    enabled: false,
    lightFrom: '07:00',
    darkFrom: '20:00',
  });

  const applyTheme = useCallback((t: Theme) => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  useEffect(() => {
    const savedSchedule = localStorage.getItem('pulse:theme-schedule');
    if (savedSchedule) {
      try {
        const parsed = JSON.parse(savedSchedule) as ThemeSchedule;
        setScheduleState(parsed);
        if (parsed.enabled) {
          applyTheme(getScheduledTheme(parsed));
          return;
        }
      } catch { /* ignore */ }
    }
    const saved = localStorage.getItem('pulse:theme') as Theme;
    if (saved) applyTheme(saved);
  }, [applyTheme]);

  // Check schedule every minute
  useEffect(() => {
    if (!schedule.enabled) return;
    const interval = setInterval(() => {
      applyTheme(getScheduledTheme(schedule));
    }, 60_000);
    return () => clearInterval(interval);
  }, [schedule, applyTheme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('pulse:theme', next);
    // Disable schedule on manual toggle
    if (schedule.enabled) {
      const updated = { ...schedule, enabled: false };
      setScheduleState(updated);
      localStorage.setItem('pulse:theme-schedule', JSON.stringify(updated));
    }
  };

  const setSchedule = (s: ThemeSchedule) => {
    setScheduleState(s);
    localStorage.setItem('pulse:theme-schedule', JSON.stringify(s));
    if (s.enabled) {
      applyTheme(getScheduledTheme(s));
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, schedule, setSchedule }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
