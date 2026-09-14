/**
 * One-time migration script: imports existing JSON files into MongoDB Atlas.
 * Run once after setting MONGODB_URI in .env:
 *   node backend/migrate.js
 */
import dotenv from 'dotenv'; dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import UserModel from './models/User.js';
import ActivityModel from './models/Activity.js';
import WardrobeModel from './models/Wardrobe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = fs.existsSync(path.resolve(__dirname, '../src/data/db'))
  ? path.resolve(__dirname, '../src/data/db')
  : path.resolve(__dirname, 'data');

function readJSON(file, fallback) {
  const p = path.join(dbDir, file);
  try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch (e) { console.error('Read error:', e.message); }
  return fallback;
}

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI is not set in .env. Aborting.');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB Atlas...');
  await mongoose.connect(uri, { dbName: 'Pehno' });
  console.log('✅ Connected!\n');

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = readJSON('users.json', []);
  if (users.length > 0) {
    let imported = 0, skipped = 0;
    for (const u of users) {
      try {
        await UserModel.findOneAndUpdate({ id: u.id }, u, { upsert: true });
        imported++;
      } catch (e) {
        console.warn(`  ⚠️  Skipped user ${u.email}:`, e.message);
        skipped++;
      }
    }
    console.log(`👤 Users:     ${imported} imported, ${skipped} skipped`);
  } else {
    console.log('👤 Users:     none found in JSON');
  }

  // ── Activity ───────────────────────────────────────────────────────────────
  const activities = readJSON('activity.json', []);
  if (activities.length > 0) {
    let imported = 0;
    for (const a of activities) {
      try { await ActivityModel.findOneAndUpdate({ id: a.id }, a, { upsert: true }); imported++; }
      catch (e) {}
    }
    console.log(`📋 Activity:  ${imported} entries imported`);
  } else {
    console.log('📋 Activity:  none found in JSON');
  }

  // ── Wardrobes ──────────────────────────────────────────────────────────────
  const wardrobes = readJSON('wardrobes.json', {});
  const entries = Object.values(wardrobes);
  if (entries.length > 0) {
    let imported = 0;
    for (const w of entries) {
      try {
        await WardrobeModel.findOneAndUpdate(
          { userId: w.userId },
          { userId: w.userId, wardrobe: w.wardrobe || [], favorites: w.favorites || [], updatedAt: w.updatedAt || Date.now() },
          { upsert: true }
        );
        imported++;
      } catch (e) {
        console.warn(`  ⚠️  Skipped wardrobe ${w.userId}:`, e.message);
      }
    }
    console.log(`👗 Wardrobes: ${imported} imported`);
  } else {
    console.log('👗 Wardrobes: none found in JSON');
  }

  console.log('\n🎉 Migration complete! You can now start the server with MONGODB_URI set.');
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
