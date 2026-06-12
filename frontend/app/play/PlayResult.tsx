'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { AttemptReview, QuizResults } from '@/app/components/quiz';
import { buildReviewQuestions } from '@/app/play/buildReviewQuestions';
import {
  type AnswerMap,
  correctAnswerCount,
  maxScoreFromQuiz,
} from '@/app/play/scoring';
import { clearPlayState } from '@/app/play/storage';
import type { RankingEntry } from '@/app/types';
import type { KqfQuiz } from '@/lib/kqf';
import { getLeaderboard, submitPlay } from '@/lib/play/client';
import { buildLeaderboardRows, currentOnPodium } from '@/lib/play/leaderboard';

type View = 'results' | 'review';

type Props = {
  code: string;
  nickname: string;
  quiz: KqfQuiz;
  score: number;
  answers: AnswerMap;
  /** After „Spróbuj ponownie” - do not POST score again (local replay only). */
  skipServerSubmit?: boolean;
  /** Restart this quiz attempt (same code / nickname); used instead of same-URL navigation. */
  onPlayAgain: () => void;
};

export function PlayResult({
  code,
  nickname,
  quiz,
  score,
  answers,
  skipServerSubmit = false,
  onPlayAgain,
}: Props) {
  const [view, setView] = useState<View>('results');
  const [submitNote, setSubmitNote] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [refreshingRanking, setRefreshingRanking] = useState(false);

  const acceptedRef = useRef(() => {
    clearPlayState(window.sessionStorage, code, nickname);
  });

  useLayoutEffect(() => {
    acceptedRef.current = () => {
      clearPlayState(window.sessionStorage, code, nickname);
    };
  }, [code, nickname]);

  // The play shell grows with content (min-h-dvh), so the document is the
  // scroller and its position survives view switches. Reset it whenever the
  // results view is entered (after finishing the quiz or returning from the
  // answer review), so the score is visible instead of a mid-page position.
  useLayoutEffect(() => {
    if (view === 'results') {
      window.scrollTo(0, 0);
    }
  }, [view]);

  // Fetch the live leaderboard and map it to display rows (best-effort).
  // Returns null when the request fails so callers can keep the current rows.
  const fetchRanking = useCallback(async (): Promise<RankingEntry[] | null> => {
    const lb = await getLeaderboard(code);
    return lb.ok ? buildLeaderboardRows(lb.entries, nickname) : null;
  }, [code, nickname]);

  const refreshRanking = useCallback(async () => {
    setRefreshingRanking(true);
    try {
      const rows = await fetchRanking();
      if (rows) {
        setRanking(rows);
      }
    } finally {
      setRefreshingRanking(false);
    }
  }, [fetchRanking]);

  useEffect(() => {
    // A local replay (after „Spróbuj ponownie") does not submit a score, so the
    // live leaderboard would not reflect this attempt — skip it entirely.
    if (skipServerSubmit) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await submitPlay(code, nickname, score);
        if (cancelled) {
          return;
        }
        if (r.ok) {
          acceptedRef.current();
        } else if (r.nicknameViolation) {
          setSubmitNote(
            'Twój pseudonim został odrzucony (naruszenie zasad). Wynik nie został zapisany na serwerze.',
          );
        } else {
          setSubmitNote(
            'Nie udało się zapisać wyniku na serwerze. Twój wynik powyżej jest liczony lokalnie.',
          );
        }
      } catch {
        if (cancelled) {
          return;
        }
        setSubmitNote(
          'Błąd sieci. Nie udało się zapisać wyniku na serwerze. Twój wynik powyżej jest liczony lokalnie.',
        );
      }
      // Fetch the live leaderboard once the score has been submitted.
      const rows = await fetchRanking();
      if (cancelled) {
        return;
      }
      if (rows) {
        setRanking(rows);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, nickname, score, skipServerSubmit, fetchRanking]);

  const maxPts = maxScoreFromQuiz(quiz);
  const correctCount = correctAnswerCount(quiz, answers);
  const scorePercent = Math.min(100, Math.round((score / maxPts) * 100));
  const scorePointsDisplay = score;
  const scoreTotalDisplay = maxPts;

  const reviewQuestions = buildReviewQuestions(quiz, answers);
  const wrongCount = reviewQuestions.length - correctCount;

  const allowAnswerReview =
    quiz.front_matter.show_answer_review !== false &&
    reviewQuestions.length > 0;

  const message =
    quiz.front_matter.description?.trim() ||
    `Dziękujemy za udział w quizie „${quiz.front_matter.title}".`;

  const notice =
    submitNote != null ? (
      <p
        role="status"
        className="rounded-2xl border border-[var(--wrong-fg)] bg-[var(--wrong-bg)] px-4 py-3 text-center text-sm font-medium text-[var(--wrong-fg)]"
      >
        {submitNote}
      </p>
    ) : skipServerSubmit ? (
      <p
        role="status"
        className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-center text-sm leading-snug font-medium text-[var(--text-muted)]"
      >
        Ta próba nie zmienia wyniku na serwerze.
      </p>
    ) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {view === 'results' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="my-auto min-h-0 w-full">
            <QuizResults
              scorePercent={scorePercent}
              scorePoints={scorePointsDisplay}
              scoreTotal={scoreTotalDisplay}
              message={message}
              ranking={ranking ?? undefined}
              rankingTitle="Tablica wyników"
              preSortedRanking
              onRefreshRanking={refreshRanking}
              refreshingRanking={refreshingRanking}
              celebratePodium={ranking ? currentOnPodium(ranking) : false}
              showAnswerReview={allowAnswerReview}
              onReview={allowAnswerReview ? () => setView('review') : undefined}
              onRetry={onPlayAgain}
              notice={notice}
            />
          </div>
        </div>
      )}

      {view === 'review' && allowAnswerReview && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AttemptReview
            correctCount={correctCount}
            wrongCount={wrongCount}
            scorePercent={scorePercent}
            scorePoints={scorePointsDisplay}
            scoreTotal={scoreTotalDisplay}
            questions={reviewQuestions}
            onBack={() => setView('results')}
          />
        </div>
      )}
    </div>
  );
}
