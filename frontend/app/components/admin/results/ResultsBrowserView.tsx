'use client';

import { ArrowLeft, RefreshCcw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import AdminLayout from '@/app/components/admin/layout/AdminLayout';
import {
  adminDangerOutlineButtonClass,
  adminToolbarButtonClass,
} from '@/app/components/admin/shared/constants';
import { deleteResult, listDates, listDay } from '@/lib/results/client';

type Props = {
  adminBase: string;
  quizFilter: string | null;
  menuActiveItem?: string;
  onMenuNavigate?: (menuItemId: string) => void;
  onBack: () => void;
  onCreateQuiz?: () => void;
  onLogout?: () => void;
};

type ResultListRow = {
  date: string;
  filename: string;
  quiz_id: string;
  quiz_title: string;
  session_started_at: string;
  session_stopped_at: string;
  score_count: number;
};

function formatListDate(folderDate: string): string {
  const parsed = new Date(`${folderDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return folderDate;
  }
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function formatSessionTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function ResultsBrowserView({
  adminBase,
  quizFilter,
  menuActiveItem = 'statystyki',
  onMenuNavigate,
  onBack,
  onCreateQuiz,
  onLogout,
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<ResultListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const dates = await listDates();
      const perDay = await Promise.all(
        dates.map(async (d) => {
          const files = await listDay(d);
          return files.map((f) => ({ ...f, date: d }) satisfies ResultListRow);
        }),
      );
      let flat = perDay.flat();
      if (quizFilter) {
        flat = flat.filter((r) => r.quiz_id === quizFilter);
      }
      flat.sort((a, b) =>
        b.session_started_at.localeCompare(a.session_started_at),
      );
      setRows(flat);
    } catch (e) {
      setErr(String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [quizFilter]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ view: 'results', ...extra });
    if (quizFilter) {
      p.set('quizFilter', quizFilter);
    }
    return p.toString();
  };

  const openDetail = (row: ResultListRow) => {
    router.push(`${adminBase}?${qs({ date: row.date, file: row.filename })}`);
  };

  return (
    <AdminLayout
      activeItem={menuActiveItem}
      logoHref={adminBase}
      onMenuNavigate={onMenuNavigate}
      onCreateQuiz={onCreateQuiz}
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
        <button
          type="button"
          disabled={loading}
          className={adminToolbarButtonClass}
          onClick={() => void loadAll()}
        >
          <RefreshCcw size={14} aria-hidden />
          Odśwież
        </button>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <h2 className="text-xl font-bold text-[var(--text-dark)]">
          Statystyki
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Zapisane sesje z wynikami — kliknij wiersz, aby zobaczyć szczegóły.
        </p>

        {err && <p className="mt-4 text-sm text-[var(--wrong-fg)]">{err}</p>}

        {loading ? (
          <p className="mt-6 text-sm text-[var(--text-muted)]">Ładowanie…</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--text-muted)]">
            Brak zapisanych statystyk.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="py-2 pr-4 font-semibold">Data</th>
                  <th className="py-2 pr-4 font-semibold">Nazwa</th>
                  <th className="py-2 pr-4 font-semibold">ID quizu</th>
                  <th className="py-2 pr-4 font-semibold">Godzina</th>
                  <th className="py-2 pr-4 text-right font-semibold">Wyniki</th>
                  <th className="py-2 pl-2 text-right font-semibold">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={`${r.date}-${r.filename}`}
                    className="cursor-pointer border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--selected-bg)]"
                    onClick={() => openDetail(r)}
                  >
                    <td className="py-3 pr-4 text-[var(--text-dark)]">
                      {formatListDate(r.date)}
                    </td>
                    <td className="max-w-[220px] truncate py-3 pr-4 font-medium text-[var(--text-dark)]">
                      {r.quiz_title}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-[var(--text-muted)]">
                      {r.quiz_id}
                    </td>
                    <td className="py-3 pr-4 text-[var(--text-dark)]">
                      {formatSessionTime(r.session_started_at)}
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--text-muted)] tabular-nums">
                      {r.score_count}
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <button
                        type="button"
                        className={adminDangerOutlineButtonClass}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Usunąć plik ${r.filename}?`)) {
                            void (async () => {
                              await deleteResult(r.date, r.filename);
                              await loadAll();
                            })();
                          }
                        }}
                      >
                        <Trash2 size={14} aria-hidden />
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
