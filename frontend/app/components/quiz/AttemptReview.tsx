'use client';

import { ArrowLeft, CircleCheck, CircleX } from 'lucide-react';

import type { ReviewQuestion } from '@/app/types';
import { cn } from '@/lib/cn';

interface AttemptReviewProps {
  correctCount: number;
  wrongCount: number;
  scorePercent: number;
  questions: ReviewQuestion[];
  onBack?: () => void;
}

export default function AttemptReview({
  correctCount,
  wrongCount,
  scorePercent,
  questions,
  onBack,
}: AttemptReviewProps) {
  return (
    <div className="flex min-h-full w-full max-w-[390px] flex-col bg-[var(--page-bg)]">
      {/* Header */}
      <div className="flex w-full items-center justify-between px-6 pt-4">
        <button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-2"
        >
          <ArrowLeft size={20} className="text-[var(--text-dark)]" />
          <span className="text-sm font-semibold text-[var(--text-dark)]">
            Wyniki
          </span>
        </button>
        <span className="text-base font-bold text-[var(--text-dark)]">
          Przegląd próby
        </span>
        <div className="w-[60px]" />
      </div>

      {/* Score Summary */}
      <div className="flex w-full items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--correct-bg)] px-3.5 py-2.5">
          <CircleCheck size={18} className="text-[var(--correct-fg)]" />
          <span className="text-[13px] font-semibold text-[var(--correct-fg)]">
            {correctCount} poprawnych
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-[var(--wrong-bg)] px-3.5 py-2.5">
          <CircleX size={18} className="text-[var(--wrong-fg)]" />
          <span className="text-[13px] font-semibold text-[var(--wrong-fg)]">
            {wrongCount} błędne
          </span>
        </div>
        <span className="text-xl font-extrabold text-[var(--orange)]">
          {scorePercent}%
        </span>
      </div>

      {/* Questions List */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        {questions.map((q) => (
          <div
            key={q.number}
            className={cn(
              'flex flex-col gap-3 rounded-2xl border-[1.5px] bg-[var(--card-bg)] p-4',
              q.isCorrect
                ? 'border-[var(--correct-fg)]'
                : 'border-[var(--wrong-fg)]',
            )}
          >
            {/* Question header */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[var(--text-muted)]">
                Pytanie {q.number}
              </span>
              {q.isCorrect ? (
                <span className="flex items-center gap-1 rounded-full bg-[var(--correct-bg)] px-2.5 py-1">
                  <CircleCheck size={12} className="text-[var(--correct-fg)]" />
                  <span className="text-[11px] font-semibold text-[var(--correct-fg)]">
                    Poprawna
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-[var(--wrong-bg)] px-2.5 py-1">
                  <CircleX size={12} className="text-[var(--wrong-fg)]" />
                  <span className="text-[11px] font-semibold text-[var(--wrong-fg)]">
                    Błędna
                  </span>
                </span>
              )}
            </div>

            {/* Question text */}
            <p className="text-sm leading-[1.4] font-semibold text-[var(--text-dark)]">
              {q.text}
            </p>

            {/* Answers */}
            <div className="flex flex-col gap-2">
              {q.answers.map((a, i) => (
                <div
                  key={`${i}-${a.text}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5',
                    a.state === 'correct-selected' &&
                      'border-[1.5px] border-[var(--correct-fg)] bg-[var(--correct-bg)]',
                    a.state === 'wrong-selected' &&
                      'border-[1.5px] border-[var(--wrong-fg)] bg-[var(--wrong-bg)]',
                    a.state === 'correct' &&
                      'border-[1.5px] border-[var(--correct-fg)] bg-[var(--correct-bg)]',
                    a.state === 'neutral' &&
                      'border border-[var(--border)] bg-[var(--page-bg)]',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full',
                      a.state === 'correct-selected' &&
                        'bg-[var(--correct-fg)]',
                      a.state === 'wrong-selected' && 'bg-[var(--wrong-fg)]',
                      a.state === 'correct' && 'bg-[var(--correct-fg)]',
                      a.state === 'neutral' &&
                        'border-[1.5px] border-[var(--border)] bg-white',
                    )}
                  >
                    {(a.state === 'correct-selected' ||
                      a.state === 'correct') && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M1.5 5L4 7.5L8.5 2.5"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    {a.state === 'wrong-selected' && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm',
                      a.state === 'correct-selected'
                        ? 'font-semibold text-[var(--correct-fg)]'
                        : a.state === 'wrong-selected'
                          ? 'font-semibold text-[var(--wrong-fg)]'
                          : a.state === 'correct'
                            ? 'font-semibold text-[var(--correct-fg)]'
                            : 'font-medium text-[var(--text-dark)]',
                    )}
                  >
                    {a.text}
                  </span>
                  {a.yourAnswer && (
                    <span className="ml-auto text-[11px] font-medium text-[var(--wrong-fg)]">
                      Twoja odpowiedź
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
