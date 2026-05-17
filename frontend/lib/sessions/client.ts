import { z } from 'zod';

import { getStoredAdminToken } from '@/lib/admin-auth/client';
import { BACKEND_BASE_URL, joinApiUrl } from '@/lib/backend-url';

const activateSchema = z.object({
  pin: z.string(),
  join_url: z.string(),
  started_at: z.string(),
});

const sessionParticipantSchema = z.object({
  nickname: z.string(),
  joined_at: z.string(),
  blocked: z.boolean(),
  has_submitted: z.boolean(),
  score: z.number().nullable(),
});

const sessionSnapshotSchema = z.object({
  pin: z.string(),
  started_at: z.string(),
  participants: z.array(sessionParticipantSchema),
});

const stopResponseSchema = z.object({
  date: z.string(),
  filename: z.string(),
});

async function adminFetch(path: string, init?: RequestInit): Promise<unknown> {
  const headers = new Headers(init?.headers);
  const token = getStoredAdminToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const r = await fetch(joinApiUrl(BACKEND_BASE_URL, path), {
    ...init,
    headers,
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

export async function activateQuiz(quizId: string) {
  return activateSchema.parse(
    await adminFetch(`admin/quiz/${encodeURIComponent(quizId)}/activate`, {
      method: 'POST',
    }),
  );
}

export async function stopQuiz(quizId: string) {
  return stopResponseSchema.parse(
    await adminFetch(`admin/quiz/${encodeURIComponent(quizId)}/stop`, {
      method: 'POST',
    }),
  );
}

export async function getSessionSnapshot(quizId: string) {
  return sessionSnapshotSchema.parse(
    await adminFetch(`admin/quiz/${encodeURIComponent(quizId)}/session`, {
      method: 'GET',
    }),
  );
}

export async function blockNickname(quizId: string, nickname: string) {
  await adminFetch(`admin/quiz/${encodeURIComponent(quizId)}/session/block`, {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  });
}
