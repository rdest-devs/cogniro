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
  const quizResult = kqfQuizSchema.safeParse(r.quiz);
  if (!quizResult.success) return false;
  const idx = r.currentQuestionIndex;
  if (
    typeof idx !== 'number' ||
    !Number.isInteger(idx) ||
    idx < 0 ||
    idx >= quizResult.data.questions.length
  ) {
    return false;
  }
  return (
    typeof r.startedAt === 'string' &&
    typeof r.submitted === 'boolean' &&
    r.answers !== null &&
    typeof r.answers === 'object'
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
