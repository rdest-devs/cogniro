'use client';

import MultipleChoice from '@/app/components/quiz/questions/MultipleChoice';
import SingleChoice from '@/app/components/quiz/questions/SingleChoice';
import SliderQuestion from '@/app/components/quiz/questions/SliderQuestion';
import { TrueFalseQuestion } from '@/app/components/quiz/questions/TrueFalseQuestion';
import type { PlayState } from '@/app/play/storage';
import type { QuizImage } from '@/app/types';
import { resolveMediaUrl } from '@/lib/media-url';

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
  const url = resolveMediaUrl(raw);
  return {
    assetId: '',
    url,
    thumbUrl: url,
    width: 0,
    height: 0,
    alt: '',
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

  return (
    <section>
      <p className="text-sm text-zinc-500">
        Pytanie {state.currentQuestionIndex + 1} / {total}
      </p>
      <h2 className="text-xl font-semibold">{q.text}</h2>
      <div className="mt-4">
        {q.type === 'singlechoice' && (
          <SingleChoice
            key={q.id}
            questionNumber={state.currentQuestionIndex + 1}
            totalQuestions={total}
            time="--:--"
            question={q.text}
            questionImage={qImage}
            answers={q.choices.map((c) => c.text)}
            onSubmit={(idx) => advance(idx)}
          />
        )}
        {q.type === 'multichoice' && (
          <MultipleChoice
            key={q.id}
            questionNumber={state.currentQuestionIndex + 1}
            totalQuestions={total}
            time="--:--"
            question={q.text}
            questionImage={qImage}
            answers={q.choices.map((c) => c.text)}
            onSubmit={(indices) => advance(indices)}
          />
        )}
        {q.type === 'truefalse' && (
          <div className="mt-4 flex flex-col gap-4">
            <TrueFalseQuestion
              value={state.answers[q.id] as boolean | undefined}
              onChange={(v) =>
                onChange({
                  ...state,
                  answers: { ...state.answers, [q.id]: v },
                })
              }
            />
            <button
              type="button"
              disabled={state.answers[q.id] === undefined}
              className="w-fit rounded bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                const v = state.answers[q.id];
                if (v === undefined) {
                  return;
                }
                advance(v);
              }}
            >
              {state.currentQuestionIndex + 1 === total ? 'Zakończ' : 'Dalej'}
            </button>
          </div>
        )}
        {q.type === 'slider' && (
          <SliderQuestion
            key={q.id}
            playInline
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
    </section>
  );
}
