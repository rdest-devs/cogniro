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
    <div>
      <p className="mb-2 text-sm text-zinc-500">
        Kod: <code>{code}</code>
      </p>
      {joinError && (
        <p className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">
          {joinError}
        </p>
      )}
      <QuizStart
        title="Dołącz do quizu"
        description={`Wpisz pseudonim, aby wejść do quizu. Kod sesji: ${code}.`}
        logoUrl={quizStartDemo.logoUrl}
        disabled={busy}
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
  );
}
