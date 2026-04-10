'use client';

import ExportedImage from 'next-image-export-optimizer';
import { useState } from 'react';

import type { ImageAnswerOption } from '@/app/types';
import { cn } from '@/lib/cn';

import QuestionCard from './QuestionCard';
import QuizLayout from './QuizLayout';
import SubmitButton from './SubmitButton';

interface ImageAnswersProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  answers: ImageAnswerOption[];
  onSubmit?: (selectedIndex: number) => void;
}

export default function ImageAnswers({
  questionNumber,
  totalQuestions,
  time,
  question,
  answers,
  onSubmit,
}: ImageAnswersProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const rows: ImageAnswerOption[][] = [];
  for (let i = 0; i < answers.length; i += 2) {
    rows.push(answers.slice(i, i + 2));
  }

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
      contentClassName="gap-4 pt-5"
    >
      <QuestionCard question={question} />

      <div className="flex flex-col gap-2.5">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-2.5">
            {row.map((answer, colIdx) => {
              const idx = rowIdx * 2 + colIdx;
              const isSelected = selected === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelected(idx)}
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
