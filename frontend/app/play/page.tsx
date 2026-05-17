'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { EnterCode } from '@/app/play/EnterCode';
import { EnterNickname } from '@/app/play/EnterNickname';
import { NicknameViolation } from '@/app/play/NicknameViolation';
import { PlayingShell } from '@/app/play/PlayingShell';
import { PlayResult } from '@/app/play/PlayResult';
import { PlaySubmitter } from '@/app/play/PlaySubmitter';
import { calculateScore } from '@/app/play/scoring';
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
      name: 'submitting';
      code: string;
      nickname: string;
      state: PlayState;
      score: number;
    }
  | {
      name: 'result';
      code: string;
      nickname: string;
      quiz: KqfQuiz;
      score: number;
    }
  | { name: 'violation' };

function PlayExperience({ urlCode }: { urlCode: string }) {
  const [stage, setStage] = useState<Stage>(() =>
    urlCode
      ? { name: 'enter-nickname', code: urlCode }
      : { name: 'enter-code' },
  );
  const [joinError, setJoinError] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-2xl p-6">
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
            const r = await joinPlay(stage.code, nickname);
            if (!r.ok) {
              if (r.status === 409) {
                setJoinError('Ten pseudonim jest już zajęty.');
              } else if (r.status === 404) {
                setJoinError('Ten quiz nie jest już aktywny. Sprawdź kod.');
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
            if (persisted && !persisted.submitted) {
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
              name: 'submitting',
              code: stage.code,
              nickname: stage.nickname,
              state: final,
              score,
            });
          }}
        />
      )}
      {stage.name === 'submitting' && (
        <PlaySubmitter
          code={stage.code}
          nickname={stage.nickname}
          score={stage.score}
          onAccepted={() => {
            clearPlayState(window.sessionStorage, stage.code, stage.nickname);
            setStage({
              name: 'result',
              code: stage.code,
              nickname: stage.nickname,
              quiz: stage.state.quiz,
              score: stage.score,
            });
          }}
          onViolation={() => {
            clearPlayState(window.sessionStorage, stage.code, stage.nickname);
            setStage({ name: 'violation' });
          }}
        />
      )}
      {stage.name === 'result' && (
        <PlayResult quiz={stage.quiz} score={stage.score} />
      )}
      {stage.name === 'violation' && <NicknameViolation />}
    </main>
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
        <main className="mx-auto max-w-2xl p-6">
          <p className="text-sm text-zinc-500">Ładowanie…</p>
        </main>
      }
    >
      <PlayGate />
    </Suspense>
  );
}
