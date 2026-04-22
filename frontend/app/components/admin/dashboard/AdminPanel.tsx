'use client';

import { RefreshCcw } from 'lucide-react';
import { Plus } from 'lucide-react';

import StatusBadge from '@/app/components/common/StatusBadge';
import type { QuizCard } from '@/app/types';

import AdminLayout from '../layout/AdminLayout';
import { statusColors } from '../shared/constants';

interface AdminPanelProps {
  quizzes: QuizCard[];
  isLoading?: boolean;
  error?: string | null;
  onCreateQuiz?: () => void;
  onOpenQuiz?: (quizId: string) => void;
  onRefresh?: () => void;
}

export default function AdminPanel({
  quizzes,
  isLoading = false,
  error,
  onCreateQuiz,
  onOpenQuiz,
  onRefresh,
}: AdminPanelProps) {
  const canCreateQuiz = Boolean(onCreateQuiz);
  const canOpenQuiz = Boolean(onOpenQuiz);

  return (
    <AdminLayout onCreateQuiz={onCreateQuiz}>
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[var(--text-dark)]">
          Moje Quizy
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--text-muted)]">
            {quizzes.length} quizy
          </span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-dark)]"
            >
              <RefreshCcw size={14} />
              Odśwież
            </button>
          )}
          <button
            type="button"
            onClick={onCreateQuiz}
            disabled={!canCreateQuiz}
            aria-disabled={!canCreateQuiz}
            className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--orange)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />
            Stwórz nowy quiz
          </button>
        </div>
      </header>

      {error && (
        <div className="mt-4 rounded-xl border border-[var(--wrong-fg)] bg-[var(--selected-bg)] px-4 py-3 text-sm text-[var(--wrong-fg)]">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center text-sm text-[var(--text-muted)]">
            Ładowanie quizów...
          </div>
        ) : (
          quizzes.map((quiz) => (
            <button
              key={quiz.id}
              type="button"
              onClick={() => onOpenQuiz?.(quiz.id)}
              disabled={!canOpenQuiz}
              aria-disabled={!canOpenQuiz}
              className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 text-left transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
            >
              <StatusBadge label={quiz.status} colorMap={statusColors} />
              <h3 className="text-base font-bold text-[var(--text-dark)]">
                {quiz.title}
              </h3>
              <p className="text-[13px] text-[var(--text-muted)]">
                {quiz.questionsCount} pytań · {quiz.responsesCount} odpowiedzi
              </p>
              <footer className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">
                  Utworzony: {quiz.createdAt}
                </span>
                <span className="text-xs font-semibold text-[var(--primary-blue)]">
                  Szczegoly
                </span>
              </footer>
            </button>
          ))
        )}

        <button
          type="button"
          onClick={onCreateQuiz}
          disabled={!canCreateQuiz}
          aria-disabled={!canCreateQuiz}
          aria-label="Dodaj nowy quiz"
          className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-transparent py-12 text-3xl text-[var(--text-muted)] transition-colors hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-muted)]"
        >
          +
        </button>
      </div>
    </AdminLayout>
  );
}
