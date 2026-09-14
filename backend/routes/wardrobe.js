import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isMongoConnected } from '../db.js';
import WardrobeModel from '../models/Wardrobe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── JSON fallback paths ───────────────────────────────────────────────────────
const dbDir = fs.existsSync(path.resolve(__dirname, '../../src/data/db'))
  ? path.resolve(__dirname, '../../src/data/db')
  : path.resolve(__dirname, '../data');
const wardrobesPath = path.join(dbDir, 'wardrobes.json');

const router = express.Router();

function readJSON(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) { console.error(`[DB JSON] Read error ${filePath}:`, e); }
  return fallback;
}
function writeJSON(filePath, data) {
  try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8'); }
  catch (e) { console.error(`[DB JSON] Write error ${filePath}:`, e); }
}

// ── POST /api/wardrobe/save ───────────────────────────────────────────────────
router.post('/save', async (req, res) => {
  try {
    const { userId, wardrobe, favorites, browser } = req.body;
    const key = userId || 'default';

    if (isMongoConnected()) {
      await WardrobeModel.findOneAndUpdate(
        { userId: key },
        { userId: key, wardrobe: wardrobe || [], favorites: favorites || [], updatedAt: Date.now() },
        { upsert: true, new: true }
      );
    } else {
      const wardrobes = readJSON(wardrobesPath, {});
      wardrobes[key] = { userId: key, wardrobe: wardrobe || [], favorites: favorites || [], updatedAt: Date.now() };
      writeJSON(wardrobesPath, wardrobes);
    }

    console.log('\x1b[35m[WARDROBE] 👗 SAVED:\x1b[0m', `${wardrobe?.length || 0} items for ${key} from ${browser || 'Browser'}`);
    res.json({ success: true, count: wardrobe?.length || 0 });
  } catch (err) {
    console.error('[WARDROBE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/wardrobe/get ─────────────────────────────────────────────────────
router.get('/get', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';

    if (isMongoConnected()) {
      const data = await WardrobeModel.findOne({ userId }).lean();
      return res.json({
        success: true,
        wardrobe: data?.wardrobe || null,
        favorites: data?.favorites || null,
      });
    }

    const wardrobes = readJSON(wardrobesPath, {});
    const data = wardrobes[userId] || null;
    res.json({ success: true, wardrobe: data?.wardrobe || null, favorites: data?.favorites || null });
  } catch (err) {
    console.error('[WARDROBE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Legacy shared sync (kept for backward compatibility) ──────────────────────
router.get('/shared', (req, res) => {
  const sharedPath = path.resolve(__dirname, '../../src/data/shared_wardrobe.json');
  if (fs.existsSync(sharedPath)) {
    try { return res.type('json').send(fs.readFileSync(sharedPath, 'utf-8')); } catch (e) {}
  }
  res.json({ exists: false });
});

router.post('/shared', (req, res) => {
  const sharedPath = path.resolve(__dirname, '../../src/data/shared_wardrobe.json');
  try {
    fs.writeFileSync(sharedPath, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ success: true, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
