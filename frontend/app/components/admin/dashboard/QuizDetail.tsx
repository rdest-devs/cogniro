'use client';
import {
  Calendar,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Download,
  Eye,
  List,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import StatusBadge from '@/app/components/common/StatusBadge';
import type { QuizInfo, ResultRow } from '@/app/types';
import { AdminQuizApiError, deleteAdminQuiz } from '@/lib/admin-quiz';
import { downloadExport } from '@/lib/import-export/client';

import AdminLayout from '../layout/AdminLayout';
import {
  adminBlueHeadTableClass,
  adminBlueHeadTableTdClass,
  adminBlueHeadTableTdMutedClass,
  adminBlueHeadTableThClass,
  adminBlueHeadTableTheadClass,
  statusColors,
} from '../shared/constants';

type SortKey = 'name' | 'score' | 'time' | 'date';
type SortDir = 'asc' | 'desc';

interface QuizDetailProps {
  quizzes: QuizInfo[];
  selectedQuizId?: string | null;
  /** Only when the admin panel is showing demo data (e.g. API error); otherwise hidden. */
  legacyDemoResultsEnabled?: boolean;
  resultsForQuiz: ResultRow[];
  adminBase: string;
  menuActiveItem?: string;
  onMenuNavigate?: (menuItemId: string) => void;
  onEditQuiz?: (quizId: string) => void;
  onSelectQuiz?: (quizId: string) => void;
  onLogout?: () => void;
  onQuizDeleted?: () => void;
}

export default function QuizDetail({
  quizzes,
  selectedQuizId,
  legacyDemoResultsEnabled = false,
  resultsForQuiz,
  adminBase,
  menuActiveItem = '',
  onMenuNavigate,
  onEditQuiz,
  onSelectQuiz,
  onLogout,
  onQuizDeleted,
}: QuizDetailProps) {
  const router = useRouter();
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState<string | null>(null);

  const selectedQuiz = selectedQuizId
    ? quizzes.find((quiz) => quiz.id === selectedQuizId)
    : quizzes[0];

  const goRunning = useCallback(
    (quizId: string) => {
      const qs = new URLSearchParams({ quiz: quizId, view: 'running' });
      router.push(`${adminBase}?${qs.toString()}`);
    },
    [router, adminBase],
  );

  const goResults = useCallback(
    (quizId: string) => {
      const qs = new URLSearchParams({
        view: 'results',
        quizFilter: quizId,
      });
      router.push(`${adminBase}?${qs.toString()}`);
    },
    [router, adminBase],
  );

  const handleExport = useCallback(async (quizId: string) => {
    setExportBusy(quizId);
    try {
      await downloadExport(quizId);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Eksport nie powiódł się.',
      );
    } finally {
      setExportBusy(null);
    }
  }, []);

  const handleDelete = useCallback(
    async (quizId: string) => {
      if (
        !confirm('Na pewno usunąć ten quiz? Tej operacji nie można cofnąć.')
      ) {
        return;
      }
      setDeleteBusy(quizId);
      try {
        await deleteAdminQuiz(quizId);
        onQuizDeleted?.();
        router.push(adminBase);
      } catch (error) {
        if (error instanceof AdminQuizApiError && error.status === 409) {
          window.alert('Nie można usunąć quizu w trakcie sesji.');
        } else if (error instanceof Error) {
          window.alert(error.message);
        } else {
          window.alert('Nie udało się usunąć quizu.');
        }
      } finally {
        setDeleteBusy(null);
      }
    },
    [router, adminBase, onQuizDeleted],
  );

  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sortedResults = useMemo(() => {
    return [...resultsForQuiz].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'score') {
        cmp = a.score - b.score;
      } else if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name, 'pl');
      } else if (sortKey === 'time') {
        cmp = a.time.localeCompare(b.time);
      } else if (sortKey === 'date') {
        cmp = a.date.localeCompare(b.date);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [resultsForQuiz, sortKey, sortDir]);

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

  return (
    <AdminLayout
      activeItem={menuActiveItem}
      logoHref={adminBase}
      onMenuNavigate={onMenuNavigate}
      onLogout={onLogout}
    >
      <div className="flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold text-[var(--text-dark)]">
            Szczegóły quizów
          </h1>
        </header>

        <section className="flex flex-col gap-4">
          {quizzes.map((quiz) => (
            <article
              key={quiz.id}
              className="flex items-center gap-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5"
            >
              <button
                type="button"
                onClick={() => onSelectQuiz?.(quiz.id)}
                className="flex flex-1 cursor-pointer flex-col gap-1 text-left"
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-[var(--text-dark)]">
                    {quiz.title}
                  </h3>
                  <StatusBadge label={quiz.status} colorMap={statusColors} />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {quiz.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <List size={14} />
                    {quiz.questionCount} pytań
                  </span>
                  {quiz.lastActivatedAt && (
                    <span className="flex items-center gap-1">
                      Ostatnio: {quiz.lastActivatedAt}
                    </span>
                  )}
                </div>
              </button>

              {quiz.avgScore !== undefined && (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--orange)]">
                  <span className="text-sm font-bold text-white">
                    {quiz.avgScore}%
                  </span>
                </div>
              )}

              <nav className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEditQuiz?.(quiz.id)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--primary-blue)] px-3 py-2 text-xs font-semibold text-[var(--primary-blue)] hover:bg-[var(--primary-blue)] hover:text-white"
                >
                  <Pencil size={14} />
                  Edytuj
                </button>
                <button
                  type="button"
                  disabled={exportBusy === quiz.id}
                  onClick={() => void handleExport(quiz.id)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-dark)] hover:bg-[var(--page-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={14} />
                  Eksport (.zip)
                </button>
                <button
                  type="button"
                  onClick={() => goRunning(quiz.id)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--text-dark)] px-3 py-2 text-xs font-semibold text-[var(--text-dark)] hover:bg-[var(--text-dark)] hover:text-white"
                >
                  <Play size={14} />
                  Uruchom quiz
                </button>
                <button
                  type="button"
                  onClick={() => goResults(quiz.id)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--orange)] px-3 py-2 text-xs font-semibold text-[var(--orange)] hover:bg-[var(--orange)] hover:text-white"
                >
                  <Eye size={14} />
                  Wyniki
                </button>
                <button
                  type="button"
                  disabled={deleteBusy === quiz.id}
                  onClick={() => void handleDelete(quiz.id)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--wrong-fg)] px-3 py-2 text-xs font-semibold text-[var(--wrong-fg)] hover:bg-[var(--wrong-fg)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Usuń
                </button>
              </nav>
            </article>
          ))}
        </section>

        {legacyDemoResultsEnabled && selectedQuiz && (
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-[var(--text-dark)]">
              Wyniki (demo) — {selectedQuiz.title}
            </h2>

            <table className={adminBlueHeadTableClass}>
              <thead className={adminBlueHeadTableTheadClass}>
                <tr>
                  {(
                    [
                      { key: 'name', label: 'Imię' },
                      { key: 'score', label: 'Wynik' },
                      { key: 'time', label: 'Czas' },
                      { key: 'date', label: 'Data' },
                    ] as { key: SortKey; label: string }[]
                  ).map(({ key, label }) => (
                    <th key={key} className={adminBlueHeadTableThClass}>
                      <button
                        type="button"
                        onClick={() => handleSort(key)}
                        className="flex cursor-pointer items-center gap-1 hover:opacity-80"
                      >
                        {label}
                        <SortIcon col={key} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedResults.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                    >
                      Brak wpisów demo dla tego quizu w zestawie przykładowym.
                    </td>
                  </tr>
                ) : (
                  sortedResults.map((row, index) => (
                    <tr
                      key={`${row.name}-${index}`}
                      className="border-t border-[var(--border)]"
                    >
                      <td
                        className={`${adminBlueHeadTableTdClass} font-medium`}
                      >
                        {row.name}
                      </td>
                      <td className={adminBlueHeadTableTdClass}>
                        <span className="rounded-md bg-[var(--orange)] px-2 py-0.5 text-xs font-bold text-white">
                          {row.score}%
                        </span>
                      </td>
                      <td className={adminBlueHeadTableTdMutedClass}>
                        {row.time}
                      </td>
                      <td className={adminBlueHeadTableTdMutedClass}>
                        {row.date}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
