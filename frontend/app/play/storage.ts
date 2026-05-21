import { type KqfQuiz, kqfQuizSchema } from '@/lib/kqf';

export type PlayState = {
  quiz: KqfQuiz;
  currentQuestionIndex: number;
  answers: Record<string, unknown>;
  startedAt: string;
  submitted: boolean;
};

export function storageKey(code: string, nickname: string): string {
  return `cogniro:play:${code}:${nickname}:state`;
}

export function savePlayState(
  s: Storage,
  code: string,
  nickname: string,
  state: PlayState,
): void {
  s.setItem(storageKey(code, nickname), JSON.stringify(state));
}

function isPlayStateShape(o: unknown): o is PlayState {
  if (!o || typeof o !== 'object') return false;
  const r = o as Record<string, unknown>;
  return (
    typeof r.currentQuestionIndex === 'number' &&
    typeof r.startedAt === 'string' &&
    typeof r.submitted === 'boolean' &&
    r.answers !== null &&
    typeof r.answers === 'object' &&
    kqfQuizSchema.safeParse(r.quiz).success
  );
}

export function loadPlayState(
  s: Storage,
  code: string,
  nickname: string,
): PlayState | null {
  const raw = s.getItem(storageKey(code, nickname));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlayStateShape(parsed)) {
      s.removeItem(storageKey(code, nickname));
      return null;
    }
    return parsed;
  } catch {
    s.removeItem(storageKey(code, nickname));
    return null;
  }
}

export function clearPlayState(
  s: Storage,
  code: string,
  nickname: string,
): void {
  s.removeItem(storageKey(code, nickname));
}
