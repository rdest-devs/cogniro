'use client';
import {
  Calendar,
  Download,
  Eye,
  List,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { ActivateModal } from '@/app/components/admin/dashboard/ActivateModal';
import { SortableTh } from '@/app/components/common/SortableTh';
import StatusBadge from '@/app/components/common/StatusBadge';
import type { QuizInfo, ResultRow } from '@/app/types';
import { useSortableColumns } from '@/hooks/useSortableColumns';
import { AdminQuizApiError, deleteAdminQuiz } from '@/lib/admin-quiz';
import { parseResultDate, parseTimeSeconds } from '@/lib/admin-result-sort';
import { downloadExport } from '@/lib/import-export/client';
import { type ActivateBody, activateQuiz } from '@/lib/sessions/client';

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

const SORT_COLUMNS = [
  { key: 'name', label: 'Imię' },
  { key: 'score', label: 'Wynik' },
  { key: 'time', label: 'Czas' },
  { key: 'date', label: 'Data' },
] satisfies { key: SortKey; label: string }[];

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
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [panelAnchor, setPanelAnchor] = useState<{
    top: number;
    right: number;
  } | null>(null);

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

  const handleActivateConfirm = useCallback(
    async (quizId: string, body: ActivateBody) => {
      setActivating(true);
      try {
        await activateQuiz(quizId, body);
        setExpandedQuizId(null);
        goRunning(quizId);
      } catch {
        window.alert('Nie udało się uruchomić quizu.');
      } finally {
        setActivating(false);
      }
    },
    [goRunning],
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

  const sort = useSortableColumns<SortKey>({ initialKey: 'score' });

  const sortedResults = useMemo(() => {
    const dir = sort.sortDir === 'asc' ? 1 : -1;
    /** Compares two numbers, always sorting NaN (invalid) values last regardless of direction. */
    const compareNumeric = (av: number, bv: number) => {
      const aNaN = Number.isNaN(av);
      const bNaN = Number.isNaN(bv);
      if (aNaN || bNaN) return aNaN === bNaN ? 0 : aNaN ? 1 : -1;
      return (av - bv) * dir;
    };
    return [...resultsForQuiz].sort((a, b) => {
      if (sort.sortKey === 'score') return (a.score - b.score) * dir;
      if (sort.sortKey === 'name')
        return a.name.localeCompare(b.name, 'pl') * dir;
      if (sort.sortKey === 'time')
        return compareNumeric(
          parseTimeSeconds(a.time),
          parseTimeSeconds(b.time),
        );
      if (sort.sortKey === 'date')
        return compareNumeric(parseResultDate(a.date), parseResultDate(b.date));
      return 0;
    });
  }, [resultsForQuiz, sort.sortKey, sort.sortDir]);

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
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPanelAnchor({
                      top: rect.bottom + 8,
                      right: window.innerWidth - rect.right,
                    });
                    setExpandedQuizId(
                      expandedQuizId === quiz.id ? null : quiz.id,
                    );
                  }}
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
              Wyniki (demo) - {selectedQuiz.title}
            </h2>

            <table className={adminBlueHeadTableClass}>
              <thead className={adminBlueHeadTableTheadClass}>
                <tr>
                  {SORT_COLUMNS.map(({ key, label }) => (
                    <SortableTh
                      key={key}
                      columnKey={key}
                      label={label}
                      sort={sort}
                      className={adminBlueHeadTableThClass}
                    />
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

      {expandedQuizId && panelAnchor && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setExpandedQuizId(null)}
          />
          <div
            className="fixed z-50 w-[420px]"
            style={{ top: panelAnchor.top, right: panelAnchor.right }}
          >
            <ActivateModal
              onConfirm={(body) =>
                void handleActivateConfirm(expandedQuizId, body)
              }
              onCancel={() => setExpandedQuizId(null)}
              busy={activating}
            />
          </div>
        </>
      )}
    </AdminLayout>
  );
}
