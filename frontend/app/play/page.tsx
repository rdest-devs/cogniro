'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';

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
      /** True after „Spróbuj ponownie” — brak ponownego POST wyniku. */
      skipServerSubmit?: boolean;
    };

function PlayExperience({ urlCode }: { urlCode: string }) {
  const [stage, setStage] = useState<Stage>(() =>
    urlCode
      ? { name: 'enter-nickname', code: urlCode }
      : { name: 'enter-code' },
  );
  const [joinError, setJoinError] = useState<string | null>(null);
  /** Ustawiane w `onPlayAgain` — kolejne zakończenie nie wywołuje `submitPlay`. */
  const skipSubmitAfterLocalReplayRef = useRef(false);

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
                if (r.status === 409) {
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
        <PlayingShell
          state={stage.state}
          onChange={(s) => {
            savePlayState(window.sessionStorage, stage.code, stage.nickname, s);
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
