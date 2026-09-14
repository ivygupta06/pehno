import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = fs.existsSync(path.resolve(__dirname, '../../src/data/db'))
  ? path.resolve(__dirname, '../../src/data/db')
  : path.resolve(__dirname, '../data');
const wardrobesPath = path.join(dbDir, 'wardrobes.json');
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

// POST /api/wardrobe/save - Save user closet & favorites
router.post('/save', (req, res) => {
  try {
    const { userId, wardrobe, favorites, browser } = req.body;
    const wardrobes = readJSON(wardrobesPath, {});
    const key = userId || 'default';

    wardrobes[key] = {
      userId: key,
      wardrobe: wardrobe || [],
      favorites: favorites || [],
      updatedAt: Date.now(),
    };
    writeJSON(wardrobesPath, wardrobes);

    console.log('\x1b[35m[EXPRESS WARDROBE] 👗 SAVED:\x1b[0m', `${wardrobe?.length || 0} items for ${key} from ${browser || 'Browser'}`);
    res.json({ success: true, count: wardrobe?.length || 0 });
  } catch (err) {
    console.error('[EXPRESS WARDROBE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wardrobe/get - Fetch user closet
router.get('/get', (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const wardrobes = readJSON(wardrobesPath, {});

    let data = wardrobes[userId];
    if (!data && wardrobes['user-ivy-gmail']) {
      data = wardrobes['user-ivy-gmail'];
    }
    if (!data && wardrobes['user-default-ivy']) {
      data = wardrobes['user-default-ivy'];
    }

    res.json({
      success: true,
      wardrobe: data?.wardrobe || null,
      favorites: data?.favorites || null,
    });
  } catch (err) {
    console.error('[EXPRESS WARDROBE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy shared sync endpoints for backward compatibility
router.get('/shared', (req, res) => {
  const sharedPath = path.resolve(__dirname, '../../src/data/shared_wardrobe.json');
  if (fs.existsSync(sharedPath)) {
    try {
      const data = fs.readFileSync(sharedPath, 'utf-8');
      return res.type('json').send(data);
    } catch (e) {}
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
