import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Express is the single backend implementation. Vite proxies local API calls
// to it, so sign-up, login, and wardrobe data share one persistent database.
export default defineConfig({
  plugins: [react()],
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
