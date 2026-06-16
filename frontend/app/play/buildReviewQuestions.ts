import type { AnswerMap } from '@/app/play/scoring';
import { questionAnswerCorrect } from '@/app/play/scoring';
import type { QuizImage, ReviewAnswer, ReviewQuestion } from '@/app/types';
import type { KqfQuestion, KqfQuiz } from '@/lib/kqf';
import { resolveKqfPlayImageUrls } from '@/lib/media-url';

function reviewQuestionImage(media?: {
  image?: string;
}): QuizImage | undefined {
  const raw = media?.image?.trim();
  if (!raw) {
    return undefined;
  }

  const { fullUrl, thumbUrl } = resolveKqfPlayImageUrls(raw);
  return {
    assetId: '',
    url: fullUrl,
    thumbUrl,
    width: 0,
    height: 0,
    alt: '',
  };
}

function reviewChoiceImage(image?: string): QuizImage | undefined {
  const raw = image?.trim();
  if (!raw) {
    return undefined;
  }

  const { fullUrl, thumbUrl } = resolveKqfPlayImageUrls(raw);
  return {
    assetId: '',
    url: fullUrl,
    thumbUrl,
    width: 0,
    height: 0,
    alt: '',
  };
}

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
          image: reviewChoiceImage(c.image),
          state: selected ? 'correct-selected' : 'correct',
          yourAnswer: selected,
        };
      }
      if (selected) {
        return {
          text: c.text,
          image: reviewChoiceImage(c.image),
          state: 'wrong-selected',
          yourAnswer: true,
        };
      }
      return {
        text: c.text,
        image: reviewChoiceImage(c.image),
        state: 'neutral',
      };
    });
  }

  if (q.type === 'multichoice') {
    const picked = new Set(Array.isArray(answer) ? (answer as number[]) : []);
    return q.choices.map((c, i) => {
      const selected = picked.has(i);
      if (c.is_correct && selected) {
        return {
          text: c.text,
          image: reviewChoiceImage(c.image),
          state: 'correct-selected',
          yourAnswer: true,
        };
      }
      if (c.is_correct && !selected) {
        return {
          text: c.text,
          image: reviewChoiceImage(c.image),
          state: 'correct',
        };
      }
      if (!c.is_correct && selected) {
        return {
          text: c.text,
          image: reviewChoiceImage(c.image),
          state: 'wrong-selected',
          yourAnswer: true,
        };
      }
      return {
        text: c.text,
        image: reviewChoiceImage(c.image),
        state: 'neutral',
      };
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

  if (q.type === 'ordering') {
    const response = Array.isArray(answer) ? (answer as number[]) : [];
    return q.correct_order.map((correctIdx, position) => {
      const playerIdx = response[position];
      const correctAtPosition = playerIdx === correctIdx;
      const itemText =
        q.items[playerIdx ?? correctIdx] ?? `(pozycja ${position + 1})`;
      return {
        text: `${position + 1}. ${itemText}`,
        state: (correctAtPosition ? 'correct-selected' : 'wrong-selected') as
          | 'correct-selected'
          | 'wrong-selected',
        yourAnswer: playerIdx !== undefined,
      };
    });
  }

  // slider
  const v = typeof answer === 'number' ? answer : NaN;
  const unit = q.unit?.trim();
  const suffix = unit ? ` ${unit}` : '';
  const userLabel = Number.isFinite(v) ? `${v}${suffix}` : 'Brak odpowiedzi';

  if (q.score === 'scale') {
    return [
      {
        text: `Twoja odpowiedź: ${userLabel}`,
        state: 'neutral' as const,
        yourAnswer: true,
      },
    ];
  }

  const ok =
    Number.isFinite(v) &&
    q.correct !== null &&
    Math.abs(v - q.correct) <= q.tolerance;

  return [
    {
      text: `Twoja odpowiedź: ${userLabel}`,
      state: (ok ? 'correct-selected' : 'wrong-selected') as
        | 'correct-selected'
        | 'wrong-selected',
      yourAnswer: true,
    },
    {
      text: `Wartość referencyjna: ${q.correct}${suffix} (±${q.tolerance})`,
      state: (ok ? 'neutral' : 'correct') as 'neutral' | 'correct',
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
    image: reviewQuestionImage(q.media),
    isCorrect: questionAnswerCorrect(q, answers[q.id]),
    answers: reviewAnswersForQuestion(q, answers[q.id]),
  }));
}
