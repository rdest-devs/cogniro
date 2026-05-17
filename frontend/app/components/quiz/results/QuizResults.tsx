'use client';

import { FileCheck, RotateCcw } from 'lucide-react';

import type { RankingEntry } from '@/app/types';

import RankingRow from './RankingRow';
import ScoreCircle from './ScoreCircle';

interface QuizResultsProps {
  scorePercent: number;
  scorePoints: number;
  scoreTotal: number;
  message: string;
  ranking?: RankingEntry[];
  showAnswerReview?: boolean;
  onRetry?: () => void;
  onReview?: () => void;
}

export default function QuizResults({
  scorePercent,
  scorePoints,
  scoreTotal,
  message,
  ranking,
  showAnswerReview = true,
  onRetry,
  onReview,
}: QuizResultsProps) {
  return (
    <div className="flex h-full w-full max-w-[390px] flex-col bg-[var(--page-bg)]">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-4 pb-8">
        <section className="flex flex-col items-center gap-4">
          <span className="text-sm font-medium text-[var(--text-muted)]">
            Twój wynik
          </span>
          <ScoreCircle
            percent={scorePercent}
            correct={scorePoints}
            total={scoreTotal}
          />
          <p className="max-w-[280px] text-center text-[15px] leading-[1.5] font-medium text-[var(--text-dark)]">
            {message}
          </p>
          <div className="w-full max-w-[280px] rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--text-muted)]">
                Punkty
              </span>
              <span className="font-semibold text-[var(--text-dark)]">
                {scorePoints} / {scoreTotal}
              </span>
            </div>
            <div className="my-2 h-px bg-[var(--border)]" />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--text-muted)]">
                Procent
              </span>
              <span className="font-semibold text-[var(--text-dark)]">
                {scorePercent}%
              </span>
            </div>
          </div>
        </section>

        {ranking && ranking.length > 0 && (
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
        )}

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

          {showAnswerReview && (
            <button
              onClick={onReview}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] px-6 py-3.5 transition-opacity hover:opacity-90"
            >
              <FileCheck size={18} className="text-[var(--text-dark)]" />
              <span className="text-[15px] font-semibold text-[var(--text-dark)]">
                Przejrzyj odpowiedzi
              </span>
            </button>
          )}

          <a
            href="https://www.informatyka.agh.edu.pl"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-[var(--text-muted)] hover:underline"
          >
            Zobacz stronę Wydziału Informatyki AGH!
          </a>
        </nav>
      </div>
    </div>
  );
}
