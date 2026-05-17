'use client';

import { useRouter } from 'next/navigation';
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
};

export function PlayResult({ code, nickname, quiz, score, answers }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>('results');
  const [submitNote, setSubmitNote] = useState<string | null>(null);
  const [submitSending, setSubmitSending] = useState(true);

  const acceptedRef = useRef(() => {
    clearPlayState(window.sessionStorage, code, nickname);
  });

  useLayoutEffect(() => {
    acceptedRef.current = () => {
      clearPlayState(window.sessionStorage, code, nickname);
    };
  }, [code, nickname]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await submitPlay(code, nickname, score);
      if (cancelled) {
        return;
      }
      setSubmitSending(false);
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
    })();
    return () => {
      cancelled = true;
    };
  }, [code, nickname, score]);

  const maxPts = maxScoreFromQuiz(quiz);
  const correctCount = correctAnswerCount(quiz, answers);
  const scorePercent = Math.min(100, Math.round((score / maxPts) * 100));
  const scorePointsDisplay = score;
  const scoreTotalDisplay = maxPts;

  const reviewQuestions = buildReviewQuestions(quiz, answers);
  const wrongCount = reviewQuestions.length - correctCount;

  const message =
    quiz.front_matter.description?.trim() ||
    `Dziękujemy za udział w quizie „${quiz.front_matter.title}".`;

  const handleRetry = () => {
    router.push(`/play/?code=${encodeURIComponent(code)}`);
  };

  return (
    <div className="flex h-dvh w-full flex-col items-stretch overflow-hidden bg-[var(--page-bg)] sm:items-center">
      {view === 'results' && (
        <>
          <div className="flex min-h-0 w-full max-w-[390px] flex-1 flex-col overflow-hidden sm:mx-auto">
            <QuizResults
              scorePercent={scorePercent}
              scorePoints={scorePointsDisplay}
              scoreTotal={scoreTotalDisplay}
              message={message}
              showAnswerReview={reviewQuestions.length > 0}
              onReview={() => setView('review')}
              onRetry={handleRetry}
            />
          </div>
          <div className="w-full max-w-[390px] shrink-0 border-t border-[var(--border)] px-6 pt-3 pb-6 sm:mx-auto">
            {submitSending && (
              <p className="text-center text-[13px] font-medium text-[var(--text-muted)]">
                Wysyłanie wyniku…
              </p>
            )}
            {submitNote && (
              <p className="text-center text-[13px] font-medium text-[var(--wrong-fg)]">
                {submitNote}
              </p>
            )}
          </div>
        </>
      )}

      {view === 'review' && (
        <div className="flex min-h-0 w-full max-w-[390px] flex-1 flex-col overflow-hidden sm:mx-auto">
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
