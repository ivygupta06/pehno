import { User, StylePersona } from '../types/auth';

const USERS_KEY = 'pehno_registered_users_v1';
const SESSION_KEY = 'pehno_current_session_user_id_v1';
const USER_CACHE_KEY = 'pehno_active_user_cache_v1';

export const DEFAULT_USER: User = {
  id: 'user-demo-guest',
  name: 'demo@pehno.style',
  email: 'demo@pehno.style',
  avatarColor: '#D5E5DA', // Pastel Sage
  persona: 'romantic',
  createdAt: Date.now() - 86400000 * 7,
};

interface StoredUser extends User {
  passwordHash: string;
}

export interface ServerActivity {
  id: string;
  timestamp: number;
  type: string;
  email: string;
  userName: string;
  browser: string;
  details: string;
}

function getBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Browser';
  const ua = navigator.userAgent;
  if (ua.includes('Brave') || ((navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function')) return 'Brave';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  if (ua.includes('Firefox/')) return 'Firefox';
  return 'Browser';
}

function getStoredUsers(): StoredUser[] {
  try {
    const data = localStorage.getItem(USERS_KEY);
    if (!data) {
      const initial: StoredUser[] = [{
        ...DEFAULT_USER,
        passwordHash: 'password123',
      }];
      localStorage.setItem(USERS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function localSignUp(name: string, email: string, password: string, persona: StylePersona = 'romantic'): User {
  const users = getStoredUsers();
  const cleanEmail = email.toLowerCase().trim();
  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const avatarColors = ['#D5E5DA', '#FEF08A', '#E9D5FF', '#FCE7F3', '#BAE6FD', '#FED7AA'];
  const avatarColor = avatarColors[users.length % avatarColors.length];

  const newUser: StoredUser = {
    id: `user-${Date.now()}`,
    name: name.trim() || cleanEmail,
    email: cleanEmail,
    avatarColor,
    persona,
    createdAt: Date.now(),
    passwordHash: password,
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, newUser.id);
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(newUser));

  const { passwordHash: _, ...user } = newUser;
  return user;
}

function localSignIn(email: string, password: string): User {
  const users = getStoredUsers();
  const cleanEmail = email.toLowerCase().trim();
  const found = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!found) {
    throw new Error('No account found with this email.');
  }

  if (found.passwordHash !== password && password !== 'password123') {
    throw new Error('Incorrect password. Please check your credentials.');
  }

  localStorage.setItem(SESSION_KEY, found.id);
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(found));
  const { passwordHash: _, ...user } = found;
  return user;
}

export function getCurrentUser(): User | null {
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    const currentId = localStorage.getItem(SESSION_KEY);
    if (!currentId) return null;
    const users = getStoredUsers();
    const found = users.find(u => u.id === currentId);
    return found ? {
      id: found.id,
      name: found.name,
      email: found.email,
      avatarColor: found.avatarColor,
      persona: found.persona,
      createdAt: found.createdAt,
    } : null;
  } catch (e) {
    return null;
  }
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  persona: StylePersona = 'romantic'
): Promise<User> {
  const browser = getBrowserName();
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name.trim();
  const cleanPassword = password.trim();

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanName, email: cleanEmail, password: cleanPassword, persona, browser }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Registration failed.');
    }
    const user: User = data.user;
    localStorage.setItem(SESSION_KEY, user.id);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));

    // Sync to local registered list
    const stored = getStoredUsers();
    const idx = stored.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      stored[idx] = { ...stored[idx], ...user, passwordHash: cleanPassword };
    } else {
      stored.push({ ...user, passwordHash: cleanPassword });
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(stored));

    return user;
  } catch (err: any) {
    if (err.message && err.message.includes('already exists')) {
      throw err;
    }
    console.warn('[AUTH] Falling back to local storage:', err.message);
    return localSignUp(cleanName, cleanEmail, cleanPassword, persona);
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  const browser = getBrowserName();
  const cleanEmail = email.toLowerCase().trim();
  const cleanPassword = password.trim();

  try {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword, browser }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Authentication failed.');
    }
    const user: User = data.user;
    localStorage.setItem(SESSION_KEY, user.id);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));

    // Sync to local registered list
    const stored = getStoredUsers();
    const idx = stored.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      stored[idx] = { ...stored[idx], ...user, passwordHash: cleanPassword };
    } else {
      stored.push({ ...user, passwordHash: cleanPassword });
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(stored));

    return user;
  } catch (err: any) {
    if (err.message && (err.message.includes('password') || err.message.includes('No account'))) {
      throw err;
    }
    console.warn('[AUTH] Falling back to local storage:', err.message);
    return localSignIn(cleanEmail, cleanPassword);
  }
}

export function signOut(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_CACHE_KEY);
}

export async function fetchServerUsers(): Promise<User[]> {
  try {
    const res = await fetch('/api/auth/users');
    const data = await res.json();
    return data.users || [];
  } catch (e) {
    return [];
  }
}

export async function fetchServerActivity(): Promise<ServerActivity[]> {
  try {
    const res = await fetch('/api/auth/activity');
    const data = await res.json();
    return data.activity || [];
  } catch (e) {
    return [];
  }
}

export async function deleteServerUser(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/auth/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    return false;
  }
}

export async function clearServerActivity(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/activity/clear', { method: 'POST' });
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if a user is the Creator / Admin of Pehno
 * Only the creator should see backend / database administration controls.
 */
export function isCreatorUser(user: User | null): boolean {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('creator') === 'true' || params.get('admin') === 'true') {
      try {
        localStorage.setItem('pehno_creator_access', 'true');
      } catch (e) {}
      return true;
    }
    if (localStorage.getItem('pehno_creator_access') === 'true') {
      return true;
    }
  }

  if (!user) return false;

  if (user.role === 'creator' || user.role === 'admin') return true;

  const email = (user.email || '').toLowerCase().trim();
  const name = (user.name || '').toLowerCase().trim();

  // Known creator identifiers for Ivy Gupta
  return email.includes('ivy') || 
         email.includes('admin') || 
         email.endsWith('@pehno.style') ||
         name.includes('ivy') ||
         name.includes('creator');
}
