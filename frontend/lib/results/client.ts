import { z } from 'zod';

import { getStoredAdminToken } from '@/lib/admin-auth/client';
import { BACKEND_BASE_URL, joinApiUrl } from '@/lib/backend-url';

const filesSchema = z.array(
  z.object({
    filename: z.string(),
    quiz_id: z.string(),
    quiz_title: z.string(),
    session_started_at: z.string(),
    session_stopped_at: z.string(),
    score_count: z.number().int().nonnegative(),
  }),
);

async function fetchJson(path: string, init?: RequestInit): Promise<unknown> {
  const r = await fetch(joinApiUrl(BACKEND_BASE_URL, path), {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${getStoredAdminToken() ?? ''}`,
    },
  });
  if (!r.ok) {
    throw new Error(`${r.status}`);
  }
  if (r.status === 204) {
    return null;
  }
  const text = await r.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text) as unknown;
}

export async function listDates(): Promise<string[]> {
  return z.array(z.string()).parse(await fetchJson('admin/results'));
}

export async function listDay(date: string) {
  return filesSchema.parse(
    await fetchJson(`admin/results/${encodeURIComponent(date)}`),
  );
}

export async function readResult(date: string, file: string): Promise<unknown> {
  return fetchJson(
    `admin/results/${encodeURIComponent(date)}/${encodeURIComponent(file)}`,
  );
}

export async function deleteResult(date: string, file: string): Promise<void> {
  await fetchJson(
    `admin/results/${encodeURIComponent(date)}/${encodeURIComponent(file)}`,
    { method: 'DELETE' },
  );
}

export async function deleteDay(date: string): Promise<void> {
  await fetchJson(`admin/results/${encodeURIComponent(date)}`, {
    method: 'DELETE',
  });
}
