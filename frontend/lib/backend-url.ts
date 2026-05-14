/** Same backend origin as quiz-demo and admin quiz API; inlined at build time via NEXT_PUBLIC_. */
export function resolveBackendBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
}

export const BACKEND_BASE_URL = resolveBackendBaseUrl();

function normalizeApiBaseUrl(base: string): string {
  const trimmed = base.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}

export function joinApiUrl(base: string, path: string): string {
  const normalizedBase = normalizeApiBaseUrl(base);
  const normalizedPath = `/${path.replace(/^\/+/, '')}`;
  return `${normalizedBase}${normalizedPath}`;
}
