'use client';

import {
  ArrowLeft,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  List,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AdminLayout from '@/app/components/admin/layout/AdminLayout';
import {
  adminDangerOutlineButtonClass,
  adminPrimaryOutlineButtonClass,
  adminToolbarButtonClass,
} from '@/app/components/admin/shared/constants';
import { formatAdminDate } from '@/lib/admin-date-time';
import {
  formatArchivedScore,
  type ResultArchivePayload,
  resultArchivePayloadSchema,
  resultFileDisplayName,
} from '@/lib/results/archivePayload';
import { deleteResult, readResult } from '@/lib/results/client';

type SortKey = 'nickname' | 'score' | 'submitted_at';
type SortDir = 'asc' | 'desc';

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
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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

  const sortedScores = useMemo(() => {
    if (!parsed) return [];
    return [...parsed.scores].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'score') {
        cmp = a.score - b.score;
      } else if (sortKey === 'nickname') {
        cmp = a.nickname.localeCompare(b.nickname, 'pl');
      } else {
        cmp = a.submitted_at.localeCompare(b.submitted_at);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [parsed, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'score' ? 'desc' : 'asc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <ChevronsUpDown size={13} className="opacity-50" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={13} />
    ) : (
      <ChevronDown size={13} />
    );
  }

  const fileTitle = resultFileDisplayName(file);

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
          <span className="text-base font-normal text-zinc-500">
            ({formatAdminDate(date, 'folder-date') ?? date})
          </span>
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
                    <>
                      Start:{' '}
                      {formatAdminDate(parsed.session_started_at, 'datetime') ??
                        parsed.session_started_at}
                    </>
                  )}
                  {parsed.session_started_at &&
                    parsed.session_stopped_at &&
                    ' · '}
                  {parsed.session_stopped_at && (
                    <>
                      Koniec:{' '}
                      {formatAdminDate(parsed.session_stopped_at, 'datetime') ??
                        parsed.session_stopped_at}
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--page-bg)]">
                  <tr>
                    {(
                      [
                        { key: 'nickname', label: 'Pseudonim' },
                        { key: 'score', label: 'Wynik (zdobyte / maks.)' },
                        { key: 'submitted_at', label: 'Wysłano' },
                      ] as { key: SortKey; label: string }[]
                    ).map(({ key, label }) => (
                      <th
                        key={key}
                        className="px-4 py-3 font-semibold text-[var(--text-dark)]"
                      >
                        <button
                          type="button"
                          onClick={() => handleSort(key)}
                          className="flex cursor-pointer items-center gap-1 hover:opacity-70"
                        >
                          {label}
                          <SortIcon col={key} />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedScores.map((row) => (
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
                        {formatAdminDate(row.submitted_at, 'datetime') ??
                          row.submitted_at}
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
