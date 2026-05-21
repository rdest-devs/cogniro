import type { KqfQuiz } from '@/lib/kqf';

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

export function loadPlayState(
  s: Storage,
  code: string,
  nickname: string,
): PlayState | null {
  const raw = s.getItem(storageKey(code, nickname));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayState;
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
