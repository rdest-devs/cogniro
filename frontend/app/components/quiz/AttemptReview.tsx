'use client';

import { ArrowLeft, CircleCheck, CircleX } from 'lucide-react';

import type { ReviewQuestion } from '@/app/types';

import ReviewQuestionCard from './ReviewQuestionCard';

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
      <header className="flex w-full items-center justify-between px-6 pt-4">
        <button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-2"
        >
          <ArrowLeft size={20} className="text-[var(--text-dark)]" />
          <span className="text-sm font-semibold text-[var(--text-dark)]">
            Wyniki
          </span>
        </button>
        <h1 className="text-base font-bold text-[var(--text-dark)]">
          Przegląd próby
        </h1>
        <div className="w-[60px]" />
      </header>

      <div className="flex w-full items-center justify-between gap-3 px-6 py-4">
        <span className="flex items-center gap-2 rounded-xl bg-[var(--correct-bg)] px-3.5 py-2.5">
          <CircleCheck size={18} className="text-[var(--correct-fg)]" />
          <span className="text-[13px] font-semibold text-[var(--correct-fg)]">
            {correctCount} poprawnych
          </span>
        </span>
        <span className="flex items-center gap-2 rounded-xl bg-[var(--wrong-bg)] px-3.5 py-2.5">
          <CircleX size={18} className="text-[var(--wrong-fg)]" />
          <span className="text-[13px] font-semibold text-[var(--wrong-fg)]">
            {wrongCount} błędne
          </span>
        </span>
        <span className="text-xl font-extrabold text-[var(--orange)]">
          {scorePercent}%
        </span>
      </div>

      <section className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        {questions.map((q) => (
          <ReviewQuestionCard key={q.number} question={q} />
        ))}
      </section>
    </div>
  );
}
