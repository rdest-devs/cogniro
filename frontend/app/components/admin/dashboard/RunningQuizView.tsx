'use client';

import { useEffect, useState } from 'react';

import { QrCode } from '@/app/components/admin/dashboard/QrCode';
import AdminLayout from '@/app/components/admin/layout/AdminLayout';
import {
  activateQuiz,
  blockNickname,
  getSessionSnapshot,
  stopQuiz,
} from '@/lib/sessions/client';

type Snapshot = Awaited<ReturnType<typeof getSessionSnapshot>>;

type Props = {
  quizId: string;
  onStopped: (date: string, filename: string) => void;
  onBack: () => void;
  onCreateQuiz?: () => void;
  onLogout?: () => void;
};

export function RunningQuizView({
  quizId,
  onStopped,
  onBack,
  onCreateQuiz,
  onLogout,
}: Props) {
  const [activation, setActivation] = useState<{
    pin: string;
    join_url: string;
    started_at: string;
  } | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setActivation(await activateQuiz(quizId));
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, [quizId]);

  useEffect(() => {
    if (!activation) {
      return;
    }
    void (async () => {
      try {
        setSnap(await getSessionSnapshot(quizId));
      } catch {
        setSnap(null);
      }
    })();
  }, [activation, quizId]);

  if (err) {
    return (
      <AdminLayout onCreateQuiz={onCreateQuiz} onLogout={onLogout}>
        <p>Błąd: {err}</p>
        <button type="button" className="mt-2 underline" onClick={onBack}>
          Powrót
        </button>
      </AdminLayout>
    );
  }

  if (!activation) {
    return (
      <AdminLayout onCreateQuiz={onCreateQuiz} onLogout={onLogout}>
        <p>Uruchamianie…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout onCreateQuiz={onCreateQuiz} onLogout={onLogout}>
      <div className="mb-4 flex gap-3">
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={onBack}
        >
          Powrót
        </button>
      </div>
      <section className="space-y-4">
        <div className="flex flex-wrap gap-6">
          <QrCode value={activation.join_url} />
          <div>
            <div className="font-mono text-3xl tracking-widest">
              PIN: {activation.pin}
            </div>
            <div className="text-sm text-zinc-500">{activation.join_url}</div>
            <div className="text-sm">
              Aktywny od:{' '}
              {new Date(activation.started_at).toLocaleTimeString('pl-PL')}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded border px-3 py-1"
            onClick={async () => {
              try {
                setSnap(await getSessionSnapshot(quizId));
              } catch {
                setSnap(null);
              }
            }}
          >
            Odśwież
          </button>
          <button
            type="button"
            className="rounded bg-red-700 px-3 py-1 text-white"
            onClick={async () => {
              const r = await stopQuiz(quizId);
              onStopped(r.date, r.filename);
            }}
          >
            Zakończ quiz
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Pseudonim</th>
              <th className="text-left">Stan</th>
              <th className="text-left">Wynik</th>
              <th className="text-left">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {(snap?.participants ?? []).map((p) => (
              <tr key={p.nickname}>
                <td>{p.nickname}</td>
                <td>
                  {p.blocked
                    ? 'Zablok.'
                    : p.has_submitted
                      ? 'Wysłano'
                      : 'W trakcie'}
                </td>
                <td>{p.score ?? '—'}</td>
                <td>
                  {!p.blocked && !p.has_submitted && (
                    <button
                      type="button"
                      className="text-red-700 underline"
                      onClick={async () => {
                        await blockNickname(quizId, p.nickname);
                        setSnap(await getSessionSnapshot(quizId));
                      }}
                    >
                      Blokuj
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminLayout>
  );
}
