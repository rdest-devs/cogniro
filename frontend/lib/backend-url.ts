/** Same backend origin as quiz-demo and admin quiz API; inlined at build time via NEXT_PUBLIC_. */
export function resolveBackendBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
}

export const BACKEND_BASE_URL = resolveBackendBaseUrl();

export function joinApiUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = `/${path.replace(/^\/+/, '')}`;
  return `${normalizedBase}${normalizedPath}`;
}
