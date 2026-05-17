'use client';

import ExportedImage from 'next-image-export-optimizer';
import { useRef, useState } from 'react';

import SubmitButton from '@/app/components/common/SubmitButton';
import type { ImageAnswerOption } from '@/app/types';
import { cn } from '@/lib/cn';

import QuestionCard from '../shared/QuestionCard';
import QuizLayout from '../shared/QuizLayout';

interface ImageAnswersProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  answers: ImageAnswerOption[];
  onSubmit?: (selectedIndex: number) => void;
  initialSelectedIndex?: number | null;
}

function normalizeSelectedIndex(
  index: number | null,
  answersCount: number,
): number | null {
  if (index === null || index < 0 || index >= answersCount) {
    return null;
  }

  return index;
}

export default function ImageAnswers({
  questionNumber,
  totalQuestions,
  time,
  question,
  answers,
  onSubmit,
  initialSelectedIndex = null,
}: ImageAnswersProps) {
  const selectionScope = `${questionNumber}:${question}:${answers
    .map((answer) => answer.label)
    .join('|')}`;
  const normalizedInitialSelection = normalizeSelectedIndex(
    initialSelectedIndex,
    answers.length,
  );
  const [localSelection, setLocalSelection] = useState<{
    scope: string;
    index: number | null;
  }>({
    scope: selectionScope,
    index: normalizedInitialSelection,
  });
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected =
    localSelection.scope === selectionScope
      ? localSelection.index
      : normalizedInitialSelection;

  const rows: ImageAnswerOption[][] = [];
  for (let i = 0; i < answers.length; i += 2) {
    rows.push(answers.slice(i, i + 2));
  }

  const activeIndex = selected ?? 0;

  const handleChoiceKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    let nextIndex = idx;

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      nextIndex = (idx + 1) % answers.length;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      nextIndex = (idx - 1 + answers.length) % answers.length;
    } else {
      return;
    }

    setLocalSelection({ scope: selectionScope, index: nextIndex });
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
      contentClassName="gap-4 pt-5"
    >
      <QuestionCard question={question} />

      <div
        className="flex flex-col gap-2.5"
        role="radiogroup"
        aria-label={question}
      >
        {rows.map((row, rowIdx) => (
          <div key={row.map((a) => a.label).join('|')} className="flex gap-2.5">
            {row.map((answer, colIdx) => {
              const idx = rowIdx * 2 + colIdx;
              const isSelected = selected === idx;
              return (
                <button
                  key={answer.label}
                  ref={(node) => {
                    buttonRefs.current[idx] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={idx === activeIndex ? 0 : -1}
                  onClick={() =>
                    setLocalSelection({ scope: selectionScope, index: idx })
                  }
                  onKeyDown={(event) => handleChoiceKeyDown(event, idx)}
                  className={cn(
                    'flex flex-1 cursor-pointer flex-col overflow-hidden rounded-2xl transition-all',
                    isSelected
                      ? 'border-[2.5px] border-[var(--selected-border)] bg-[var(--selected-bg)]'
                      : 'border-[1.5px] border-[var(--border)] bg-[var(--card-bg)]',
                  )}
                >
                  <div className="relative flex h-[100px] w-full items-center justify-center overflow-hidden bg-white p-2">
                    <ExportedImage
                      src={answer.imageUrl}
                      alt={answer.label}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  <p
                    className={cn(
                      'py-2 text-center text-sm text-[var(--text-dark)]',
                      isSelected ? 'font-bold' : 'font-medium',
                    )}
                  >
                    {answer.label}
                  </p>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <SubmitButton
        label="Zatwierdź odpowiedź"
        onClick={() => selected !== null && onSubmit?.(selected)}
        disabled={selected === null}
      />
    </QuizLayout>
  );
}
