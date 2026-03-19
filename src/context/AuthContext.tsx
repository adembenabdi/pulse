'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile } from '@/types';
import { api, setToken, clearToken } from '@/lib/api';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: {
    name: string; email: string; password: string;
    university?: string; field_of_study?: string; year?: number;
    clubs?: string[]; has_job?: boolean; job_title?: string;
    city?: string; interests?: string[];
    mod_prayer?: boolean; mod_sport?: boolean; mod_food?: boolean; mod_learning?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ ok: false }),
  register: async () => ({ ok: false }),
  updateProfile: async () => {},
  logout: () => {},
});

function mapDbUser(raw: Record<string, unknown>): UserProfile {
  return {
    id: raw.id as string,
    name: raw.name as string,
    email: raw.email as string,
    university: (raw.university as string) || '',
    field: (raw.field_of_study as string) || '',
    year: (raw.year as number) || 1,
    clubs: (raw.clubs as string[]) || [],
    hasJob: (raw.has_job as boolean) || false,
    jobTitle: (raw.job_title as string) || undefined,
    city: (raw.city as string) || 'Algiers',
    timetableUrl: (raw.timetable_url as string) || '',
    interests: (raw.interests as string[]) || [],
    modules: {
      prayer: raw.mod_prayer !== false,
      sport: raw.mod_sport !== false,
      food: raw.mod_food !== false,
      learning: raw.mod_learning !== false,
    },
    telegramChatId: (raw.telegram_chat_id as string) || undefined,
    telegramUsername: (raw.telegram_username as string) || undefined,
    telegramNotifications: (raw.telegram_notifications as UserProfile['telegramNotifications']) || undefined,
    dashboardWidgets: (raw.dashboard_widgets as UserProfile['dashboardWidgets']) || undefined,
    themeSchedule: (raw.theme_schedule as UserProfile['themeSchedule']) || undefined,
    createdAt: (raw.created_at as string) || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from saved token
  useEffect(() => {
    const token = localStorage.getItem('pulse:token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.auth.me()
      .then((raw) => setUser(mapDbUser(raw)))
      .catch(() => { clearToken(); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { token, user: raw } = await api.auth.login(email, password);
      setToken(token);
      setUser(mapDbUser(raw));
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: (err as Error).message };
    }
  }, []);

  const register = useCallback(async (data: Parameters<AuthContextType['register']>[0]) => {
    try {
      const { token, user: raw } = await api.auth.register(data);
      setToken(token);
      setUser(mapDbUser(raw));
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: (err as Error).message };
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.university !== undefined) payload.university = updates.university;
    if (updates.field !== undefined) payload.field_of_study = updates.field;
    if (updates.year !== undefined) payload.year = updates.year;
    if (updates.clubs !== undefined) payload.clubs = updates.clubs;
    if (updates.hasJob !== undefined) payload.has_job = updates.hasJob;
    if (updates.jobTitle !== undefined) payload.job_title = updates.jobTitle;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.timetableUrl !== undefined) payload.timetable_url = updates.timetableUrl;
    if (updates.interests !== undefined) payload.interests = updates.interests;
    if (updates.modules) {
      payload.mod_prayer = updates.modules.prayer;
      payload.mod_sport = updates.modules.sport;
      payload.mod_food = updates.modules.food;
      payload.mod_learning = updates.modules.learning;
    }
    if (updates.telegramNotifications !== undefined) payload.telegram_notifications = updates.telegramNotifications;
    if (updates.dashboardWidgets !== undefined) payload.dashboard_widgets = updates.dashboardWidgets;
    if (updates.themeSchedule !== undefined) payload.theme_schedule = updates.themeSchedule;

    const raw = await api.auth.updateProfile(payload);
    setUser(mapDbUser(raw));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearToken();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      updateProfile,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
