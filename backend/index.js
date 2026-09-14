import dotenv from 'dotenv'; dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './db.js';

import authRouter from './routes/auth.js';
import wardrobeRouter from './routes/wardrobe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Ensure database directory exists
const dbDir = fs.existsSync(path.resolve(__dirname, '../src/data/db'))
  ? path.resolve(__dirname, '../src/data/db')
  : path.resolve(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    // and any vercel.app domain or localhost in dev
    if (
      !origin ||
      origin.includes('localhost') ||
      origin.includes('vercel.app') ||
      origin.includes('pehno') // your custom domain if you add one later
    ) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now — tighten after deploy
    }
  },
  credentials: true,
}));

// Support up to 50MB payloads for base64 photo ingestion
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(`[HTTP] ${req.method} ${req.originalUrl} ${statusColor}${res.statusCode}\x1b[0m (${duration}ms)`);
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Pehno Standalone Backend',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Backend Admin Dashboard UI
app.get(['/', '/admin'], (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pehno Backend Control Center</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            serif: ['"Playfair Display"', 'serif'],
          },
          colors: {
            brand: {
              sage: '#8BA888',
              sagedark: '#4A6B48',
              charcoal: '#2D312E',
              cream: '#FDFCFA',
              card: '#F8F6F0',
            }
          }
        }
      }
    }
  </script>
  <style>
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .pulse-dot { animation: pulse-dot 2s infinite ease-in-out; }
  </style>
</head>
<body class="bg-[#F6F4EE] text-[#2D312E] min-h-screen font-sans antialiased p-4 sm:p-8">
  <div class="max-w-6xl mx-auto space-y-6">
    
    <!-- Top Navigation / Header -->
    <header class="bg-white rounded-3xl p-6 shadow-sm border border-stone-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D5E5DA] to-[#E9D5FF] flex items-center justify-center text-2xl shadow-sm">
          ✨
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="font-serif text-2xl font-bold tracking-tight text-brand-charcoal">Pehno Backend</h1>
            <span class="text-xs uppercase tracking-widest text-stone-400 font-semibold font-sans">पहनो Control Center</span>
          </div>
          <p class="text-xs text-stone-500 mt-0.5">Real-time user authentication, login audit logs & database monitor</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 text-xs">
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
          <span class="w-2 h-2 rounded-full bg-emerald-500 pulse-dot"></span>
          <span>Port ${PORT} Active</span>
        </div>
        <a href="http://localhost:3000" target="_blank" class="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold transition-all flex items-center gap-1.5 shadow-sm">
          <span>Open Pehno App</span>
          <span>↗</span>
        </a>
      </div>
    </header>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
        <div class="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Registered Users</div>
        <div id="stat-users" class="text-3xl font-extrabold text-stone-800">--</div>
        <div class="text-[11px] text-stone-500 mt-1">Stored in <code class="bg-stone-100 px-1 py-0.5 rounded text-stone-700">users.json</code></div>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
        <div class="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Total Audit Events</div>
        <div id="stat-activity" class="text-3xl font-extrabold text-purple-700">--</div>
        <div class="text-[11px] text-stone-500 mt-1">Logins, Signups & Syncs</div>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
        <div class="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Database Location</div>
        <div class="text-xs font-mono font-semibold text-emerald-800 truncate" title="${dbDir}">${dbDir}</div>
        <div class="flex items-center gap-2 mt-2">
          <a href="/api/auth/users" target="_blank" class="text-[11px] font-bold text-stone-600 hover:text-stone-900 underline">JSON Users</a>
          <span class="text-stone-300">•</span>
          <a href="/api/auth/activity" target="_blank" class="text-[11px] font-bold text-stone-600 hover:text-stone-900 underline">JSON Activity</a>
          <span class="text-stone-300">•</span>
          <a href="/api/health" target="_blank" class="text-[11px] font-bold text-stone-600 hover:text-stone-900 underline">Health</a>
        </div>
      </div>
    </div>

    <!-- Main Content Area: Users & Activity -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Registered Accounts Column (7 cols) -->
      <section class="lg:col-span-7 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-stone-800">Registered Accounts</h2>
            <span id="badge-users-count" class="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs font-bold">0</span>
          </div>
          <button onclick="refreshData()" class="text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1">
            <span id="refresh-icon">🔄</span> Refresh
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-stone-100 text-stone-400 font-bold uppercase text-[10px] tracking-wider">
                <th class="pb-3">User</th>
                <th class="pb-3">Persona</th>
                <th class="pb-3">Created</th>
                <th class="pb-3">Last Active</th>
                <th class="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody id="users-table-body" class="divide-y divide-stone-100 text-stone-700">
              <tr>
                <td colspan="5" class="py-8 text-center text-stone-400">Loading registered accounts...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Live Activity Stream Column (5 cols) -->
      <section class="lg:col-span-5 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-stone-800">Activity & Logins</h2>
            <span class="w-2 h-2 rounded-full bg-purple-500 pulse-dot"></span>
          </div>
          <button onclick="clearActivityLog()" class="text-[11px] font-semibold text-rose-500 hover:text-rose-700">
            Clear Log
          </button>
        </div>

        <div id="activity-feed" class="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
          <div class="py-8 text-center text-stone-400 text-xs">Loading activity stream...</div>
        </div>
      </section>

    </div>

    <!-- Footer Note -->
    <footer class="text-center text-xs text-stone-400 pt-2 pb-6">
      Pehno Backend Server &copy; 2026. Data persisted locally in <code class="bg-stone-200/60 px-1 py-0.5 rounded text-stone-600">${dbDir}</code>
    </footer>

  </div>

  <script>
    async function fetchUsers() {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      return data.users || [];
    }

    async function fetchActivity() {
      const res = await fetch('/api/auth/activity');
      const data = await res.json();
      return data.activity || [];
    }

    function timeAgo(ts) {
      if (!ts) return 'Never';
      const diff = Math.floor((Date.now() - Number(ts)) / 1000);
      if (diff < 60) return diff + 's ago';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      return new Date(Number(ts)).toLocaleDateString();
    }

    async function deleteUser(id, name) {
      if (!confirm('Are you sure you want to delete user "' + (name || id) + '"?')) return;
      try {
        const res = await fetch('/api/auth/users/' + encodeURIComponent(id), { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          refreshData();
        } else {
          alert('Delete failed: ' + (data.error || 'Unknown error'));
        }
      } catch (e) {
        alert('Network error deleting user.');
      }
    }

    async function clearActivityLog() {
      if (!confirm('Clear all audit logs?')) return;
      try {
        await fetch('/api/auth/activity/clear', { method: 'POST' });
        refreshData();
      } catch (e) {}
    }

    async function refreshData() {
      const icon = document.getElementById('refresh-icon');
      if (icon) icon.style.transform = 'rotate(180deg)';
      try {
        const [users, activities] = await Promise.all([fetchUsers(), fetchActivity()]);

        // Update stats
        document.getElementById('stat-users').innerText = users.length;
        document.getElementById('badge-users-count').innerText = users.length;
        document.getElementById('stat-activity').innerText = activities.length;

        // Render users table
        const tbody = document.getElementById('users-table-body');
        if (users.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-stone-400">No accounts created yet. Use the signup form in Pehno.</td></tr>';
        } else {
          tbody.innerHTML = users.map(u => {
            const avatarBg = u.avatarColor || '#D5E5DA';
            const initial = (u.name || 'U').charAt(0).toUpperCase();
            return '<tr class="hover:bg-stone-50/80 transition-colors">' +
              '<td class="py-3 pr-2 flex items-center gap-2.5">' +
                '<div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-stone-800 shadow-xs" style="background-color: ' + avatarBg + '">' +
                  initial +
                '</div>' +
                '<div>' +
                  '<div class="font-bold text-stone-900">' + (u.name || 'Anonymous') + '</div>' +
                  '<div class="text-[11px] text-stone-400">' + u.email + '</div>' +
                '</div>' +
              '</td>' +
              '<td class="py-3 pr-2">' +
                '<span class="px-2 py-0.5 rounded-md bg-stone-100 font-semibold text-[10px] uppercase text-stone-600">' +
                  (u.persona || 'Default') +
                '</span>' +
              '</td>' +
              '<td class="py-3 pr-2 text-stone-500 whitespace-nowrap">' + timeAgo(u.createdAt) + '</td>' +
              '<td class="py-3 pr-2 text-stone-700 font-medium whitespace-nowrap">' + timeAgo(u.lastLoginAt) + '</td>' +
              '<td class="py-3 text-right">' +
                '<button onclick="deleteUser(\\'' + u.id + '\\', \\'' + (u.name || '').replace(/'/g, "\\\\'") + '\\')" class="text-rose-500 hover:text-rose-700 p-1 font-semibold hover:bg-rose-50 rounded" title="Delete account">' +
                  '🗑' +
                '</button>' +
              '</td>' +
            '</tr>';
          }).join('');
        }

        // Render activity feed
        const feed = document.getElementById('activity-feed');
        if (activities.length === 0) {
          feed.innerHTML = '<div class="py-6 text-center text-stone-400 text-xs">No activity logged yet.</div>';
        } else {
          feed.innerHTML = activities.map(act => {
            const isLogin = act.type === 'LOGIN';
            const isReg = act.type === 'REGISTER';
            const badgeClass = isLogin ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                               isReg ? 'bg-blue-100 text-blue-800 border-blue-200' :
                               'bg-purple-100 text-purple-800 border-purple-200';
            return '<div class="p-3 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1">' +
              '<div class="flex items-center justify-between text-[11px]">' +
                '<div class="flex items-center gap-1.5">' +
                  '<span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold border ' + badgeClass + '">' + act.type + '</span>' +
                  '<span class="font-bold text-stone-800">' + act.email + '</span>' +
                '</div>' +
                '<span class="text-[10px] text-stone-400">' + timeAgo(act.timestamp) + '</span>' +
              '</div>' +
              '<div class="text-[11px] text-stone-500 flex items-center justify-between">' +
                '<span>' + (act.details || '') + '</span>' +
                '<span class="text-[10px] text-stone-400">' + (act.browser || 'Browser') + '</span>' +
              '</div>' +
            '</div>';
          }).join('');
        }
      } catch (err) {
        console.error('Error refreshing backend data:', err);
      } finally {
        if (icon) setTimeout(() => icon.style.transform = 'none', 300);
      }
    }

    // Initial load and live 3s poll
    refreshData();
    setInterval(refreshData, 3000);
  </script>
</body>
</html>`);
});

// Mount modular routes
app.use('/api/auth', authRouter);
app.use('/api/wardrobe', wardrobeRouter);

// Start server (connect to MongoDB first if configured)
async function startServer() {
  await connectDB();

  app.listen(PORT, '0.0.0.0', () => {
    const dbType = process.env.MONGODB_URI ? 'MongoDB Atlas' : 'JSON files (local)';
    console.log('\n\x1b[35m' + '='.repeat(48) + '\x1b[0m');
    console.log('\x1b[35m👗 PEHNO STANDALONE EXPRESS BACKEND ACTIVE\x1b[0m');
    console.log(`\x1b[36m📡 Server URL:\x1b[0m    http://localhost:${PORT}`);
    console.log(`\x1b[36m🏥 Health Check:\x1b[0m  http://localhost:${PORT}/api/health`);
    console.log(`\x1b[36m🗄️  Database:\x1b[0m     ${dbType}`);
    console.log('\x1b[35m' + '='.repeat(48) + '\x1b[0m\n');
  });
}

startServer();

export default app;
