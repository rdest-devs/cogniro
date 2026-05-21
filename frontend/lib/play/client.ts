import { BACKEND_BASE_URL, joinApiUrl } from '@/lib/backend-url';
import { type KqfQuiz, kqfQuizSchema } from '@/lib/kqf';

export type JoinResult =
  | { ok: true; quiz: KqfQuiz }
  | { ok: false; status: number };

export type SubmitResult =
  | { ok: true }
  | { ok: false; nicknameViolation: boolean };

export async function joinPlay(
  pin: string,
  nickname: string,
): Promise<JoinResult> {
  const r = await fetch(joinApiUrl(BACKEND_BASE_URL, `/play/${pin}/join`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  if (!r.ok) {
    return { ok: false, status: r.status };
  }
  let payload: unknown;
  try {
    payload = await r.json();
  } catch {
    return { ok: false, status: 502 };
  }
  const parsed = kqfQuizSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, status: 502 };
  }
  return { ok: true, quiz: parsed.data };
}

export async function submitPlay(
  pin: string,
  nickname: string,
  score: number,
): Promise<SubmitResult> {
  const r = await fetch(joinApiUrl(BACKEND_BASE_URL, `/play/${pin}/submit`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, score }),
  });
  if (r.ok) {
    return { ok: true };
  }
  if (r.status === 400) {
    try {
      const body = (await r.json()) as {
        detail?: { error?: string } | string;
      };
      const d = body?.detail;
      if (
        typeof d === 'object' &&
        d !== null &&
        'error' in d &&
        d.error === 'nickname_violation'
      ) {
        return { ok: false, nicknameViolation: true };
      }
    } catch {
      /* fallthrough */
    }
  }
  return { ok: false, nicknameViolation: false };
}
