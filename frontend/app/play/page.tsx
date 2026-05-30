'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { EnterCode } from '@/app/play/EnterCode';
import { EnterNickname } from '@/app/play/EnterNickname';
import { PlayExperienceLayout } from '@/app/play/PlayExperienceLayout';
import { PlayingShell } from '@/app/play/PlayingShell';
import { PlayResult } from '@/app/play/PlayResult';
import { type AnswerMap, calculateScore } from '@/app/play/scoring';
import {
  clearPlayState,
  loadPlayState,
  type PlayState,
  savePlayState,
} from '@/app/play/storage';
import type { KqfQuiz } from '@/lib/kqf';
import { joinPlay } from '@/lib/play/client';

type Stage =
  | { name: 'enter-code' }
  | { name: 'enter-nickname'; code: string }
  | { name: 'playing'; code: string; nickname: string; state: PlayState }
  | {
      name: 'result';
      code: string;
      nickname: string;
      quiz: KqfQuiz;
      score: number;
      answers: AnswerMap;
      /** True after „Spróbuj ponownie" — brak ponownego POST wyniku. */
      skipServerSubmit?: boolean;
    };

function formatGlobalTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function useGlobalQuizTimer(
  timeLimit: number | null | undefined,
  startedAt: string | undefined,
  onExpire: () => void,
): string | null {
  const [remaining, setRemaining] = useState<number | null>(timeLimit ?? null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!timeLimit || !startedAt) return;
    const startMs = new Date(startedAt).getTime();
    let active = true;
    const interval = setInterval(() => {
      const rem = Math.max(0, timeLimit - (Date.now() - startMs) / 1000);
      setRemaining(rem);
      if (rem <= 0 && active) {
        active = false;
        clearInterval(interval);
        setTimeout(() => onExpireRef.current(), 0);
      }
    }, 500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [timeLimit, startedAt]);

  if (remaining === null || !timeLimit) return null;
  return formatGlobalTime(remaining);
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function PlayExperience({ urlCode }: { urlCode: string }) {
  const [stage, setStage] = useState<Stage>(() =>
    urlCode
      ? { name: 'enter-nickname', code: urlCode }
      : { name: 'enter-code' },
  );
  const [joinError, setJoinError] = useState<string | null>(null);
  /** Ustawiane w `onPlayAgain` — kolejne zakończenie nie wywołuje `submitPlay`. */
  const skipSubmitAfterLocalReplayRef = useRef(false);

  const globalTimerDisplay = useGlobalQuizTimer(
    stage.name === 'playing' ? stage.state.quiz.front_matter.time_limit : null,
    stage.name === 'playing' ? stage.state.startedAt : undefined,
    () => {
      if (stage.name !== 'playing') return;
      const score = calculateScore(stage.state.quiz, stage.state.answers);
      setStage({
        name: 'result',
        code: stage.code,
        nickname: stage.nickname,
        quiz: stage.state.quiz,
        score,
        answers: stage.state.answers as AnswerMap,
        skipServerSubmit: skipSubmitAfterLocalReplayRef.current,
      });
    },
  );

  if (stage.name === 'result') {
    return (
      <PlayExperienceLayout>
        <PlayResult
          code={stage.code}
          nickname={stage.nickname}
          quiz={stage.quiz}
          score={stage.score}
          answers={stage.answers}
          skipServerSubmit={stage.skipServerSubmit === true}
          onPlayAgain={() => {
            const { code, nickname, quiz } = stage;
            skipSubmitAfterLocalReplayRef.current = true;
            clearPlayState(window.sessionStorage, code, nickname);
            const nextState: PlayState = {
              quiz,
              currentQuestionIndex: 0,
              answers: {},
              startedAt: new Date().toISOString(),
              submitted: false,
            };
            savePlayState(window.sessionStorage, code, nickname, nextState);
            setStage({
              name: 'playing',
              code,
              nickname,
              state: nextState,
            });
          }}
        />
      </PlayExperienceLayout>
    );
  }

  return (
    <PlayExperienceLayout>
      {stage.name === 'enter-code' && (
        <EnterCode
          onSubmit={(code) => setStage({ name: 'enter-nickname', code })}
        />
      )}
      {stage.name === 'enter-nickname' && (
        <EnterNickname
          code={stage.code}
          joinError={joinError}
          onJoin={async (nickname) => {
            setJoinError(null);
            try {
              const r = await joinPlay(stage.code, nickname);
              if (!r.ok) {
                if (r.status === 400 && r.profanity) {
                  setJoinError(
                    'Ten pseudonim zawiera niedozwolone słowa. Wybierz inny.',
                  );
                } else if (r.status === 409) {
                  setJoinError('Ten pseudonim jest już zajęty.');
                } else if (r.status === 404) {
                  setJoinError('Ten quiz nie jest już aktywny. Sprawdź kod.');
                } else if (r.status === 429) {
                  setJoinError(
                    'Zbyt wiele prób dołączenia. Odczekaj chwilę i spróbuj ponownie.',
                  );
                } else {
                  setJoinError('Nie udało się dołączyć. Spróbuj ponownie.');
                }
                return;
              }

              const fm = r.quiz.front_matter;
              if (fm.shuffle_questions && fm.shuffle_mode === 'per_player') {
                r.quiz = {
                  ...r.quiz,
                  questions: shuffleArray(r.quiz.questions),
                };
              }

              const persisted =
                typeof window !== 'undefined'
                  ? loadPlayState(window.sessionStorage, stage.code, nickname)
                  : null;
              let nextState: PlayState;
              if (
                persisted &&
                !persisted.submitted &&
                persisted.currentQuestionIndex < r.quiz.questions.length
              ) {
                nextState = { ...persisted, quiz: r.quiz };
              } else {
                nextState = {
                  quiz: r.quiz,
                  currentQuestionIndex: 0,
                  answers: {},
                  startedAt: new Date().toISOString(),
                  submitted: false,
                };
              }
              savePlayState(
                window.sessionStorage,
                stage.code,
                nickname,
                nextState,
              );
              setStage({
                name: 'playing',
                code: stage.code,
                nickname,
                state: nextState,
              });
            } catch {
              setJoinError('Nie udało się dołączyć. Spróbuj ponownie.');
              return;
            }
          }}
        />
      )}
      {stage.name === 'playing' && (
        <div className="flex min-h-0 flex-1 flex-col">
          {globalTimerDisplay !== null && (
            <div className="flex items-center justify-center bg-[var(--primary-blue)] px-4 py-1.5 text-sm font-bold text-white">
              Czas quizu: {globalTimerDisplay}
            </div>
          )}
          <PlayingShell
            state={stage.state}
            onChange={(s) => {
              savePlayState(
                window.sessionStorage,
                stage.code,
                stage.nickname,
                s,
              );
              setStage({ ...stage, state: s });
            }}
            onFinish={(final) => {
              const score = calculateScore(final.quiz, final.answers);
              setStage({
                name: 'result',
                code: stage.code,
                nickname: stage.nickname,
                quiz: final.quiz,
                score,
                answers: final.answers,
                skipServerSubmit: skipSubmitAfterLocalReplayRef.current,
              });
            }}
          />
        </div>
      )}
    </PlayExperienceLayout>
  );
}

function PlayGate() {
  const search = useSearchParams();
  const urlCode = (search.get('code') ?? '').trim().toUpperCase();
  return <PlayExperience key={urlCode || 'none'} urlCode={urlCode} />;
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <PlayExperienceLayout>
          <p className="px-6 py-8 text-center text-sm text-[var(--text-muted)]">
            Ładowanie…
          </p>
        </PlayExperienceLayout>
      }
    >
      <PlayGate />
    </Suspense>
  );
}
