'use client';
import { Plus } from 'lucide-react';

import StatusBadge from '@/app/components/common/StatusBadge';
import type { QuizCard } from '@/app/types';

import AdminLayout from '../layout/AdminLayout';
import { statusColors } from '../shared/constants';

interface AdminPanelProps {
  quizzes: QuizCard[];
}

export default function AdminPanel({ quizzes }: AdminPanelProps) {
  return (
    <AdminLayout>
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[var(--text-dark)]">
          Moje Quizy
        </h1>
        <span className="text-sm font-medium text-[var(--text-muted)]">
          {quizzes.length} quizy
        </span>
        <button className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--orange)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
          <Plus size={16} />
          Stwórz nowy quiz
        </button>
      </header>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {quizzes.map((quiz) => (
          <article
            key={quiz.id}
            className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 transition-shadow hover:shadow-md"
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
              <button
                aria-label="Więcej opcji"
                className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-dark)]"
              >
                ···
              </button>
            </footer>
          </article>
        ))}

        <button
          aria-label="Dodaj nowy quiz"
          className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-transparent py-12 text-3xl text-[var(--text-muted)] transition-colors hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]"
        >
          +
        </button>
      </div>
    </AdminLayout>
  );
}
