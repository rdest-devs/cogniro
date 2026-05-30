import { BACKEND_BASE_URL, joinApiUrl } from '@/lib/backend-url';
import { type KqfQuiz, kqfQuizSchema } from '@/lib/kqf';

export type AvailabilityResult =
  | { available: true }
  | { available: false; status: number; detail?: string; opensAt?: string };

export async function checkPlayAvailability(
  pin: string,
): Promise<AvailabilityResult> {
  let r: Response;
  try {
    r = await fetch(joinApiUrl(BACKEND_BASE_URL, `/play/${pin}/check`), {
      method: 'GET',
    });
  } catch {
    return { available: false, status: 0 };
  }
  if (r.ok) return { available: true };
  try {
    const body = (await r.json()) as unknown;
    if (body && typeof body === 'object') {
      const detail = (body as Record<string, unknown>).detail;
      if (detail && typeof detail === 'object') {
        const d = detail as Record<string, unknown>;
        return {
          available: false,
          status: r.status,
          detail: typeof d.code === 'string' ? d.code : undefined,
          opensAt: typeof d.opens_at === 'string' ? d.opens_at : undefined,
        };
      }
      if (typeof detail === 'string') {
        return { available: false, status: r.status, detail };
      }
    }
  } catch {
    /* fallthrough */
  }
  return { available: false, status: r.status };
}

export type JoinResult =
  | { ok: true; quiz: KqfQuiz }
  | { ok: false; status: number; detail?: string; opensAt?: string };

export type SubmitResult =
  | { ok: true }
  | { ok: false; nicknameViolation: boolean };

export async function joinPlay(
  pin: string,
  nickname: string,
): Promise<JoinResult> {
  let r: Response;
  try {
    r = await fetch(joinApiUrl(BACKEND_BASE_URL, `/play/${pin}/join`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    });
  } catch {
    return { ok: false, status: 0 };
  }
  if (!r.ok) {
    try {
      const body = (await r.json()) as unknown;
      if (body && typeof body === 'object') {
        const detail = (body as Record<string, unknown>).detail;
        if (detail && typeof detail === 'object') {
          const d = detail as Record<string, unknown>;
          return {
            ok: false,
            status: r.status,
            detail:
              typeof d.code === 'string'
                ? d.code
                : typeof d.error === 'string'
                  ? d.error
                  : undefined,
            opensAt: typeof d.opens_at === 'string' ? d.opens_at : undefined,
          };
        }
        if (typeof detail === 'string') {
          return { ok: false, status: r.status, detail };
        }
      }
    } catch {
      /* fallthrough */
    }
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
  let r: Response;
  try {
    r = await fetch(joinApiUrl(BACKEND_BASE_URL, `/play/${pin}/submit`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, score }),
    });
  } catch {
    return { ok: false, nicknameViolation: false };
  }
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
