'use client';

import { ArrowLeft, Ban, CircleStop, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { QrCode } from '@/app/components/admin/dashboard/QrCode';
import AdminLayout from '@/app/components/admin/layout/AdminLayout';
import {
  adminBlueHeadTableClass,
  adminBlueHeadTableTdClass,
  adminBlueHeadTableTdMutedClass,
  adminBlueHeadTableThClass,
  adminBlueHeadTableTheadClass,
  adminDangerOutlineButtonClass,
  adminToolbarButtonClass,
} from '@/app/components/admin/shared/constants';
import {
  activateQuiz,
  blockNickname,
  getSessionSnapshot,
  stopQuiz,
} from '@/lib/sessions/client';

type Snapshot = Awaited<ReturnType<typeof getSessionSnapshot>>;

function formatScoreVsMax(score: number | null, maxScore: number): string {
  if (maxScore <= 0) {
    return score == null ? '—' : String(score);
  }
  if (score == null) {
    return `— / ${maxScore}`;
  }
  return `${score} / ${maxScore}`;
}

type Props = {
  quizId: string;
  logoHref?: string;
  menuActiveItem?: string;
  onMenuNavigate?: (menuItemId: string) => void;
  onStopped: (date: string, filename: string) => void;
  onBack: () => void;
  onLogout?: () => void;
};

export function RunningQuizView({
  quizId,
  logoHref = '/admin/',
  menuActiveItem = 'quizy',
  onMenuNavigate,
  onStopped,
  onBack,
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
    let cancelled = false;
    void (async () => {
      try {
        const nextActivation = await activateQuiz(quizId);
        if (!cancelled) {
          setActivation(nextActivation);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  useEffect(() => {
    if (!activation) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const nextSnapshot = await getSessionSnapshot(quizId);
        if (!cancelled) {
          setSnap(nextSnapshot);
        }
      } catch {
        if (!cancelled) {
          setSnap(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activation, quizId]);

  if (err) {
    return (
      <AdminLayout
        activeItem={menuActiveItem}
        logoHref={logoHref}
        onMenuNavigate={onMenuNavigate}
        onLogout={onLogout}
      >
        <p>Błąd: {err}</p>
        <button
          type="button"
          className={`${adminToolbarButtonClass} mt-2`}
          onClick={onBack}
        >
          <ArrowLeft size={14} aria-hidden />
          Powrót
        </button>
      </AdminLayout>
    );
  }

  if (!activation) {
    return (
      <AdminLayout
        activeItem={menuActiveItem}
        logoHref={logoHref}
        onMenuNavigate={onMenuNavigate}
        onLogout={onLogout}
      >
        <p>Uruchamianie…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      activeItem={menuActiveItem}
      logoHref={logoHref}
      onMenuNavigate={onMenuNavigate}
      onLogout={onLogout}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <button
          type="button"
          className={adminToolbarButtonClass}
          onClick={onBack}
        >
          <ArrowLeft size={14} aria-hidden />
          Powrót
        </button>
      </div>
      <section className="space-y-6">
        <div className="flex flex-wrap gap-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
          <QrCode value={activation.join_url} />
          <div>
            <div className="font-mono text-3xl tracking-widest text-[var(--text-dark)]">
              PIN: {activation.pin}
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              {activation.join_url}
            </div>
            <div className="text-sm text-[var(--text-dark)]">
              Aktywny od:{' '}
              {new Date(activation.started_at).toLocaleTimeString('pl-PL')}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={adminToolbarButtonClass}
            onClick={async () => {
              try {
                setSnap(await getSessionSnapshot(quizId));
              } catch {
                setSnap(null);
              }
            }}
          >
            <RefreshCcw size={14} aria-hidden />
            Odśwież
          </button>
          <button
            type="button"
            className={adminDangerOutlineButtonClass}
            onClick={async () => {
              try {
                const r = await stopQuiz(quizId);
                onStopped(r.date, r.filename);
              } catch (e) {
                setErr(String(e));
              }
            }}
          >
            <CircleStop size={14} aria-hidden />
            Zakończ quiz
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className={adminBlueHeadTableClass}>
            <thead className={adminBlueHeadTableTheadClass}>
              <tr>
                <th className={adminBlueHeadTableThClass}>Pseudonim</th>
                <th className={adminBlueHeadTableThClass}>Stan</th>
                <th className={adminBlueHeadTableThClass}>
                  Wynik (zdobyte / maks.)
                </th>
                <th className={adminBlueHeadTableThClass}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {(snap?.participants ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                  >
                    Nikt jeszcze nie dołączył. Udostępnij kod QR lub link z PIN.
                  </td>
                </tr>
              ) : (
                (snap?.participants ?? []).map((p) => (
                  <tr
                    key={p.nickname}
                    className="border-t border-[var(--border)]"
                  >
                    <td className={`${adminBlueHeadTableTdClass} font-medium`}>
                      {p.nickname}
                    </td>
                    <td className={adminBlueHeadTableTdMutedClass}>
                      {p.blocked
                        ? 'Zablok.'
                        : p.has_submitted
                          ? 'Wysłano'
                          : 'W trakcie'}
                    </td>
                    <td className={`${adminBlueHeadTableTdClass} tabular-nums`}>
                      {formatScoreVsMax(p.score, snap?.max_score ?? 0)}
                    </td>
                    <td className={adminBlueHeadTableTdClass}>
                      {!p.blocked && !p.has_submitted && (
                        <button
                          type="button"
                          className={adminDangerOutlineButtonClass}
                          onClick={async () => {
                            try {
                              await blockNickname(quizId, p.nickname);
                              setSnap(await getSessionSnapshot(quizId));
                            } catch (e) {
                              setErr(String(e));
                            }
                          }}
                        >
                          <Ban size={14} aria-hidden />
                          Blokuj
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
