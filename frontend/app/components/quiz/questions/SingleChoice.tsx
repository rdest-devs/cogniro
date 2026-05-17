'use client';

import { useMemo, useState } from 'react';

import SubmitButton from '@/app/components/common/SubmitButton';
import type { QuizChoiceAnswer, QuizImage } from '@/app/types';
import { cn } from '@/lib/cn';

import ProgressiveQuizImage from '../shared/ProgressiveQuizImage';
import QuestionCard from '../shared/QuestionCard';
import QuizLayout from '../shared/QuizLayout';
import RadioAnswer from '../shared/RadioAnswer';

interface SingleChoiceProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  questionImage?: QuizImage;
  answers: Array<string | QuizChoiceAnswer>;
  onSubmit?: (selectedIndex: number) => void;
}

export default function SingleChoice({
  questionNumber,
  totalQuestions,
  time,
  question,
  questionImage,
  answers,
  onSubmit,
}: SingleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const groupAriaLabel = question.trim() || 'Wybór jednej odpowiedzi';
  const normalizedAnswers = useMemo(
    () =>
      answers.map((answer) =>
        typeof answer === 'string' ? { text: answer } : answer,
      ),
    [answers],
  );

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
    >
      <QuestionCard
        question={question}
        image={questionImage}
        imageLoading="eager"
      />

      <div
        className="flex flex-col gap-3"
        role="radiogroup"
        aria-label={groupAriaLabel}
      >
        {normalizedAnswers.map((answer, i) => {
          const hasImage = Boolean(answer.image);
          const label = answer.text?.trim() || `Odpowiedź ${i + 1}`;

          if (!hasImage) {
            return (
              <RadioAnswer
                key={`${i}-${label}`}
                label={label}
                selected={selected === i}
                onClick={() => setSelected(i)}
              />
            );
          }

          return (
            <button
              key={`${i}-${label}`}
              type="button"
              role="radio"
              aria-checked={selected === i}
              aria-label={label}
              onClick={() => setSelected(i)}
              className={cn(
                'cursor-pointer rounded-2xl border p-3 text-left transition-colors',
                selected === i
                  ? 'border-[var(--selected-border)] bg-[var(--selected-bg)]'
                  : 'border-[var(--border)] bg-[var(--card-bg)]',
              )}
            >
              <ProgressiveQuizImage
                thumbUrl={answer.image?.thumbUrl}
                fullUrl={
                  answer.image?.url?.trim() ||
                  answer.image?.thumbUrl?.trim() ||
                  ''
                }
                width={answer.image?.width}
                height={answer.image?.height}
                alt={answer.image?.alt || label}
                loading="lazy"
                className="w-full rounded-xl bg-white object-contain"
              />
              {answer.text?.trim() && (
                <p className="mt-2 text-sm font-medium text-[var(--text-dark)]">
                  {answer.text.trim()}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <SubmitButton
        label="Zatwierdź odpowiedź"
        onClick={() => selected !== null && onSubmit?.(selected)}
        disabled={selected === null}
      />
    </QuizLayout>
  );
}
