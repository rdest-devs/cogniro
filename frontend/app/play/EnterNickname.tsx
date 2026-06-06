'use client';

import { useState } from 'react';

import QuizStart from '@/app/components/quiz/shared/QuizStart';
import { quizStartDemo } from '@/app/legacy/data/demo';
import type { AvailabilityResult } from '@/lib/play/client';

type Props = {
  code: string;
  joinError: string | null;
  onJoin: (nickname: string) => Promise<void>;
  availability?: AvailabilityResult | null;
};

function buildAvailabilityMessage(av: AvailabilityResult): string | null {
  if (av.available) return null;
  if (av.status === 423 && av.detail === 'not_yet') {
    const opensAt = av.opensAt
      ? new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        }).format(new Date(av.opensAt))
      : null;
    return opensAt
      ? `Quiz otworzy się o ${opensAt}.`
      : 'Quiz jeszcze nie jest dostępny.';
  }
  if (av.status === 410) return 'Czas dostępności quizu minął.';
  if (av.status === 403) return 'Quiz jest chwilowo niedostępny.';
  if (av.status === 404) return 'Nieprawidłowy kod. Sprawdź link.';
  return null;
}

export function EnterNickname({
  code,
  joinError,
  onJoin,
  availability,
}: Props) {
  const [busy, setBusy] = useState(false);

  const unavailableMsg =
    availability && !availability.available
      ? buildAvailabilityMessage(availability)
      : null;

  const footerContent = unavailableMsg ? (
    <p
      role="status"
      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--page-bg)] px-6 py-4 text-center text-sm font-medium text-[var(--text-muted)]"
    >
      {unavailableMsg}
    </p>
  ) : undefined;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[var(--page-bg)]">
      {joinError ? (
        <div className="shrink-0 px-6 pt-4">
          <p
            role="alert"
            aria-atomic="true"
            className="rounded-2xl border border-[var(--wrong-fg)] bg-[var(--wrong-bg)] px-4 py-3 text-center text-sm font-medium text-[var(--wrong-fg)]"
          >
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
            disabled={busy || !!unavailableMsg}
            sessionCode={code}
            footerContent={footerContent}
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
