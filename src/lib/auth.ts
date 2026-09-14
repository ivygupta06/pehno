import { User, StylePersona } from '../types/auth';
import { apiUrl } from './api';

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

export function getCurrentUser(): User | null {
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
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
    const res = await fetch(apiUrl('/api/auth/signup'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanName, email: cleanEmail, password: cleanPassword, persona, browser }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Registration failed.');
    }
    const user: User = data.user;
    localStorage.setItem(SESSION_KEY, user.id);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));

    return user;
  } catch (err: any) {
    if (err instanceof TypeError) {
      throw new Error('Cannot reach the Pehno backend. Start the app with npm run dev and try again.');
    }
    throw err;
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  const browser = getBrowserName();
  const cleanEmail = email.toLowerCase().trim();
  const cleanPassword = password.trim();

  try {
    const res = await fetch(apiUrl('/api/auth/signin'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword, browser }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Authentication failed.');
    }
    const user: User = data.user;
    localStorage.setItem(SESSION_KEY, user.id);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));

    return user;
  } catch (err: any) {
    if (err instanceof TypeError) {
      throw new Error('Cannot reach the Pehno backend. Start the app with npm run dev and try again.');
    }
    throw err;
  }
}

export function signOut(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_CACHE_KEY);
}

export async function fetchServerUsers(): Promise<User[]> {
  try {
    const res = await fetch(apiUrl('/api/auth/users'));
    const data = await res.json();
    return data.users || [];
  } catch (e) {
    return [];
  }
}

export async function fetchServerActivity(): Promise<ServerActivity[]> {
  try {
    const res = await fetch(apiUrl('/api/auth/activity'));
    const data = await res.json();
    return data.activity || [];
  } catch (e) {
    return [];
  }
}

export async function deleteServerUser(userId: string): Promise<boolean> {
  try {
    const res = await fetch(apiUrl(`/api/auth/users/${encodeURIComponent(userId)}`), { method: 'DELETE' });
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    return false;
  }
}

export async function clearServerActivity(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/api/auth/activity/clear'), { method: 'POST' });
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
  if (!user) return false;

  if (user.role === 'creator' || user.role === 'admin') return true;

  const email = (user.email || '').toLowerCase().trim();

  // Only Ivy Gupta (the creator) gets admin access
  return email === 'ivygupta06@gmail.com' || 
         email === 'ivy@pehno.style' ||
         email === 'hersheysmilkshake@gmail.com';
}
