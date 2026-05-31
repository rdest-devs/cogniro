'use client';

import {
  ArrowLeft,
  Ban,
  CircleStop,
  Download,
  ExternalLink,
  RefreshCcw,
} from 'lucide-react';
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
import { formatAdminDate } from '@/lib/admin-date-time';
import {
  activateQuiz,
  blockNickname,
  getSessionSnapshot,
  stopQuiz,
} from '@/lib/sessions/client';

type Snapshot = Awaited<ReturnType<typeof getSessionSnapshot>>;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image load failed: ${src}`));
    image.src = src;
  });
}

function drawWrappedCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
): void {
  let currentLine = '';
  let lineY = startY;

  for (const char of text) {
    const nextLine = currentLine + char;
    if (currentLine && ctx.measureText(nextLine).width > maxWidth) {
      ctx.fillText(currentLine, centerX, lineY);
      currentLine = char;
      lineY += lineHeight;
      continue;
    }
    currentLine = nextLine;
  }

  if (currentLine) {
    ctx.fillText(currentLine, centerX, lineY);
  }
}

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

  const buildPresenterUrl = () => {
    if (!activation) {
      return null;
    }
    const basePath = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : `${window.location.pathname}/`;
    const presenterUrl = new URL(
      `${basePath}presenter/`,
      window.location.origin,
    );
    presenterUrl.search = new URLSearchParams({
      href: activation.join_url,
      pin: activation.pin,
    }).toString();
    return presenterUrl.toString();
  };

  const openPresenterWindow = () => {
    const presenterUrl = buildPresenterUrl();
    if (!presenterUrl) {
      return;
    }
    const popup = window.open(
      presenterUrl,
      'quiz-presenter-view',
      'width=960,height=900',
    );
    if (!popup) {
      window.alert(
        'Nie udało się otworzyć nowego okna. Sprawdź, czy przeglądarka nie blokuje popupów.',
      );
      return;
    }
    popup.opener = null;
    popup.focus();
  };

  const downloadPrintableQrBoard = async () => {
    if (!activation) {
      return;
    }

    try {
      const QRCode = (await import('qrcode')).default;
      const qrDataUrl = await QRCode.toDataURL(activation.join_url, {
        width: 1200,
        margin: 1,
      });

      const canvas = document.createElement('canvas');
      canvas.width = 1300;
      canvas.height = 1800;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context unavailable');
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      try {
        const logo = await loadImage('/images/wi-new-logo.png');
        const logoMaxWidth = 740;
        const logoMaxHeight = 210;
        const logoScale = Math.min(
          logoMaxWidth / logo.width,
          logoMaxHeight / logo.height,
        );
        const logoWidth = logo.width * logoScale;
        const logoHeight = logo.height * logoScale;
        const logoX = (canvas.width - logoWidth) / 2;
        const logoY = 90 + (logoMaxHeight - logoHeight) / 2;
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      } catch {
        ctx.fillStyle = '#1f2937';
        ctx.textAlign = 'center';
        ctx.font = '56px Arial, sans-serif';
        ctx.fillText('Wydział Informatyki', 650, 210);
      }

      const qrImage = await loadImage(qrDataUrl);
      ctx.drawImage(qrImage, 250, 360, 800, 800);

      ctx.fillStyle = '#111827';
      ctx.textAlign = 'center';
      ctx.font = '136px "Courier New", monospace';
      ctx.fillText(activation.pin, 650, 1270);

      ctx.font = '42px Arial, sans-serif';
      drawWrappedCenteredText(ctx, activation.join_url, 650, 1400, 1100, 56);

      const url = canvas.toDataURL('image/png');
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `quiz-qr-${activation.pin}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      window.alert('Nie udało się przygotować pliku do pobrania.');
    }
  };

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
              {formatAdminDate(activation.started_at, 'datetime') ?? '—'}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className={adminToolbarButtonClass}
                onClick={openPresenterWindow}
              >
                <ExternalLink size={14} aria-hidden />
                Otwórz ekran uczestników
              </button>
              <button
                type="button"
                className={adminToolbarButtonClass}
                onClick={() => void downloadPrintableQrBoard()}
              >
                <Download size={14} aria-hidden />
                Pobierz planszę QR
              </button>
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
