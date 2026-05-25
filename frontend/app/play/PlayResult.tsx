'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { AttemptReview, QuizResults } from '@/app/components/quiz';
import { buildReviewQuestions } from '@/app/play/buildReviewQuestions';
import {
  type AnswerMap,
  correctAnswerCount,
  maxScoreFromQuiz,
} from '@/app/play/scoring';
import { clearPlayState } from '@/app/play/storage';
import type { KqfQuiz } from '@/lib/kqf';
import { submitPlay } from '@/lib/play/client';

type View = 'results' | 'review';

type Props = {
  code: string;
  nickname: string;
  quiz: KqfQuiz;
  score: number;
  answers: AnswerMap;
  /** After „Spróbuj ponownie” — do not POST score again (local replay only). */
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

  const acceptedRef = useRef(() => {
    clearPlayState(window.sessionStorage, code, nickname);
  });

  useLayoutEffect(() => {
    acceptedRef.current = () => {
      clearPlayState(window.sessionStorage, code, nickname);
    };
  }, [code, nickname]);

  useEffect(() => {
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
          return;
        }
        if (r.nicknameViolation) {
          setSubmitNote(
            'Twój pseudonim został odrzucony (naruszenie zasad). Wynik nie został zapisany na serwerze.',
          );
          return;
        }
        setSubmitNote(
          'Nie udało się zapisać wyniku na serwerze. Twój wynik powyżej jest liczony lokalnie.',
        );
      } catch {
        if (cancelled) {
          return;
        }
        setSubmitNote(
          'Błąd sieci. Nie udało się zapisać wyniku na serwerze. Twój wynik powyżej jest liczony lokalnie.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, nickname, score, skipServerSubmit]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {view === 'results' && (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="my-auto min-h-0 w-full">
              <QuizResults
                scorePercent={scorePercent}
                scorePoints={scorePointsDisplay}
                scoreTotal={scoreTotalDisplay}
                message={message}
                showAnswerReview={allowAnswerReview}
                onReview={
                  allowAnswerReview ? () => setView('review') : undefined
                }
                onRetry={onPlayAgain}
              />
            </div>
          </div>
          {submitNote != null ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <p className="pointer-events-auto rounded-2xl border border-[var(--wrong-fg)] bg-[var(--wrong-bg)] px-4 py-3 text-center text-sm font-medium text-[var(--wrong-fg)] shadow-[0_-10px_28px_rgba(33,44,63,0.08)]">
                {submitNote}
              </p>
            </div>
          ) : skipServerSubmit ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <p className="pointer-events-auto rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-center text-sm leading-snug font-medium text-[var(--text-muted)] shadow-[0_-10px_28px_rgba(33,44,63,0.08)]">
                Ta próba nie zmienia wyniku na serwerze.
              </p>
            </div>
          ) : null}
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
