'use client';

import { useState } from 'react';

import QuizStart from '@/app/components/quiz/shared/QuizStart';
import { quizStartDemo } from '@/app/legacy/data/demo';

type Props = {
  code: string;
  joinError: string | null;
  onJoin: (nickname: string) => Promise<void>;
};

export function EnterNickname({ code, joinError, onJoin }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[var(--page-bg)]">
      {joinError ? (
        <div className="shrink-0 px-6 pt-4">
          <p className="rounded-2xl border border-[var(--wrong-fg)] bg-[var(--wrong-bg)] px-4 py-3 text-center text-sm font-medium text-[var(--wrong-fg)]">
            {joinError}
          </p>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="my-auto w-full">
          <QuizStart
            title="Dołącz do quizu"
            description="Wpisz pseudonim widoczny dla prowadzącego."
            logoUrl={quizStartDemo.logoUrl}
            disabled={busy}
            sessionCode={code}
            onStart={async (nick: string) => {
              setBusy(true);
              try {
                await onJoin(nick);
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
