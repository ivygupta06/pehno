/**
 * Returns the full URL for an API path.
 * In development, Vite proxies /api → localhost:5001 so we use relative paths.
 * In production (Vercel), we need to prefix with the Render backend URL.
 */
const BASE = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

export function apiUrl(path: string): string {
  // path should start with /api/...
  return `${BASE}${path}`;
}
