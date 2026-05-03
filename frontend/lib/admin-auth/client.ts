import { BACKEND_BASE_URL, joinApiUrl } from '@/lib/backend-url';

/** In-memory only; never persist admin access tokens (e.g. localStorage). */
let adminAccessToken: string | null = null;

export function getStoredAdminToken(): string | null {
  return adminAccessToken;
}

export function setStoredAdminToken(token: string): void {
  const trimmed = token.trim();
  adminAccessToken = trimmed ? trimmed : null;
}

export function clearStoredAdminToken(): void {
  adminAccessToken = null;
}

export async function loginAdmin(password: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const response = await fetch(
    joinApiUrl(BACKEND_BASE_URL, 'admin/auth/login'),
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    },
  );

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

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  setStoredAdminToken(payload.access_token);
  return payload;
}

export async function refreshAdminToken(): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const response = await fetch(
    joinApiUrl(BACKEND_BASE_URL, 'admin/auth/refresh'),
    {
      method: 'POST',
      credentials: 'include',
    },
  );
  if (!response.ok) {
    clearStoredAdminToken();
    let detail = 'refresh_failed';
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

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  setStoredAdminToken(payload.access_token);
  return payload;
}

export async function logoutAdmin(): Promise<void> {
  const token = getStoredAdminToken();
  try {
    if (token) {
      await fetch(joinApiUrl(BACKEND_BASE_URL, 'admin/auth/logout'), {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // still clear local session
  } finally {
    clearStoredAdminToken();
  }
}
