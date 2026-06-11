'use client';

import React, { useEffect, useRef, useState } from 'react';

import ProgressBar from '@/app/components/common/ProgressBar';
import SubmitButton from '@/app/components/common/SubmitButton';
import ImagePixelateQuestion from '@/app/components/quiz/questions/ImagePixelateQuestion';
import MultipleChoice from '@/app/components/quiz/questions/MultipleChoice';
import Ordering from '@/app/components/quiz/questions/Ordering';
import SingleChoice from '@/app/components/quiz/questions/SingleChoice';
import SliderQuestion from '@/app/components/quiz/questions/SliderQuestion';
import { TrueFalseQuestion } from '@/app/components/quiz/questions/TrueFalseQuestion';
import QuestionCard from '@/app/components/quiz/shared/QuestionCard';
import QuizLayout from '@/app/components/quiz/shared/QuizLayout';
import type { PlayState } from '@/app/play/storage';
import type { QuizChoiceAnswer, QuizImage } from '@/app/types';
import type { KqfQuestion } from '@/lib/kqf';
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

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

type ActiveQuestionProps = {
  question: KqfQuestion;
  questionNumber: number;
  total: number;
  answers: Record<string, unknown>;
  onAdvance: (value: unknown, timeFraction?: number) => void;
  onAnswerChange: (value: unknown) => void;
};

function ActiveQuestion({
  question: q,
  questionNumber,
  total,
  answers,
  onAdvance,
  onAnswerChange,
}: ActiveQuestionProps) {
  // Initialized once per mount (component remounts via key={q.id} in parent)
  const [remaining, setRemaining] = useState<number | null>(q.time_s ?? null);
  const onAdvanceRef = useRef(onAdvance);
  const answersRef = useRef(answers);
  // 0 until effect sets it; only read inside the interval callback
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  });

  useEffect(() => {
    answersRef.current = answers;
  });

  useEffect(() => {
    const timeS = q.time_s;
    if (!timeS) return;
    startTimeRef.current = Date.now();
    let active = true;
    let expiryTimeout: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const rem = Math.max(0, timeS - elapsed);
      setRemaining(rem);
      if (rem <= 0 && active) {
        active = false;
        clearInterval(interval);
        expiryTimeout = setTimeout(
          () => onAdvanceRef.current(answersRef.current[q.id]),
          0,
        );
      }
    }, 500);
    return () => {
      active = false;
      clearInterval(interval);
      if (expiryTimeout !== null) clearTimeout(expiryTimeout);
    };
  }, [q.id, q.time_s]);

  const timeDisplay = remaining === null ? '--:--' : formatTime(remaining);
  const progressPercent =
    q.time_s && remaining !== null ? (remaining / q.time_s) * 100 : 100;
  const qImage = questionImage(q.media);

  // Fraction (0..1) of this question's time still left right now. Computed fresh
  // from the start timestamp (not the throttled `remaining` state) so the value
  // recorded at submit is accurate. `undefined` when the question has no timer,
  // which scoring treats as "no time pressure" (full points).
  const remainingFraction = (): number | undefined => {
    const timeS = q.time_s;
    if (!timeS || !startTimeRef.current) {
      return undefined;
    }
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    return Math.max(0, Math.min(1, (timeS - elapsed) / timeS));
  };

  let questionEl: React.ReactNode = null;
  if (q.type === 'singlechoice') {
    questionEl = (
      <SingleChoice
        questionNumber={questionNumber}
        totalQuestions={total}
        time={timeDisplay}
        question={q.text}
        questionImage={qImage}
        answers={q.choices.map(choiceAnswer)}
        onSubmit={(idx) => onAdvance(idx)}
      />
    );
  } else if (q.type === 'multichoice') {
    questionEl = (
      <MultipleChoice
        questionNumber={questionNumber}
        totalQuestions={total}
        time={timeDisplay}
        question={q.text}
        questionImage={qImage}
        answers={q.choices.map(choiceAnswer)}
        onSubmit={(indices) => onAdvance(indices)}
      />
    );
  } else if (q.type === 'truefalse') {
    questionEl = (
      <QuizLayout
        questionNumber={questionNumber}
        totalQuestions={total}
        time={timeDisplay}
      >
        <QuestionCard question={q.text} hint={q.media?.hint} />
        <TrueFalseQuestion
          value={answers[q.id] as boolean | undefined}
          onChange={onAnswerChange}
        />
        <SubmitButton
          label={questionNumber === total ? 'Zakończ quiz' : 'Dalej'}
          disabled={answers[q.id] === undefined}
          onClick={() => {
            const v = answers[q.id];
            if (v === undefined) return;
            onAdvance(v);
          }}
        />
      </QuizLayout>
    );
  } else if (q.type === 'slider') {
    questionEl = (
      <SliderQuestion
        questionNumber={questionNumber}
        totalQuestions={total}
        time={timeDisplay}
        question={q.text}
        hint={q.media?.hint}
        min={q.min}
        max={q.max}
        step={q.step}
        defaultValue={(answers[q.id] as number | undefined) ?? q.min}
        unit={q.unit ?? ''}
        ticks={sliderTicks(q.min, q.max)}
        labelMin={q.label_min}
        labelMax={q.label_max}
        onSubmit={(n) => onAdvance(n)}
      />
    );
  } else if (q.type === 'ordering') {
    questionEl = (
      <Ordering
        questionNumber={questionNumber}
        totalQuestions={total}
        time={timeDisplay}
        question={q.text}
        hint={q.media?.hint}
        items={q.items}
        onSubmit={(order) => onAdvance(order)}
      />
    );
  } else if (q.type === 'imagepixelate' && qImage) {
    questionEl = (
      <ImagePixelateQuestion
        questionNumber={questionNumber}
        totalQuestions={total}
        time={timeDisplay}
        question={q.text}
        hint={q.media?.hint}
        imageUrl={qImage.url}
        answers={q.choices.map(choiceAnswer)}
        durationMs={q.time_s ? q.time_s * 1000 : undefined}
        onSubmit={(idx) => onAdvance(idx, remainingFraction())}
      />
    );
  }

  return (
    <>
      <ProgressBar percent={progressPercent} />
      {questionEl}
    </>
  );
}

type Props = {
  state: PlayState;
  onChange: (s: PlayState) => void;
  onFinish: (s: PlayState) => void;
};

export function PlayingShell({ state, onChange, onFinish }: Props) {
  const q = state.quiz.questions[state.currentQuestionIndex];
  const total = state.quiz.questions.length;
  const questionNumber = state.currentQuestionIndex + 1;

  const advance = (value: unknown, timeFraction?: number) => {
    const nextAnswers = { ...state.answers, [q.id]: value };
    const i = state.currentQuestionIndex + 1;
    const nextBase: PlayState = { ...state, answers: nextAnswers };
    if (timeFraction !== undefined) {
      nextBase.answerTimes = { ...state.answerTimes, [q.id]: timeFraction };
    }
    if (i >= state.quiz.questions.length) {
      onFinish(nextBase);
    } else {
      onChange({ ...nextBase, currentQuestionIndex: i });
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <ActiveQuestion
        key={q.id}
        question={q}
        questionNumber={questionNumber}
        total={total}
        answers={state.answers}
        onAdvance={advance}
        onAnswerChange={(v) =>
          onChange({ ...state, answers: { ...state.answers, [q.id]: v } })
        }
      />
    </div>
  );
}
