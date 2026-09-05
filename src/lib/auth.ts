import { User, StylePersona } from '../types/auth';

const USERS_KEY = 'pehno_registered_users_v1';
const SESSION_KEY = 'pehno_current_session_user_id_v1';

const DEFAULT_USER: User = {
  id: 'user-default-ivy',
  name: 'Ivy Gupta',
  email: 'ivy@pehno.style',
  avatarColor: '#D5E5DA', // Pastel Sage
  persona: 'romantic',
  createdAt: Date.now() - 86400000 * 7,
};

interface StoredUser extends User {
  passwordHash: string;
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

export function getCurrentUser(): User | null {
  try {
    const currentId = localStorage.getItem(SESSION_KEY);
    if (!currentId) {
      return null;
    }
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

export function signUp(name: string, email: string, password: string, persona: StylePersona = 'romantic'): User {
  const users = getStoredUsers();
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const avatarColors = ['#D5E5DA', '#FEF08A', '#E9D5FF', '#FCE7F3', '#BAE6FD', '#FED7AA'];
  const avatarColor = avatarColors[users.length % avatarColors.length];

  const newUser: StoredUser = {
    id: `user-${Date.now()}`,
    name: name.trim() || 'Fashion Lover',
    email: email.toLowerCase().trim(),
    avatarColor,
    persona,
    createdAt: Date.now(),
    passwordHash: password,
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, newUser.id);

  const { passwordHash: _, ...user } = newUser;
  return user;
}

export function signIn(email: string, password: string): User {
  const users = getStoredUsers();
  const cleanEmail = email.toLowerCase().trim();
  const found = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!found) {
    throw new Error('No account found with this email.');
  }

  if (found.passwordHash !== password) {
    throw new Error('Incorrect password. Please check your credentials.');
  }

  localStorage.setItem(SESSION_KEY, found.id);
  const { passwordHash: _, ...user } = found;
  return user;
}

export function signOut(): void {
  localStorage.removeItem(SESSION_KEY);
}
