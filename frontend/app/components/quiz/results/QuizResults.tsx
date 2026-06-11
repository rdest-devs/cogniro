'use client';

import { FileCheck, PartyPopper, RefreshCw, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';

import type { RankingEntry } from '@/app/types';

import RankingRow from './RankingRow';
import ScoreCircle from './ScoreCircle';

interface QuizResultsProps {
  scorePercent: number;
  scorePoints: number;
  scoreTotal: number;
  message: string;
  ranking?: RankingEntry[];
  /** Heading shown above the ranking list. */
  rankingTitle?: string;
  /**
   * When true, `ranking` is already sorted with final positions/medals (e.g. the
   * play leaderboard, which pins the current participant at their real position).
   * It is then rendered as-is. When false (default), raw `ranking` is sorted by
   * score and positions/medals are assigned by index (used by the demos).
   */
  preSortedRanking?: boolean;
  /** Show a celebratory banner when the current participant is on the podium. */
  celebratePodium?: boolean;
  /** When set, a small refresh button next to the ranking title re-fetches it. */
  onRefreshRanking?: () => void;
  /** Spins the refresh button and blocks repeated taps while a refresh is in flight. */
  refreshingRanking?: boolean;
  showAnswerReview?: boolean;
  onRetry?: () => void;
  onReview?: () => void;
}

function parseScore(score: string): number {
  return parseFloat(score.replace('%', '')) || 0;
}

export default function QuizResults({
  scorePercent,
  scorePoints,
  scoreTotal,
  message,
  ranking,
  rankingTitle = 'Ranking Wydziałowy',
  preSortedRanking = false,
  celebratePodium = false,
  onRefreshRanking,
  refreshingRanking = false,
  showAnswerReview = true,
  onRetry,
  onReview,
}: QuizResultsProps) {
  const displayRanking = useMemo(() => {
    if (!ranking) return [];
    // Already ranked upstream (positions/medals are final) — render as-is.
    if (preSortedRanking) return ranking;
    return [...ranking]
      .sort((a, b) => parseScore(b.score) - parseScore(a.score))
      .map((entry, idx) => ({
        ...entry,
        position: idx + 1,
        medal:
          idx === 0
            ? ('gold' as const)
            : idx === 1
              ? ('silver' as const)
              : idx === 2
                ? ('bronze' as const)
                : undefined,
      }));
  }, [ranking, preSortedRanking]);

  return (
    <div className="flex h-full w-full flex-col bg-[var(--page-bg)]">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-4 pb-8">
        <section className="flex flex-col items-center gap-4">
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
                Zdobyte / maks.
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

        {celebratePodium && (
          <section
            className="flex items-center gap-3 rounded-2xl border border-[var(--orange)] bg-[var(--highlight-bg)] px-4 py-3.5"
            role="status"
          >
            <PartyPopper
              size={22}
              className="shrink-0 text-[var(--orange)] motion-safe:animate-bounce"
              aria-hidden
            />
            <p className="text-[15px] font-bold text-[var(--text-dark)]">
              Brawo! Jesteś na podium!
            </p>
          </section>
        )}

        {displayRanking.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
            <div className="flex items-center justify-between gap-2 px-4 py-3.5">
              <h2 className="text-[15px] font-bold text-[var(--text-dark)]">
                {rankingTitle}
              </h2>
              {onRefreshRanking ? (
                <button
                  type="button"
                  onClick={onRefreshRanking}
                  disabled={refreshingRanking}
                  aria-label="Odśwież ranking"
                  aria-busy={refreshingRanking}
                  className="-m-1.5 cursor-pointer rounded-full p-1.5 text-[var(--text-muted)] transition-opacity hover:opacity-70 disabled:cursor-default disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={
                      refreshingRanking ? 'motion-safe:animate-spin' : undefined
                    }
                    aria-hidden
                  />
                </button>
              ) : null}
            </div>
            <div className="h-px bg-[var(--border)]" />
            {displayRanking.map((entry, idx) => (
              <RankingRow
                key={entry.name}
                entry={entry}
                isLast={idx === displayRanking.length - 1}
              />
            ))}
          </section>
        )}

        <nav className="flex flex-col items-center gap-3">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-[var(--primary-blue)] bg-[var(--page-bg)] px-6 py-3.5 transition-opacity hover:opacity-90"
            >
              <RotateCcw size={18} className="text-[var(--primary-blue)]" />
              <span className="text-[15px] font-semibold text-[var(--primary-blue)]">
                Spróbuj ponownie
              </span>
            </button>
          ) : null}

          {showAnswerReview && onReview ? (
            <button
              type="button"
              onClick={onReview}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] px-6 py-3.5 transition-opacity hover:opacity-90"
            >
              <FileCheck size={18} className="text-[var(--text-dark)]" />
              <span className="text-[15px] font-semibold text-[var(--text-dark)]">
                Przejrzyj odpowiedzi
              </span>
            </button>
          ) : null}

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
