'use client';

import { Calendar, Eye, Pencil, Plus, Trash2, Users } from 'lucide-react';

import type { QuizInfo, ResultRow } from '@/app/types';
import { cn } from '@/lib/cn';

import Sidebar from './Sidebar';
import TopBar from './TopBar';

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
  const statusColors: Record<string, string> = {
    Aktywny: 'bg-[var(--active)] text-white',
    Stare: 'bg-[var(--orange)] text-white',
  };

  return (
    <div className="flex h-screen w-full bg-[var(--page-bg)]">
      <Sidebar activeItem="quizy" />

      <div className="flex flex-1 flex-col">
        <TopBar />

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-[28px] font-bold text-[var(--text-dark)]">
              Moje Quizy
            </h1>
            <button className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--orange)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
              <Plus size={16} />
              Stwórz nowy quiz
            </button>
          </div>

          {/* Quiz Cards */}
          <div className="flex flex-col gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex items-center gap-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5"
              >
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-[var(--text-dark)]">
                      {quiz.title}
                    </span>
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                        statusColors[quiz.status] ||
                          'bg-[var(--card-bg)] text-[var(--text-muted)]',
                      )}
                    >
                      {quiz.status}
                    </span>
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

                {/* Avg Score */}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--orange)]">
                  <span className="text-sm font-bold text-white">
                    {quiz.avgScore}%
                  </span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  Avg Score
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2">
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
                </div>
              </div>
            ))}
          </div>

          {/* Results Table */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[var(--text-dark)]">
                Wyniki — {selectedQuiz}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
              {/* Table Header */}
              <div className="grid grid-cols-4 bg-[var(--primary-blue)] px-4 py-3">
                <span className="text-sm font-semibold text-white">Imię</span>
                <span className="text-sm font-semibold text-white">Wynik</span>
                <span className="text-sm font-semibold text-white">Czas</span>
                <span className="text-sm font-semibold text-white">Data</span>
              </div>

              {/* Table Rows */}
              {results.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-4 border-t border-[var(--border)] px-4 py-3"
                >
                  <span className="text-sm font-medium text-[var(--text-dark)]">
                    {row.name}
                  </span>
                  <span>
                    <span className="rounded-md bg-[var(--orange)] px-2 py-0.5 text-xs font-bold text-white">
                      {row.score}%
                    </span>
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {row.time}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {row.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
