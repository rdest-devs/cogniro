'use client';

import { useMemo, useState } from 'react';

import SubmitButton from '@/app/components/common/SubmitButton';
import type { QuizChoiceAnswer, QuizImage } from '@/app/types';
import { cn } from '@/lib/cn';
import { resolveMediaUrl } from '@/lib/media-url';

import CheckboxAnswer from '../shared/CheckboxAnswer';
import QuestionCard from '../shared/QuestionCard';
import QuizLayout from '../shared/QuizLayout';

interface MultipleChoiceProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  hint?: string;
  questionImage?: QuizImage;
  answers: Array<string | QuizChoiceAnswer>;
  onSubmit?: (selectedIndices: number[]) => void;
}

export default function MultipleChoice({
  questionNumber,
  totalQuestions,
  time,
  question,
  hint,
  questionImage,
  answers,
  onSubmit,
}: MultipleChoiceProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const normalizedAnswers = useMemo(
    () =>
      answers.map((answer) =>
        typeof answer === 'string' ? { text: answer } : answer,
      ),
    [answers],
  );

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
    >
      <QuestionCard
        question={question}
        hint={hint}
        image={questionImage}
        imageLoading="eager"
      />

      <div className="flex flex-col gap-3">
        {normalizedAnswers.map((answer, i) => {
          const hasImage = Boolean(answer.image);
          const label = answer.text?.trim() || `Odpowiedź ${i + 1}`;

          if (!hasImage) {
            return (
              <CheckboxAnswer
                key={`${i}-${label}`}
                label={label}
                selected={selected.has(i)}
                onClick={() => toggle(i)}
              />
            );
          }

          return (
            <button
              key={`${i}-${label}`}
              type="button"
              onClick={() => toggle(i)}
              className={cn(
                'cursor-pointer rounded-2xl border p-3 text-left transition-colors',
                selected.has(i)
                  ? 'border-[var(--selected-border)] bg-[var(--selected-bg)]'
                  : 'border-[var(--border)] bg-[var(--card-bg)]',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveMediaUrl(answer.image?.thumbUrl ?? '')}
                width={answer.image?.width}
                height={answer.image?.height}
                alt={answer.image?.alt || label}
                loading="lazy"
                decoding="async"
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
        onClick={() => onSubmit?.(Array.from(selected))}
        disabled={selected.size === 0}
      />
    </QuizLayout>
  );
}
