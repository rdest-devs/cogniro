'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import ProgressBar from '@/app/components/common/ProgressBar';
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
import {
  type AvailabilityResult,
  checkPlayAvailability,
  joinPlay,
} from '@/lib/play/client';

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
      /** True after „Spróbuj ponownie" - brak ponownego POST wyniku. */
      skipServerSubmit?: boolean;
    };

function useGlobalQuizTimer(
  timeLimit: number | null | undefined,
  startedAt: string | undefined,
  onExpire: () => void,
): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);
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
    }, 250);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [timeLimit, startedAt]);

  if (remaining === null || !timeLimit) return null;
  return remaining;
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
  const [availability, setAvailability] = useState<AvailabilityResult | null>(
    null,
  );
  /** Ustawiane w `onPlayAgain` — kolejne zakończenie nie wywołuje `submitPlay`. */
  const skipSubmitAfterLocalReplayRef = useRef(false);
  /** Guards against double-finish when global timer and per-question timer race. */
  const finishedRef = useRef(false);

  const finishQuiz = (playState: Extract<Stage, { name: 'playing' }>) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const score = calculateScore(
      playState.state.quiz,
      playState.state.answers,
      playState.state.answerTimes,
    );
    setStage({
      name: 'result',
      code: playState.code,
      nickname: playState.nickname,
      quiz: playState.state.quiz,
      score,
      answers: playState.state.answers as AnswerMap,
      skipServerSubmit: skipSubmitAfterLocalReplayRef.current,
    });
  };

  const timeLimit =
    stage.name === 'playing' ? stage.state.quiz.front_matter.time_limit : null;
  const globalRemaining = useGlobalQuizTimer(
    timeLimit,
    stage.name === 'playing' ? stage.state.startedAt : undefined,
    () => {
      if (stage.name !== 'playing') return;
      finishQuiz(stage);
    },
  );
  const progressPct =
    timeLimit && globalRemaining !== null
      ? Math.max(0, Math.min(100, (globalRemaining / timeLimit) * 100))
      : null;

  const enterNicknameCode = stage.name === 'enter-nickname' ? stage.code : null;

  useEffect(() => {
    if (!enterNicknameCode) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRecheck = (result: AvailabilityResult) => {
      if (cancelled || result.available) return;
      // Only the "not yet open" window flips to available on its own. Re-check
      // right after the scheduled start so the join unlocks without a reload;
      // a short retry covers client/server clock skew. 410 (expired) and other
      // states never reopen by time, so we leave them alone.
      if (
        result.status !== 423 ||
        result.detail !== 'not_yet' ||
        !result.opensAt
      )
        return;
      const untilOpen = new Date(result.opensAt).getTime() - Date.now();
      const delay = untilOpen > 0 ? Math.min(untilOpen + 500, 300_000) : 5_000;
      timer = setTimeout(probe, delay);
    };

    const probe = () => {
      void checkPlayAvailability(enterNicknameCode).then((result) => {
        if (cancelled) return;
        setAvailability(result);
        scheduleRecheck(result);
      });
    };

    probe();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enterNicknameCode]);

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
            finishedRef.current = false;
            clearPlayState(window.sessionStorage, code, nickname);
            const fm = quiz.front_matter;
            const replayQuiz =
              fm.shuffle_questions && fm.shuffle_mode === 'per_player'
                ? { ...quiz, questions: shuffleArray(quiz.questions) }
                : quiz;
            const nextState: PlayState = {
              quiz: replayQuiz,
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
          availability={availability}
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
                } else if (r.status === 423 && r.detail === 'not_yet') {
                  const opensAt = r.opensAt
                    ? new Intl.DateTimeFormat(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      }).format(new Date(r.opensAt))
                    : null;
                  setJoinError(
                    opensAt
                      ? `Quiz jeszcze nie jest dostępny. Otworzy się o ${opensAt}.`
                      : 'Quiz jeszcze nie jest dostępny.',
                  );
                } else if (r.status === 410) {
                  setJoinError('Czas dostępności quizu minął.');
                } else if (r.status === 403) {
                  setJoinError('Quiz jest chwilowo niedostępny.');
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
              const isPerPlayerShuffle =
                fm.shuffle_questions && fm.shuffle_mode === 'per_player';

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
                // Restore: keep persisted.quiz to preserve the original shuffle order.
                // Re-shuffling here would make currentQuestionIndex point to the wrong question.
                nextState = {
                  ...persisted,
                  quiz: isPerPlayerShuffle ? persisted.quiz : r.quiz,
                };
              } else {
                // Fresh session: apply per-player shuffle now and store it.
                if (isPerPlayerShuffle) {
                  r.quiz = {
                    ...r.quiz,
                    questions: shuffleArray(r.quiz.questions),
                  };
                }
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
          {progressPct !== null && (
            <ProgressBar
              percent={progressPct}
              fillClassName="bg-[var(--primary-blue)]"
            />
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
              finishQuiz({ ...stage, state: final });
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
