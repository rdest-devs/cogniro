'use client';

import { Calendar, Eye, Pencil, Trash2, Users } from 'lucide-react';

import StatusBadge from '@/app/components/common/StatusBadge';
import type { QuizInfo, ResultRow } from '@/app/types';

import AdminLayout from '../layout/AdminLayout';
import { statusColors } from '../shared/constants';

interface QuizDetailProps {
  quizzes: QuizInfo[];
  selectedQuizId?: string | null;
  resultsForQuiz: ResultRow[];
  onCreateQuiz?: () => void;
  onEditQuiz?: (quizId: string) => void;
  onSelectQuiz?: (quizId: string) => void;
}

export default function QuizDetail({
  quizzes,
  selectedQuizId,
  resultsForQuiz,
  onCreateQuiz,
  onEditQuiz,
  onSelectQuiz,
}: QuizDetailProps) {
  const selectedQuiz =
    quizzes.find((quiz) => quiz.id === selectedQuizId) ?? quizzes[0];

  return (
    <AdminLayout onCreateQuiz={onCreateQuiz}>
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
                <div className="flex items-center gap-4 text-[13px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {quiz.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {quiz.participants} uczestników
                  </span>
                </div>
              </button>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--orange)]">
                <span className="text-sm font-bold text-white">
                  {quiz.avgScore}%
                </span>
              </div>

              <nav className="flex items-center gap-2">
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
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--orange)] px-3 py-2 text-xs font-semibold text-[var(--orange)] hover:bg-[var(--orange)] hover:text-white"
                >
                  <Eye size={14} />
                  Wyniki
                </button>
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--wrong-fg)] px-3 py-2 text-xs font-semibold text-[var(--wrong-fg)] hover:bg-[var(--wrong-fg)] hover:text-white"
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
              Wyniki — {selectedQuiz.title}
            </h2>

            <table className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
              <thead className="bg-[var(--primary-blue)]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                    Imie
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
                {resultsForQuiz.map((row, index) => (
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
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
