// Local storage utility for multi-user data persistence

const PREFIX = 'pulse';

function getKey(userId: string, module: string): string {
  return `${PREFIX}:${userId}:${module}`;
}

export function getFromStorage<T>(userId: string, module: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(getKey(userId, module));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(userId: string, module: string, data: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getKey(userId, module), JSON.stringify(data));
}

export function removeFromStorage(userId: string, module: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getKey(userId, module));
}

// User management
export function getAllUsers(): { id: string; name: string; email: string }[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${PREFIX}:users`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUser(user: { id: string; name: string; email: string }): void {
  if (typeof window === 'undefined') return;
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  localStorage.setItem(`${PREFIX}:users`, JSON.stringify(users));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
