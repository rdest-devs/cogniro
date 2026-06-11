'use client';

import { useMemo } from 'react';

import type { QuizChoiceAnswer } from '@/app/types';
import { cn } from '@/lib/cn';

import ProgressiveQuizImage from './ProgressiveQuizImage';
import RadioAnswer from './RadioAnswer';

interface SingleSelectAnswersProps {
  /** Plain-text answers or `{ text, image }` choices; images are rendered when present. */
  answers: Array<string | QuizChoiceAnswer>;
  selected: number | null;
  onSelect: (index: number) => void;
  groupAriaLabel: string;
}

/**
 * Single-select (radio) answer list shared by SingleChoice and ImagePixelateQuestion.
 * Renders a text radio row when a choice has no image, or an image card (with optional
 * caption) when it does. Selection state is owned by the parent.
 */
export default function SingleSelectAnswers({
  answers,
  selected,
  onSelect,
  groupAriaLabel,
}: SingleSelectAnswersProps) {
  const normalizedAnswers = useMemo(
    () =>
      answers.map((answer) =>
        typeof answer === 'string' ? { text: answer } : answer,
      ),
    [answers],
  );

  return (
    <div
      className="flex flex-col gap-3"
      role="radiogroup"
      aria-label={groupAriaLabel}
    >
      {normalizedAnswers.map((answer, i) => {
        const imageUrl = answer.image?.url?.trim();
        const imageThumbUrl = answer.image?.thumbUrl?.trim();
        const hasImage = Boolean(imageUrl || imageThumbUrl);
        const label = answer.text?.trim() || `Odpowiedź ${i + 1}`;

        if (!hasImage) {
          return (
            <RadioAnswer
              key={`${i}-${label}`}
              label={label}
              selected={selected === i}
              onClick={() => onSelect(i)}
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
            onClick={() => onSelect(i)}
            className={cn(
              'cursor-pointer rounded-2xl border p-3 text-left transition-colors',
              selected === i
                ? 'border-[var(--selected-border)] bg-[var(--selected-bg)]'
                : 'border-[var(--border)] bg-[var(--card-bg)]',
            )}
          >
            <ProgressiveQuizImage
              thumbUrl={imageThumbUrl}
              fullUrl={imageUrl || imageThumbUrl || ''}
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
  );
}
