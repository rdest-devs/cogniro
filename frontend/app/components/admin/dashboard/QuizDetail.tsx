'use client';

import { Calendar, Eye, List, Pencil, Play, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import StatusBadge from '@/app/components/common/StatusBadge';
import type { QuizInfo, ResultRow } from '@/app/types';
import { AdminQuizApiError, deleteAdminQuiz } from '@/lib/admin-quiz';

import AdminLayout from '../layout/AdminLayout';
import { statusColors } from '../shared/constants';

interface QuizDetailProps {
  quizzes: QuizInfo[];
  selectedQuizId?: string | null;
  resultsForQuiz: ResultRow[];
  adminBase: string;
  onCreateQuiz?: () => void;
  onEditQuiz?: (quizId: string) => void;
  onSelectQuiz?: (quizId: string) => void;
  onLogout?: () => void;
  onQuizDeleted?: () => void;
}

export default function QuizDetail({
  quizzes,
  selectedQuizId,
  resultsForQuiz,
  adminBase,
  onCreateQuiz,
  onEditQuiz,
  onSelectQuiz,
  onLogout,
  onQuizDeleted,
}: QuizDetailProps) {
  const router = useRouter();
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null);

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

  return (
    <AdminLayout onCreateQuiz={onCreateQuiz} onLogout={onLogout}>
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

        {selectedQuiz && (
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-[var(--text-dark)]">
              Wyniki (demo) — {selectedQuiz.title}
            </h2>

            <table className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
              <thead className="bg-[var(--primary-blue)]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                    Imię
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                    Wynik
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                    Czas
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {resultsForQuiz.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                    >
                      Brak danych demo dla tego quizu. Rzeczywiste wyniki w
                      sekcji Wyniki.
                    </td>
                  </tr>
                ) : (
                  resultsForQuiz.map((row, index) => (
                    <tr
                      key={`${row.name}-${index}`}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-[var(--text-dark)]">
                        {row.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-[var(--orange)] px-2 py-0.5 text-xs font-bold text-white">
                          {row.score}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                        {row.time}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
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
