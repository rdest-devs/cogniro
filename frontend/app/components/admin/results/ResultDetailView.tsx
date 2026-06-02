'use client';

import { ArrowLeft, Download, List, RefreshCcw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AdminLayout from '@/app/components/admin/layout/AdminLayout';
import {
  adminDangerOutlineButtonClass,
  adminPrimaryOutlineButtonClass,
  adminToolbarButtonClass,
} from '@/app/components/admin/shared/constants';
import {
  formatArchivedScore,
  type ResultArchivePayload,
  resultArchivePayloadSchema,
  resultFileDisplayName,
} from '@/lib/results/archivePayload';
import { deleteResult, readResult } from '@/lib/results/client';
import {
  computeScoreStats,
  statsCsvFromPayload,
} from '@/lib/results/csvExport';

/** Trigger a browser download of `text` as a UTF-8 CSV file. */
function downloadCsv(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Defer cleanup: some browsers resolve the blob lazily, so revoking the URL in
  // the same tick can cancel the download.
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 0);
}

const plNumberFormat = new Intl.NumberFormat('pl-PL');

function formatStat(value: number | null): string {
  return value === null ? '-' : plNumberFormat.format(value);
}

type Props = {
  adminBase: string;
  date: string;
  file: string;
  quizFilter: string | null;
  menuActiveItem?: string;
  onMenuNavigate?: (menuItemId: string) => void;
  onBack: () => void;
  onLogout?: () => void;
};

export function ResultDetailView({
  adminBase,
  date,
  file,
  quizFilter,
  menuActiveItem = 'statystyki',
  onMenuNavigate,
  onBack,
  onLogout,
}: Props) {
  const [payload, setPayload] = useState<unknown>(null);
  const [err, setErr] = useState<string | null>(null);

  /* Clear stale archive UI before each date/file fetch. */
  /* eslint-disable react-hooks/set-state-in-effect -- reset payload/err when inputs change */
  useEffect(() => {
    let cancelled = false;
    setPayload(null);
    setErr(null);
    void (async () => {
      try {
        const data = await readResult(date, file);
        if (!cancelled) {
          setPayload(data);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) {
          setPayload(null);
          setErr(String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, file]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const parsed = useMemo((): ResultArchivePayload | null => {
    if (payload === null) {
      return null;
    }
    const r = resultArchivePayloadSchema.safeParse(payload);
    return r.success ? r.data : null;
  }, [payload]);

  const fileTitle = resultFileDisplayName(file);

  const stats = useMemo(
    () => (parsed ? computeScoreStats(parsed.scores) : null),
    [parsed],
  );

  const qs = () => {
    const p = new URLSearchParams({ view: 'results', date });
    if (quizFilter) {
      p.set('quizFilter', quizFilter);
    }
    return p.toString();
  };

  return (
    <AdminLayout
      activeItem={menuActiveItem}
      logoHref={adminBase}
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
        <Link
          className={adminPrimaryOutlineButtonClass}
          href={`${adminBase}?${qs()}`}
        >
          <List size={14} aria-hidden />
          Lista plików dnia
        </Link>
        <button
          type="button"
          className={adminToolbarButtonClass}
          onClick={() => {
            void (async () => {
              try {
                const data = await readResult(date, file);
                setPayload(data);
                setErr(null);
              } catch (e) {
                setErr(String(e));
              }
            })();
          }}
        >
          <RefreshCcw size={14} aria-hidden />
          Odśwież
        </button>
        {parsed && !err && (
          <button
            type="button"
            className={adminPrimaryOutlineButtonClass}
            onClick={() =>
              downloadCsv(
                `${resultFileDisplayName(file)}-statystyki.csv`,
                statsCsvFromPayload(parsed),
              )
            }
          >
            <Download size={14} aria-hidden />
            Eksportuj CSV
          </button>
        )}
        <button
          type="button"
          className={adminDangerOutlineButtonClass}
          onClick={async () => {
            if (confirm(`Usunąć plik ${file}?`)) {
              try {
                await deleteResult(date, file);
                onBack();
              } catch (e) {
                setErr(String(e));
              }
            }
          }}
        >
          <Trash2 size={14} aria-hidden />
          Usuń plik
        </button>
      </div>
      <section>
        <h2 className="text-xl font-semibold">
          {fileTitle}{' '}
          <span className="text-base font-normal text-zinc-500">({date})</span>
        </h2>
        {err && <p className="text-sm text-red-700">{err}</p>}
        {parsed && !err && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
              <h3 className="text-lg font-semibold text-[var(--text-dark)]">
                {parsed.quiz_title}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Quiz:{' '}
                <span className="font-mono text-[var(--text-dark)]">
                  {parsed.quiz_id}
                </span>
              </p>
              {(parsed.session_started_at || parsed.session_stopped_at) && (
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {parsed.session_started_at && (
                    <>Start: {parsed.session_started_at}</>
                  )}
                  {parsed.session_started_at &&
                    parsed.session_stopped_at &&
                    ' · '}
                  {parsed.session_stopped_at && (
                    <>Koniec: {parsed.session_stopped_at}</>
                  )}
                </p>
              )}
            </div>

            {stats && (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Uczestnicy', value: formatStat(stats.count) },
                  { label: 'Średni wynik', value: formatStat(stats.average) },
                  { label: 'Min. wynik', value: formatStat(stats.min) },
                  { label: 'Maks. wynik', value: formatStat(stats.max) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3"
                  >
                    <dt className="text-xs font-medium text-[var(--text-muted)]">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-[var(--text-dark)] tabular-nums">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--page-bg)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[var(--text-dark)]">
                      Pseudonim
                    </th>
                    <th className="px-4 py-3 font-semibold text-[var(--text-dark)]">
                      Wynik (zdobyte / maks.)
                    </th>
                    <th className="px-4 py-3 font-semibold text-[var(--text-dark)]">
                      Wysłano
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.scores.map((row) => (
                    <tr
                      key={`${row.nickname}-${row.submitted_at}`}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-4 py-2.5 font-medium text-[var(--text-dark)]">
                        {row.nickname}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-dark)] tabular-nums">
                        {formatArchivedScore(row.score, parsed.max_score ?? 0)}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)]">
                        {row.submitted_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {payload !== null && !err && !parsed && (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Ten plik nie ma oczekiwanego formatu archiwum (quiz_id, quiz_title,
            scores).
          </p>
        )}
      </section>
    </AdminLayout>
  );
}
