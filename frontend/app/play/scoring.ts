import type { KqfQuestion, KqfQuiz } from '@/lib/kqf';

export type AnswerMap = Record<string, unknown>;

export function calculateScore(quiz: KqfQuiz, answers: AnswerMap): number {
  return quiz.questions.reduce((sum, q) => sum + scoreOne(q, answers[q.id]), 0);
}

/** Sum of per-question points (each question has at least 1 in canonical KQF). */
export function maxScoreFromQuiz(quiz: KqfQuiz): number {
  return quiz.questions.reduce((sum, q) => sum + q.points, 0);
}

/** Whether the answer is fully correct for the question (ignores points weight). */
export function questionAnswerCorrect(
  q: KqfQuestion,
  answer: unknown,
): boolean {
  if (q.type === 'singlechoice' || q.type === 'imagepixelate') {
    const idx = typeof answer === 'number' ? answer : -1;
    return !!q.choices[idx]?.is_correct;
  }
  if (q.type === 'multichoice') {
    const picked = Array.isArray(answer)
      ? new Set(answer as number[])
      : new Set<number>();
    const correctSet = new Set(
      q.choices.map((c, i) => (c.is_correct ? i : -1)).filter((i) => i >= 0),
    );
    if (picked.size !== correctSet.size) {
      return false;
    }
    for (const i of correctSet) {
      if (!picked.has(i)) {
        return false;
      }
    }
    return true;
  }
  if (q.type === 'truefalse') {
    return answer === q.correct;
  }
  if (q.type === 'ordering') {
    const response = Array.isArray(answer) ? (answer as number[]) : [];
    return (
      response.length === q.correct_order.length &&
      response.every((v, i) => v === q.correct_order[i])
    );
  }
  // slider
  if (q.score === 'scale') return false;
  const v = typeof answer === 'number' ? answer : NaN;
  return (
    Number.isFinite(v) &&
    q.correct !== null &&
    Math.abs(v - q.correct) <= q.tolerance
  );
}

export function correctAnswerCount(quiz: KqfQuiz, answers: AnswerMap): number {
  return quiz.questions.reduce(
    (n, q) => n + (questionAnswerCorrect(q, answers[q.id]) ? 1 : 0),
    0,
  );
}

function scoreOne(q: KqfQuestion, answer: unknown): number {
  return questionAnswerCorrect(q, answer) ? q.points : 0;
}
