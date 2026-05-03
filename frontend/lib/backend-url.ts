/** Same backend origin as quiz-demo and admin quiz API; inlined at build time via NEXT_PUBLIC_. */
const configuredBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export const BACKEND_BASE_URL = configuredBackendUrl || 'http://127.0.0.1:8000';

export function joinApiUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = `/${path.replace(/^\/+/, '')}`;
  return `${normalizedBase}${normalizedPath}`;
}
