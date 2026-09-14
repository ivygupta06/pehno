import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { isMongoConnected } from '../db.js';
import UserModel from '../models/User.js';
import ActivityModel from '../models/Activity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── JSON fallback paths (used when MongoDB is not connected) ──────────────────
const dbDir = fs.existsSync(path.resolve(__dirname, '../../src/data/db'))
  ? path.resolve(__dirname, '../../src/data/db')
  : path.resolve(__dirname, '../data');
const usersPath = path.join(dbDir, 'users.json');
const activityPath = path.join(dbDir, 'activity.json');

const router = express.Router();

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// ── JSON helpers (fallback only) ──────────────────────────────────────────────
function readJSON(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) { console.error(`[DB JSON] Read error ${filePath}:`, e); }
  return fallback;
}
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Password helpers ──────────────────────────────────────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (typeof storedPassword !== 'string' || !storedPassword) return false;
  const [algorithm, salt, expectedHash] = storedPassword.split('$');
  if (algorithm === 'scrypt' && salt && expectedHash) {
    const actualHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const expected = Buffer.from(expectedHash, 'hex');
    const actual = Buffer.from(actualHash, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }
  // Legacy plaintext fallback
  const expected = Buffer.from(storedPassword);
  const actual = Buffer.from(password);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeUser(user) {
  const obj = user?.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj._id;
  delete obj.__v;
  return obj;
}

// ── Activity logger (MongoDB or JSON) ────────────────────────────────────────
async function logActivity(type, email, userName, browser, details) {
  const entry = {
    id: 'act-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    type,
    email,
    userName,
    browser: browser || 'Browser',
    details,
  };

  if (isMongoConnected()) {
    await ActivityModel.create(entry);
    // Keep only latest 100
    const count = await ActivityModel.countDocuments();
    if (count > 100) {
      const oldest = await ActivityModel.find().sort({ timestamp: 1 }).limit(count - 100);
      await ActivityModel.deleteMany({ id: { $in: oldest.map(a => a.id) } });
    }
  } else {
    const act = readJSON(activityPath, []);
    act.unshift(entry);
    writeJSON(activityPath, act.slice(0, 100));
  }
}

// ── GET /api/auth/users ───────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  if (isMongoConnected()) {
    const users = await UserModel.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, users: users.map(u => { delete u.passwordHash; delete u._id; delete u.__v; return u; }) });
  }
  const users = readJSON(usersPath, []);
  res.json({ success: true, users: users.map(u => { const { passwordHash, ...safe } = u; return safe; }) });
});

// ── GET /api/auth/activity ────────────────────────────────────────────────────
router.get('/activity', async (req, res) => {
  if (isMongoConnected()) {
    const activity = await ActivityModel.find().sort({ timestamp: -1 }).limit(100).lean();
    return res.json({ success: true, activity: activity.map(a => { delete a._id; delete a.__v; return a; }) });
  }
  const activity = readJSON(activityPath, []);
  res.json({ success: true, activity });
});

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, persona, browser } = req.body;
    const cleanEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanPassword = typeof password === 'string' ? password : '';

    if (!cleanName || !cleanEmail || !cleanPassword)
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    if (!isValidEmail(cleanEmail))
      return res.status(400).json({ success: false, error: 'Enter a valid email address.' });
    if (cleanPassword.length < 8)
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });

    const avatarColors = ['#D5E5DA', '#FEF08A', '#E9D5FF', '#FCE7F3', '#BAE6FD', '#FED7AA'];

    if (isMongoConnected()) {
      const existing = await UserModel.findOne({ email: cleanEmail });
      if (existing)
        return res.status(409).json({ success: false, error: 'An account with this email already exists.' });

      const count = await UserModel.countDocuments();
      const newUser = await UserModel.create({
        id: crypto.randomUUID(),
        name: cleanName,
        email: cleanEmail,
        passwordHash: hashPassword(cleanPassword),
        avatarColor: avatarColors[count % avatarColors.length],
        persona: persona || 'romantic',
        role: 'user',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      });

      await logActivity('REGISTER', cleanEmail, newUser.name, browser, `Account registered with ${newUser.persona} style`);
      console.log('\x1b[32m[AUTH] 👤 REGISTER:\x1b[0m', cleanEmail, `(${newUser.name}, ${newUser.persona}) from ${browser || 'Browser'}`);
      return res.status(201).json({ success: true, user: safeUser(newUser) });
    }

    // JSON fallback
    const users = readJSON(usersPath, []);
    if (users.find(u => u.email?.toLowerCase() === cleanEmail))
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });

    const newUser = {
      id: crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashPassword(cleanPassword),
      avatarColor: avatarColors[users.length % avatarColors.length],
      persona: persona || 'romantic',
      role: 'user',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    users.push(newUser);
    writeJSON(usersPath, users);
    await logActivity('REGISTER', cleanEmail, newUser.name, browser, `Account registered with ${newUser.persona} style`);
    console.log('\x1b[32m[AUTH] 👤 REGISTER:\x1b[0m', cleanEmail, `(${newUser.name}) from ${browser || 'Browser'}`);
    const { passwordHash, ...safe } = newUser;
    res.status(201).json({ success: true, user: safe });
  } catch (err) {
    console.error('[AUTH ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/auth/signin ─────────────────────────────────────────────────────
router.post('/signin', async (req, res) => {
  try {
    const { email, password, browser } = req.body;
    const cleanEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const cleanPassword = typeof password === 'string' ? password : '';

    if (isMongoConnected()) {
      const user = await UserModel.findOne({ email: cleanEmail });
      if (!user || !verifyPassword(cleanPassword, user.passwordHash)) {
        console.log('\x1b[31m[AUTH] ❌ LOGIN FAILED:\x1b[0m', cleanEmail);
        return res.status(401).json({ success: false, error: 'Incorrect email or password.' });
      }
      // Upgrade legacy plaintext passwords to scrypt
      if (!user.passwordHash.startsWith('scrypt$')) {
        user.passwordHash = hashPassword(cleanPassword);
      }
      user.lastLoginAt = Date.now();
      await user.save();
      await logActivity('LOGIN', cleanEmail, user.name, browser, `Logged in from ${browser || 'Browser'}`);
      console.log('\x1b[36m[AUTH] 🔑 LOGIN:\x1b[0m', cleanEmail, `(${user.name}) from ${browser || 'Browser'}`);
      return res.json({ success: true, user: safeUser(user) });
    }

    // JSON fallback
    const users = readJSON(usersPath, []);
    const found = users.find(u => u.email?.toLowerCase() === cleanEmail);
    if (!cleanEmail || !cleanPassword || !found || !verifyPassword(cleanPassword, found.passwordHash)) {
      console.log('\x1b[31m[AUTH] ❌ LOGIN FAILED:\x1b[0m', cleanEmail);
      return res.status(401).json({ success: false, error: 'Incorrect email or password.' });
    }
    if (!found.passwordHash.startsWith('scrypt$')) found.passwordHash = hashPassword(cleanPassword);
    found.lastLoginAt = Date.now();
    writeJSON(usersPath, users);
    await logActivity('LOGIN', cleanEmail, found.name, browser, `Logged in from ${browser || 'Browser'}`);
    console.log('\x1b[36m[AUTH] 🔑 LOGIN:\x1b[0m', cleanEmail, `(${found.name}) from ${browser || 'Browser'}`);
    const { passwordHash, ...safe } = found;
    res.json({ success: true, user: safe });
  } catch (err) {
    console.error('[AUTH ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/auth/users/:id ────────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected()) {
      const deleted = await UserModel.findOneAndDelete({ id });
      if (!deleted) return res.status(404).json({ success: false, error: 'User not found' });
      await logActivity('USER_DELETE', deleted.email, deleted.name, 'Backend', `Deleted account ${id}`);
      return res.json({ success: true });
    }
    const users = readJSON(usersPath, []);
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return res.status(404).json({ success: false, error: 'User not found' });
    writeJSON(usersPath, filtered);
    res.json({ success: true, count: filtered.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/auth/activity/clear ────────────────────────────────────────────
router.post('/activity/clear', async (req, res) => {
  try {
    if (isMongoConnected()) {
      await ActivityModel.deleteMany({});
      return res.json({ success: true, message: 'Activity log cleared.' });
    }
    writeJSON(activityPath, []);
    res.json({ success: true, message: 'Activity log cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
