'use client';

import { Calendar, Eye, Pencil, Plus, Trash2, Users } from 'lucide-react';

import type { QuizInfo, ResultRow } from '@/app/types';

import AdminLayout from './AdminLayout';
import { statusColors } from './constants';
import StatusBadge from './StatusBadge';

interface QuizDetailProps {
  quizzes: QuizInfo[];
  selectedQuiz: string;
  results: ResultRow[];
}

export default function QuizDetail({
  quizzes,
  selectedQuiz,
  results,
}: QuizDetailProps) {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold text-[var(--text-dark)]">
            Moje Quizy
          </h1>
          <button className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--orange)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
            <Plus size={16} />
            Stwórz nowy quiz
          </button>
        </header>

        {/* Quiz Cards */}
        <section className="flex flex-col gap-4">
          {quizzes.map((quiz) => (
            <article
              key={quiz.id}
              className="flex items-center gap-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5"
            >
              <div className="flex flex-1 flex-col gap-1">
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
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--orange)]">
                <span className="text-sm font-bold text-white">
                  {quiz.avgScore}%
                </span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                Avg Score
              </span>

              <nav className="flex items-center gap-2">
                <button className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--primary-blue)] px-3 py-2 text-xs font-semibold text-[var(--primary-blue)] hover:bg-[var(--primary-blue)] hover:text-white">
                  <Pencil size={14} />
                  Edytuj
                </button>
                <button className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--orange)] px-3 py-2 text-xs font-semibold text-[var(--orange)] hover:bg-[var(--orange)] hover:text-white">
                  <Eye size={14} />
                  Wyniki
                </button>
                <button className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--wrong-fg)] px-3 py-2 text-xs font-semibold text-[var(--wrong-fg)] hover:bg-[var(--wrong-fg)] hover:text-white">
                  <Trash2 size={14} />
                  Usuń
                </button>
              </nav>
            </article>
          ))}
        </section>

        {/* Results Table */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-[var(--text-dark)]">
            Wyniki — {selectedQuiz}
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
              {results.map((row, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
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
      </div>
    </AdminLayout>
  );
}
