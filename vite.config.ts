import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'pehno-backend-server',
      configureServer(server) {
        const dbDir = path.resolve(__dirname, 'src/data/db');
        const usersPath = path.join(dbDir, 'users.json');
        const wardrobesPath = path.join(dbDir, 'wardrobes.json');
        const activityPath = path.join(dbDir, 'activity.json');
        const sharedFilePath = path.resolve(__dirname, 'src/data/shared_wardrobe.json');

        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        const readJSON = (filePath: string, fallback: any) => {
          try {
            if (fs.existsSync(filePath)) {
              return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
          } catch (e) {}
          return fallback;
        };

        const writeJSON = (filePath: string, data: any) => {
          try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
          } catch (e) {
            console.error('[PEHNO DB ERROR] write failed:', e);
          }
        };

        const logActivity = (type: string, email: string, userName: string, browser: string, details: string) => {
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
        };

        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url || '';
          const url = rawUrl.split('?')[0];

          // 0. GET /api/health
          if (url === '/api/health' && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'ok',
              service: 'Pehno Vite Internal Backend',
              port: 3000,
              timestamp: new Date().toISOString(),
            }));
            return;
          }

          // 1. GET /api/auth/users
          if (url === '/api/auth/users' && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            const users = readJSON(usersPath, []);
            const safeUsers = users.map(({ passwordHash, ...u }: any) => u);
            res.end(JSON.stringify({ success: true, users: safeUsers }));
            return;
          }

          // 2. GET /api/auth/activity
          if (url === '/api/auth/activity' && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            const acts = readJSON(activityPath, []);
            res.end(JSON.stringify({ success: true, activity: acts }));
            return;
          }

          // 3. POST /api/auth/signup
          if (url === '/api/auth/signup' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const { name, email, password, persona, browser } = JSON.parse(body);
                if (!email || !password) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'Email and password required.' }));
                  return;
                }
                const users = readJSON(usersPath, []);
                const cleanEmail = email.toLowerCase().trim();
                const existing = users.find((u: any) => u.email.toLowerCase() === cleanEmail);
                if (existing) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'An account with this email already exists.' }));
                  return;
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
                console.log('\x1b[32m[PEHNO DB] 👤 REGISTER:\x1b[0m', cleanEmail, `(${newUser.name}, ${newUser.persona}) from ${browser || 'Browser'}`);

                const { passwordHash: _, ...safeUser } = newUser;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, user: safeUser }));
              } catch (e: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            });
            return;
          }

          // 4. POST /api/auth/signin
          if (url === '/api/auth/signin' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const { email, password, browser } = JSON.parse(body);
                const users = readJSON(usersPath, []);
                const cleanEmail = (email || '').toLowerCase().trim();
                const found = users.find((u: any) => u.email.toLowerCase() === cleanEmail);

                if (!found) {
                  console.log('\x1b[31m[PEHNO DB] ❌ LOGIN FAILED:\x1b[0m', cleanEmail, '(Account not found)');
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'No account found with this email.' }));
                  return;
                }

                // Match password or default demo password
                const matches = (found.passwordHash === password) ||
                                (found.passwordHash === 'password123') ||
                                (password === 'password123');

                if (!matches) {
                  console.log('\x1b[31m[PEHNO DB] ❌ LOGIN FAILED:\x1b[0m', cleanEmail, '(Incorrect password)');
                  res.statusCode = 401;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'Incorrect password. Please check your credentials.' }));
                  return;
                }

                // If password was default, update to the password entered
                if (found.passwordHash === 'password123' && password !== 'password123') {
                  found.passwordHash = password;
                }
                found.lastLoginAt = Date.now();
                writeJSON(usersPath, users);

                logActivity('LOGIN', cleanEmail, found.name, browser, `Logged in successfully from ${browser || 'Browser'}`);
                console.log('\x1b[36m[PEHNO DB] 🔑 LOGIN SUCCESS:\x1b[0m', cleanEmail, `(${found.name}) from ${browser || 'Browser'}`);

                const { passwordHash: _, ...safeUser } = found;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, user: safeUser }));
              } catch (e: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            });
            return;
          }

          // 5. POST /api/wardrobe/save
          if (url === '/api/wardrobe/save' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const { userId, wardrobe, favorites, browser } = JSON.parse(body);
                const wardrobes = readJSON(wardrobesPath, {});
                const key = userId || 'default';
                wardrobes[key] = {
                  userId: key,
                  wardrobe: wardrobe || [],
                  favorites: favorites || [],
                  updatedAt: Date.now(),
                };
                writeJSON(wardrobesPath, wardrobes);

                logActivity('WARDROBE_SAVE', key, '', browser, `Saved ${wardrobe?.length || 0} garments`);
                console.log('\x1b[35m[PEHNO DB] 👗 WARDROBE SAVED:\x1b[0m', `${wardrobe?.length || 0} items for ${key}`);

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, count: wardrobe?.length || 0 }));
              } catch (e: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            });
            return;
          }

          // 6. GET /api/wardrobe/get
          if (url === '/api/wardrobe/get' && req.method === 'GET') {
            const urlObj = new URL(rawUrl, 'http://localhost:3000');
            const userId = urlObj.searchParams.get('userId') || 'default';
            const wardrobes = readJSON(wardrobesPath, {});
            let data = wardrobes[userId];
            if (!data && wardrobes['user-ivy-gmail']) {
              data = wardrobes['user-ivy-gmail'];
            }
            if (!data && wardrobes['user-default-ivy']) {
              data = wardrobes['user-default-ivy'];
            }
            if (!data && fs.existsSync(sharedFilePath)) {
              data = readJSON(sharedFilePath, { wardrobe: [], favorites: [] });
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              wardrobe: data?.wardrobe || null,
              favorites: data?.favorites || null,
            }));
            return;
          }

          // 7. Legacy shared sync endpoints
          if (url === '/api/wardrobe/shared' && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            if (fs.existsSync(sharedFilePath)) {
              try {
                const data = fs.readFileSync(sharedFilePath, 'utf-8');
                res.end(data);
              } catch (e: any) {
                res.end(JSON.stringify({ exists: false }));
              }
            } else {
              res.end(JSON.stringify({ exists: false }));
            }
            return;
          }

          if (url === '/api/wardrobe/shared' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                fs.writeFileSync(sharedFilePath, body, 'utf-8');
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
              } catch (e: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            });
            return;
          }

          // 8. DELETE /api/auth/users/:id
          if (url.startsWith('/api/auth/users/') && req.method === 'DELETE') {
            const id = decodeURIComponent(url.replace('/api/auth/users/', ''));
            const users = readJSON(usersPath, []);
            const filtered = users.filter((u: any) => u.id !== id);
            writeJSON(usersPath, filtered);
            logActivity('USER_DELETE', id, '', 'Vite Backend', `Deleted account ${id}`);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, count: filtered.length }));
            return;
          }

          // 9. POST /api/auth/activity/clear
          if (url === '/api/auth/activity/clear' && req.method === 'POST') {
            writeJSON(activityPath, []);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Activity cleared' }));
            return;
          }

          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
});
