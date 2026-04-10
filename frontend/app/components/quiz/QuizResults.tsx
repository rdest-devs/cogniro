'use client';

import { FileCheck, RotateCcw } from 'lucide-react';

import type { RankingEntry } from '@/app/types';

import RankingRow from './RankingRow';
import ScoreCircle from './ScoreCircle';

interface QuizResultsProps {
  scorePercent: number;
  scoreCorrect: number;
  scoreTotal: number;
  message: string;
  ranking: RankingEntry[];
  onRetry?: () => void;
  onReview?: () => void;
  onBack?: () => void;
}

export default function QuizResults({
  scorePercent,
  scoreCorrect,
  scoreTotal,
  message,
  ranking,
  onRetry,
  onReview,
  onBack,
}: QuizResultsProps) {
  return (
    <div className="flex min-h-full w-full max-w-[390px] flex-col bg-[var(--page-bg)]">
      <div className="flex flex-1 flex-col gap-6 px-6 pt-4 pb-8">
        <section className="flex flex-col items-center gap-4">
          <span className="text-sm font-medium text-[var(--text-muted)]">
            Twój wynik
          </span>
          <ScoreCircle
            percent={scorePercent}
            correct={scoreCorrect}
            total={scoreTotal}
          />
          <p className="max-w-[280px] text-center text-[15px] leading-[1.5] font-medium text-[var(--text-dark)]">
            {message}
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
          <div className="px-4 py-3.5">
            <h2 className="text-[15px] font-bold text-[var(--text-dark)]">
              Ranking Wydziałowy
            </h2>
          </div>
          <div className="h-px bg-[var(--border)]" />
          {ranking.map((entry, idx) => (
            <RankingRow
              key={entry.position}
              entry={entry}
              isLast={idx === ranking.length - 1}
            />
          ))}
        </section>

        <nav className="flex flex-col items-center gap-3">
          <button
            onClick={onRetry}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-[var(--primary-blue)] bg-[var(--page-bg)] px-6 py-3.5 transition-opacity hover:opacity-90"
          >
            <RotateCcw size={18} className="text-[var(--primary-blue)]" />
            <span className="text-[15px] font-semibold text-[var(--primary-blue)]">
              Spróbuj ponownie
            </span>
          </button>

          <button
            onClick={onReview}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] px-6 py-3.5 transition-opacity hover:opacity-90"
          >
            <FileCheck size={18} className="text-[var(--text-dark)]" />
            <span className="text-[15px] font-semibold text-[var(--text-dark)]">
              Przejrzyj odpowiedzi
            </span>
          </button>

          <button
            onClick={onBack}
            className="cursor-pointer text-sm font-medium text-[var(--text-muted)] hover:underline"
          >
            Wróć do strony Wydziału
          </button>
        </nav>
      </div>
    </div>
  );
}
