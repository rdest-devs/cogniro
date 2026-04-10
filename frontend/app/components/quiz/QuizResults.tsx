'use client';

import { FileCheck, RotateCcw, Trophy } from 'lucide-react';

import type { RankingEntry } from '@/app/types';

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

const medalColors = {
  gold: '#FFD700',
  silver: '#A8A8A8',
  bronze: '#CD7F32',
};

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
        {/* Score Header */}
        <div className="flex flex-col items-center gap-4">
          <span className="text-sm font-medium text-[var(--text-muted)]">
            Twój wynik
          </span>

          {/* Score Circle */}
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-b from-[var(--orange)] to-[#F8BD4D]">
            <div className="flex h-[136px] w-[136px] flex-col items-center justify-center rounded-full bg-[var(--page-bg)]">
              <span className="text-[42px] font-extrabold text-[var(--orange)]">
                {scorePercent}%
              </span>
              <span className="text-sm font-medium text-[var(--text-muted)]">
                {scoreCorrect} / {scoreTotal}
              </span>
            </div>
          </div>

          <p className="max-w-[280px] text-center text-[15px] leading-[1.5] font-medium text-[var(--text-dark)]">
            {message}
          </p>
        </div>

        {/* Leaderboard */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
          <div className="px-4 py-3.5">
            <span className="text-[15px] font-bold text-[var(--text-dark)]">
              Ranking Wydziałowy
            </span>
          </div>
          <div className="h-px bg-[var(--border)]" />

          {ranking.map((entry, idx) => (
            <div key={entry.position}>
              <div
                className={`flex items-center gap-3 px-4 py-3 ${
                  entry.isYou ? 'bg-[var(--highlight-bg)]' : ''
                }`}
              >
                {entry.medal ? (
                  <Trophy
                    size={20}
                    color={medalColors[entry.medal]}
                    fill={medalColors[entry.medal]}
                  />
                ) : (
                  <span
                    className={`w-5 text-center text-sm ${
                      entry.isYou
                        ? 'font-bold text-[var(--primary-blue)]'
                        : 'font-medium text-[var(--text-muted)]'
                    }`}
                  >
                    {entry.position}
                  </span>
                )}
                <span
                  className={`flex-1 text-sm ${
                    entry.isYou
                      ? 'font-bold text-[var(--primary-blue)]'
                      : entry.medal === 'gold'
                        ? 'font-semibold text-[var(--text-dark)]'
                        : 'font-medium text-[var(--text-dark)]'
                  }`}
                >
                  {entry.name}
                </span>
                <span
                  className={`text-sm font-bold ${
                    entry.isYou
                      ? 'text-[var(--primary-blue)]'
                      : entry.medal === 'gold'
                        ? 'text-[var(--orange)]'
                        : 'font-semibold text-[var(--text-muted)]'
                  }`}
                >
                  {entry.score}
                </span>
              </div>
              {idx < ranking.length - 1 && (
                <div className="h-px bg-[var(--border)]" />
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-3">
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
        </div>
      </div>
    </div>
  );
}
