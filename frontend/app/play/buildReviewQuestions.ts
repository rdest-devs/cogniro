import type { AnswerMap } from '@/app/play/scoring';
import { questionAnswerCorrect } from '@/app/play/scoring';
import type { ReviewAnswer, ReviewQuestion } from '@/app/types';
import type { KqfQuestion, KqfQuiz } from '@/lib/kqf';

function reviewAnswersForQuestion(
  q: KqfQuestion,
  answer: unknown,
): ReviewAnswer[] {
  if (q.type === 'singlechoice' || q.type === 'imagepixelate') {
    const idx = typeof answer === 'number' ? answer : -1;
    return q.choices.map((c, i) => {
      const selected = i === idx;
      if (c.is_correct) {
        return {
          text: c.text,
          state: selected ? 'correct-selected' : 'correct',
          yourAnswer: selected,
        };
      }
      if (selected) {
        return { text: c.text, state: 'wrong-selected', yourAnswer: true };
      }
      return { text: c.text, state: 'neutral' };
    });
  }

  if (q.type === 'multichoice') {
    const picked = new Set(Array.isArray(answer) ? (answer as number[]) : []);
    return q.choices.map((c, i) => {
      const selected = picked.has(i);
      if (c.is_correct && selected) {
        return { text: c.text, state: 'correct-selected', yourAnswer: true };
      }
      if (c.is_correct && !selected) {
        return { text: c.text, state: 'correct' };
      }
      if (!c.is_correct && selected) {
        return { text: c.text, state: 'wrong-selected', yourAnswer: true };
      }
      return { text: c.text, state: 'neutral' };
    });
  }

  if (q.type === 'truefalse') {
    const user = typeof answer === 'boolean' ? answer : undefined;
    const prawdaSelected = user === true;
    const falszSelected = user === false;

    const prawdaState =
      q.correct === true
        ? prawdaSelected
          ? 'correct-selected'
          : 'correct'
        : prawdaSelected
          ? 'wrong-selected'
          : 'neutral';

    const falszState =
      q.correct === false
        ? falszSelected
          ? 'correct-selected'
          : 'correct'
        : falszSelected
          ? 'wrong-selected'
          : 'neutral';

    return [
      {
        text: 'Prawda',
        state: prawdaState,
        yourAnswer: prawdaSelected,
      },
      {
        text: 'Fałsz',
        state: falszState,
        yourAnswer: falszSelected,
      },
    ];
  }

  const v = typeof answer === 'number' ? answer : NaN;
  const ok = Number.isFinite(v) && Math.abs(v - q.correct) <= q.tolerance;
  const unit = q.unit?.trim();
  const suffix = unit ? ` ${unit}` : '';
  const userLabel = Number.isFinite(v) ? `${v}${suffix}` : 'Brak odpowiedzi';

  return [
    {
      text: `Twoja odpowiedź: ${userLabel}`,
      state: ok ? 'correct-selected' : 'wrong-selected',
      yourAnswer: true,
    },
    {
      text: `Wartość referencyjna: ${q.correct}${suffix} (±${q.tolerance})`,
      state: ok ? 'neutral' : 'correct',
    },
  ];
}

export function buildReviewQuestions(
  quiz: KqfQuiz,
  answers: AnswerMap,
): ReviewQuestion[] {
  return quiz.questions.map((q, index) => ({
    number: index + 1,
    text: q.text,
    isCorrect: questionAnswerCorrect(q, answers[q.id]),
    answers: reviewAnswersForQuestion(q, answers[q.id]),
  }));
}
