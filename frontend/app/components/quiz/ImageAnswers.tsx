'use client';

import ExportedImage from 'next-image-export-optimizer';
import { useState } from 'react';

import { cn } from '@/lib/cn';

import ProgressBar from './ProgressBar';
import QuestionCard from './QuestionCard';
import QuestionHeader from './QuestionHeader';
import SubmitButton from './SubmitButton';

interface ImageAnswerOption {
  imageUrl: string;
  label: string;
}

interface ImageAnswersProps {
  questionNumber?: number;
  totalQuestions?: number;
  time?: string;
  question?: string;
  answers?: ImageAnswerOption[];
  onSubmit?: (selectedIndex: number) => void;
}

export default function ImageAnswers({
  questionNumber = 9,
  totalQuestions = 10,
  time = '0:33',
  question = 'Który z poniższych obrazków przedstawia strukturę drzewa binarnego?',
  answers = [
    { imageUrl: '/images/diagram-a.png', label: 'A' },
    { imageUrl: '/images/diagram-b.png', label: 'B' },
    { imageUrl: '/images/diagram-c.png', label: 'C' },
    { imageUrl: '/images/diagram-d.png', label: 'D' },
  ],
  onSubmit,
}: ImageAnswersProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const rows: ImageAnswerOption[][] = [];
  for (let i = 0; i < answers.length; i += 2) {
    rows.push(answers.slice(i, i + 2));
  }

  return (
    <div className="flex min-h-full w-full max-w-[390px] flex-col bg-[var(--page-bg)]">
      <ProgressBar current={questionNumber} total={totalQuestions} />
      <QuestionHeader
        current={questionNumber}
        total={totalQuestions}
        time={time}
      />

      <div className="flex flex-1 flex-col gap-4 px-6 pt-5 pb-8">
        <QuestionCard question={question} />

        {/* Image Grid */}
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
                    <div className="py-2 text-center">
                      <span
                        className={cn(
                          'text-sm text-[var(--text-dark)]',
                          isSelected ? 'font-bold' : 'font-medium',
                        )}
                      >
                        {answer.label}
                      </span>
                    </div>
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
      </div>
    </div>
  );
}
