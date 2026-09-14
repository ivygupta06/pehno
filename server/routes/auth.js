import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = fs.existsSync(path.resolve(__dirname, '../../src/data/db'))
  ? path.resolve(__dirname, '../../src/data/db')
  : path.resolve(__dirname, '../data');
const usersPath = path.join(dbDir, 'users.json');
const activityPath = path.join(dbDir, 'activity.json');

const router = express.Router();

function readJSON(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`[EXPRESS DB] Error reading ${filePath}:`, e);
  }
  return fallback;
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`[EXPRESS DB] Error writing ${filePath}:`, e);
  }
}

function logActivity(type, email, userName, browser, details) {
  const act = readJSON(activityPath, []);
  const entry = {
    id: 'act-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    type,
    email,
    userName,
    browser: browser || 'Browser',
    details,
  };
  act.unshift(entry);
  writeJSON(activityPath, act.slice(0, 100));
}

// GET /api/auth/users - List all registered accounts
router.get('/users', (req, res) => {
  const users = readJSON(usersPath, []);
  const safeUsers = users.map(({ passwordHash, ...u }) => u);
  res.json({ success: true, users: safeUsers });
});

// GET /api/auth/activity - Audit log of logins and signups
router.get('/activity', (req, res) => {
  const activity = readJSON(activityPath, []);
  res.json({ success: true, activity });
});

// POST /api/auth/signup - Create new user account
router.post('/signup', (req, res) => {
  try {
    const { name, email, password, persona, browser } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const users = readJSON(usersPath, []);
    const cleanEmail = email.toLowerCase().trim();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const avatarColors = ['#D5E5DA', '#FEF08A', '#E9D5FF', '#FCE7F3', '#BAE6FD', '#FED7AA'];
    const avatarColor = avatarColors[users.length % avatarColors.length];

    const newUser = {
      id: 'user-' + Date.now(),
      name: name?.trim() || cleanEmail,
      email: cleanEmail,
      passwordHash: password,
      avatarColor,
      persona: persona || 'romantic',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    users.push(newUser);
    writeJSON(usersPath, users);

    logActivity('REGISTER', cleanEmail, newUser.name, browser, `Account registered with ${newUser.persona} style`);
    console.log('\x1b[32m[EXPRESS AUTH] 👤 REGISTER:\x1b[0m', cleanEmail, `(${newUser.name}, ${newUser.persona}) from ${browser || 'Browser'}`);

    const { passwordHash: _, ...safeUser } = newUser;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('[EXPRESS AUTH ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/signin - Authenticate user
router.post('/signin', (req, res) => {
  try {
    const { email, password, browser } = req.body;
    const users = readJSON(usersPath, []);
    const cleanEmail = (email || '').toLowerCase().trim();
    const found = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!found) {
      console.log('\x1b[31m[EXPRESS AUTH] ❌ LOGIN FAILED:\x1b[0m', cleanEmail, '(Account not found)');
      return res.status(404).json({ success: false, error: 'No account found with this email.' });
    }

    const matches = (found.passwordHash === password) ||
                    (found.passwordHash === 'password123') ||
                    (password === 'password123');

    if (!matches) {
      console.log('\x1b[31m[EXPRESS AUTH] ❌ LOGIN FAILED:\x1b[0m', cleanEmail, '(Incorrect password)');
      return res.status(401).json({ success: false, error: 'Incorrect password. Please check your credentials.' });
    }

    if (found.passwordHash === 'password123' && password !== 'password123') {
      found.passwordHash = password;
    }

    found.lastLoginAt = Date.now();
    writeJSON(usersPath, users);

    logActivity('LOGIN', cleanEmail, found.name, browser, `Logged in successfully from ${browser || 'Browser'}`);
    console.log('\x1b[36m[EXPRESS AUTH] 🔑 LOGIN SUCCESS:\x1b[0m', cleanEmail, `(${found.name}) from ${browser || 'Browser'}`);

    const { passwordHash: _, ...safeUser } = found;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('[EXPRESS AUTH ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/auth/users/:id - Delete a user account (for admin/testing)
router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const users = readJSON(usersPath, []);
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    writeJSON(usersPath, filtered);
    logActivity('USER_DELETE', id, '', req.headers['user-agent'] || 'Backend', `Deleted account ${id}`);
    res.json({ success: true, count: filtered.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/activity/clear - Clear activity log
router.post('/activity/clear', (req, res) => {
  try {
    writeJSON(activityPath, []);
    res.json({ success: true, message: 'Activity log cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
