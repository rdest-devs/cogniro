'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { submitPlay } from '@/lib/play/client';

type Props = {
  code: string;
  nickname: string;
  score: number;
  onAccepted: () => void;
  onViolation: () => void;
};

export function PlaySubmitter({
  code,
  nickname,
  score,
  onAccepted,
  onViolation,
}: Props) {
  const [phase, setPhase] = useState<'sending' | 'retry'>('sending');
  const acceptedRef = useRef(onAccepted);
  const violationRef = useRef(onViolation);

  useLayoutEffect(() => {
    acceptedRef.current = onAccepted;
    violationRef.current = onViolation;
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await submitPlay(code, nickname, score);
      if (cancelled) {
        return;
      }
      if (r.ok) {
        acceptedRef.current();
      } else if (r.nicknameViolation) {
        violationRef.current();
      } else {
        setPhase('retry');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, nickname, score]);

  if (phase === 'retry') {
    return (
      <div className="space-y-3">
        <p>Nie udało się wysłać wyniku.</p>
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={() => window.location.reload()}
        >
          Odśwież stronę
        </button>
      </div>
    );
  }

  return <p>Wysyłanie wyniku…</p>;
}
