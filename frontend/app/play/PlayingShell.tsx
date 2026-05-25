'use client';

import SubmitButton from '@/app/components/common/SubmitButton';
import MultipleChoice from '@/app/components/quiz/questions/MultipleChoice';
import SingleChoice from '@/app/components/quiz/questions/SingleChoice';
import SliderQuestion from '@/app/components/quiz/questions/SliderQuestion';
import { TrueFalseQuestion } from '@/app/components/quiz/questions/TrueFalseQuestion';
import QuestionCard from '@/app/components/quiz/shared/QuestionCard';
import QuizLayout from '@/app/components/quiz/shared/QuizLayout';
import type { PlayState } from '@/app/play/storage';
import type { QuizChoiceAnswer, QuizImage } from '@/app/types';
import { resolveKqfPlayImageUrls } from '@/lib/media-url';

function sliderTicks(min: number, max: number): number[] {
  if (min === max) {
    return [min];
  }
  const mid = Math.round((min + max) / 2);
  return [min, mid, max];
}

function questionImage(media?: { image?: string }): QuizImage | undefined {
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

function choiceAnswer(c: {
  text: string;
  image?: string;
}): string | QuizChoiceAnswer {
  const raw = c.image?.trim();
  if (!raw) {
    return c.text;
  }
  const { fullUrl, thumbUrl } = resolveKqfPlayImageUrls(raw);
  return {
    text: c.text,
    image: {
      assetId: '',
      url: fullUrl,
      thumbUrl,
      width: 0,
      height: 0,
      alt: '',
    },
  };
}

type Props = {
  state: PlayState;
  onChange: (s: PlayState) => void;
  onFinish: (s: PlayState) => void;
};

export function PlayingShell({ state, onChange, onFinish }: Props) {
  const q = state.quiz.questions[state.currentQuestionIndex];
  const total = state.quiz.questions.length;
  const qImage = questionImage(q.media);

  const advance = (value: unknown) => {
    const nextAnswers = { ...state.answers, [q.id]: value };
    const i = state.currentQuestionIndex + 1;
    const nextBase: PlayState = { ...state, answers: nextAnswers };
    if (i >= state.quiz.questions.length) {
      onFinish(nextBase);
    } else {
      onChange({ ...nextBase, currentQuestionIndex: i });
    }
  };

  const questionNumber = state.currentQuestionIndex + 1;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {q.type === 'singlechoice' && (
        <SingleChoice
          key={q.id}
          questionNumber={questionNumber}
          totalQuestions={total}
          time="--:--"
          question={q.text}
          questionImage={qImage}
          answers={q.choices.map(choiceAnswer)}
          onSubmit={(idx) => advance(idx)}
        />
      )}
      {q.type === 'multichoice' && (
        <MultipleChoice
          key={q.id}
          questionNumber={questionNumber}
          totalQuestions={total}
          time="--:--"
          question={q.text}
          questionImage={qImage}
          answers={q.choices.map(choiceAnswer)}
          onSubmit={(indices) => advance(indices)}
        />
      )}
      {q.type === 'truefalse' && (
        <QuizLayout
          key={q.id}
          questionNumber={questionNumber}
          totalQuestions={total}
          time="--:--"
        >
          <QuestionCard question={q.text} hint={q.media?.hint} />
          <TrueFalseQuestion
            value={state.answers[q.id] as boolean | undefined}
            onChange={(v) =>
              onChange({
                ...state,
                answers: { ...state.answers, [q.id]: v },
              })
            }
          />
          <SubmitButton
            label={
              state.currentQuestionIndex + 1 === total
                ? 'Zakończ quiz'
                : 'Dalej'
            }
            disabled={state.answers[q.id] === undefined}
            onClick={() => {
              const v = state.answers[q.id];
              if (v === undefined) {
                return;
              }
              advance(v);
            }}
          />
        </QuizLayout>
      )}
      {q.type === 'slider' && (
        <SliderQuestion
          key={q.id}
          questionNumber={questionNumber}
          totalQuestions={total}
          time="--:--"
          question={q.text}
          hint={q.media?.hint}
          min={q.min}
          max={q.max}
          step={q.step}
          defaultValue={(state.answers[q.id] as number | undefined) ?? q.min}
          unit={q.unit ?? ''}
          ticks={sliderTicks(q.min, q.max)}
          onSubmit={(n) => advance(n)}
        />
      )}
    </div>
  );
}
