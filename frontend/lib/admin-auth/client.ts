import { BACKEND_BASE_URL } from '@/lib/backend-url';

const ADMIN_TOKEN_STORAGE_KEY = 'cogniro_admin_token';

function joinApiUrl(path: string): string {
  const base = BACKEND_BASE_URL.endsWith('/')
    ? BACKEND_BASE_URL.slice(0, -1)
    : BACKEND_BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const token = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)?.trim();
    return token ? token : null;
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAdminToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

export async function loginAdmin(password: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const response = await fetch(joinApiUrl('/admin/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    let detail = 'login_failed';
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') {
        detail = body.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
}

export async function logoutAdmin(): Promise<void> {
  const token = getStoredAdminToken();
  try {
    if (token) {
      await fetch(joinApiUrl('/admin/auth/logout'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // still clear local session
  } finally {
    clearStoredAdminToken();
  }
}
