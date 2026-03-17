const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pulse:token');
}

export function setToken(token: string) {
  localStorage.setItem('pulse:token', token);
}

export function clearToken() {
  localStorage.removeItem('pulse:token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth ──
export const api = {
  auth: {
    register: (data: {
      name: string; email: string; password: string;
      university?: string; field_of_study?: string; year?: number;
      clubs?: string[]; has_job?: boolean; job_title?: string;
      city?: string; interests?: string[];
      mod_prayer?: boolean; mod_sport?: boolean; mod_food?: boolean; mod_learning?: boolean;
    }) => request<{ token: string; user: Record<string, unknown> }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

    login: (email: string, password: string) =>
      request<{ token: string; user: Record<string, unknown> }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

    me: () => request<Record<string, unknown>>('/auth/me'),

    updateProfile: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),

    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ message: string }>('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
  },

  // ── Prayer ──
  prayer: {
    get: (date?: string) => request<Record<string, unknown>[]>(`/prayer${date ? `?date=${date}` : ''}`),
    upsert: (data: { date: string; prayer: string; completed: boolean; on_time?: boolean; time?: string }) =>
      request<Record<string, unknown>>('/prayer', { method: 'PUT', body: JSON.stringify(data) }),
    batchUpsert: (date: string, prayers: { prayer: string; completed: boolean; on_time?: boolean; time?: string }[]) =>
      request<Record<string, unknown>[]>('/prayer/batch', { method: 'PUT', body: JSON.stringify({ date, prayers }) }),
  },

  // ── Sport ──
  sport: {
    get: (date?: string) => request<Record<string, unknown>[]>(`/sport${date ? `?date=${date}` : ''}`),
    upsert: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/sport', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // ── Meals ──
  meals: {
    get: (date?: string) => request<Record<string, unknown>[]>(`/meals${date ? `?date=${date}` : ''}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/meals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/meals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/meals/${id}`, { method: 'DELETE' }),
    getPlan: (date?: string) => request<Record<string, unknown>[]>(`/meals/plan${date ? `?date=${date}` : ''}`),
    upsertPlan: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/meals/plan', { method: 'PUT', body: JSON.stringify(data) }),
    getWeekly: () => request<Record<string, unknown>[]>('/meals/weekly'),
    createWeekly: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/meals/weekly', { method: 'POST', body: JSON.stringify(data) }),
    deleteWeekly: (id: string) => request<{ message: string }>(`/meals/weekly/${id}`, { method: 'DELETE' }),
  },

  // ── Learning ──
  learning: {
    get: (params?: { date?: string; category?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<Record<string, unknown>[]>(`/learning${qs ? `?${qs}` : ''}`);
    },
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/learning', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/learning/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/learning/${id}`, { method: 'DELETE' }),
  },

  // ── Work ──
  work: {
    projects: {
      get: (category?: string) => request<Record<string, unknown>[]>(`/work/projects${category ? `?category=${category}` : ''}`),
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>('/work/projects', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/work/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => request<{ message: string }>(`/work/projects/${id}`, { method: 'DELETE' }),
    },
    tasks: {
      get: (params?: { category?: string; status?: string; project_id?: string }) => {
        const qs = new URLSearchParams(params as Record<string, string>).toString();
        return request<Record<string, unknown>[]>(`/work/tasks${qs ? `?${qs}` : ''}`);
      },
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>('/work/tasks', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/work/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => request<{ message: string }>(`/work/tasks/${id}`, { method: 'DELETE' }),
    },
    organize: (data: { name: string; description?: string }) =>
      request<{ category: string; description: string; suggested_tasks: { title: string; description: string; priority: string }[] }>(
        '/work/organize', { method: 'POST', body: JSON.stringify(data) }
      ),
  },

  // ── Study ──
  study: {
    courses: {
      get: () => request<Record<string, unknown>[]>('/study/courses'),
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>('/study/courses', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/study/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => request<{ message: string }>(`/study/courses/${id}`, { method: 'DELETE' }),
    },
    sessions: {
      get: (params?: { date?: string; course_id?: string }) => {
        const qs = new URLSearchParams(params as Record<string, string>).toString();
        return request<Record<string, unknown>[]>(`/study/sessions${qs ? `?${qs}` : ''}`);
      },
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>('/study/sessions', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/study/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => request<{ message: string }>(`/study/sessions/${id}`, { method: 'DELETE' }),
    },
  },

  // ── Finance ──
  finance: {
    get: (params?: { month?: string; type?: string; category?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<Record<string, unknown>[]>(`/finance${qs ? `?${qs}` : ''}`);
    },
    summary: (month?: string) => request<{ total_income: number; total_expenses: number; balance: number }>(`/finance/summary${month ? `?month=${month}` : ''}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/finance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/finance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/finance/${id}`, { method: 'DELETE' }),
  },

  // ── Tasks ──
  tasks: {
    get: (params?: { status?: string; category?: string; priority?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<Record<string, unknown>[]>(`/tasks${qs ? `?${qs}` : ''}`);
    },
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' }),
  },

  // ── Habits ──
  habits: {
    get: () => request<Record<string, unknown>[]>('/habits'),
    create: (data: { name: string; color?: string }) =>
      request<Record<string, unknown>>('/habits', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/habits/${id}`, { method: 'DELETE' }),
    logs: {
      get: (params?: { date?: string; habit_id?: string; from?: string; to?: string }) => {
        const qs = new URLSearchParams(params as Record<string, string>).toString();
        return request<Record<string, unknown>[]>(`/habits/logs${qs ? `?${qs}` : ''}`);
      },
      toggle: (data: { habit_id: string; date: string; completed: boolean }) =>
        request<Record<string, unknown>>('/habits/logs', { method: 'PUT', body: JSON.stringify(data) }),
    },
  },

  // ── Journal ──
  journal: {
    get: (params?: { mood?: string; from?: string; to?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<Record<string, unknown>[]>(`/journal${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => request<Record<string, unknown>>(`/journal/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/journal', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/journal/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/journal/${id}`, { method: 'DELETE' }),
  },

  // ── Goals ──
  goals: {
    get: (params?: { status?: string; category?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<Record<string, unknown>[]>(`/goals${qs ? `?${qs}` : ''}`);
    },
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/goals/${id}`, { method: 'DELETE' }),
    milestones: {
      create: (goalId: string, title: string) =>
        request<Record<string, unknown>>(`/goals/${goalId}/milestones`, { method: 'POST', body: JSON.stringify({ title }) }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/goals/milestones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => request<{ message: string }>(`/goals/milestones/${id}`, { method: 'DELETE' }),
    },
  },

  // ── Schedule ──
  schedule: {
    sync: () => request<{ synced: boolean; reason?: string; courses?: number }>('/schedule/sync', { method: 'POST' }),
    status: () => request<{ timetableUrl: string; lastSync: string | null; hasHash: boolean }>('/schedule/status'),
  },

  // ── Ideas ──
  ideas: {
    get: (status?: string) => request<Record<string, unknown>[]>(`/ideas${status ? `?status=${status}` : ''}`),
    getById: (id: string) => request<Record<string, unknown>>(`/ideas/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/ideas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/ideas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/ideas/${id}`, { method: 'DELETE' }),
    generate: (description: string) =>
      request<{ description: string; tasks: { title: string; done: boolean }[]; materials: { name: string; category: string; note: string }[]; extra_features: { title: string; description: string }[] }>(
        '/ideas/generate', { method: 'POST', body: JSON.stringify({ description }) }
      ),
  },

  // ── Friends ──
  friends: {
    get: () => request<Record<string, unknown>[]>('/friends'),
    getById: (id: string) => request<Record<string, unknown>>(`/friends/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/friends', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/friends/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/friends/${id}`, { method: 'DELETE' }),
    organizeSkills: (raw: string) =>
      request<{ skills: string[] }>('/friends/organize-skills', { method: 'POST', body: JSON.stringify({ raw }) }),
  },

  // ── Assistant ──
  assistant: {
    chat: (message: string, history?: { role: string; content: string }[]) =>
      request<{ reply: string }>('/assistant/chat', { method: 'POST', body: JSON.stringify({ message, history }) }),
    suggest: () => request<{ suggestion: string }>('/assistant/suggest'),
  },

  // ── Calendar ──
  calendar: {
    get: (month?: string) => request<Record<string, unknown>[]>(`/calendar${month ? `?month=${month}` : ''}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>('/calendar', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/calendar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/calendar/${id}`, { method: 'DELETE' }),
    islamicHolidays: (year: number) =>
      request<{ date: string; title: string }[]>(`/calendar/islamic?year=${year}`),
    birthdays: (year: number) =>
      request<{ date: string; title: string; relationship: string; friendId: string }[]>(`/calendar/birthdays?year=${year}`),
  },
};
