'use client';

import { Plus, RefreshCcw, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import StatusBadge from '@/app/components/common/StatusBadge';
import type { QuizCard } from '@/app/types';
import { uploadImport } from '@/lib/import-export/client';

import AdminLayout from '../layout/AdminLayout';
import { statusColors } from '../shared/constants';

interface AdminPanelProps {
  quizzes: QuizCard[];
  isLoading?: boolean;
  error?: string | null;
  logoHref?: string;
  menuActiveItem?: string;
  onMenuNavigate?: (menuItemId: string) => void;
  onCreateQuiz?: () => void;
  onOpenQuiz?: (quizId: string) => void;
  onRefresh?: () => void;
  onLogout?: () => void;
  onImportedQuiz?: (quizId: string) => void;
}

function pluralizeQuiz(n: number): string {
  if (n === 1) return 'quiz';
  if (n >= 2 && n <= 4) return 'quizy';
  return 'quizów';
}

export default function AdminPanel({
  quizzes,
  isLoading = false,
  error,
  logoHref = '/admin/',
  menuActiveItem = 'quizy',
  onMenuNavigate,
  onCreateQuiz,
  onOpenQuiz,
  onRefresh,
  onLogout,
  onImportedQuiz,
}: AdminPanelProps) {
  const canCreateQuiz = Boolean(onCreateQuiz);
  const canOpenQuiz = Boolean(onOpenQuiz);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const [importBusy, setImportBusy] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <AdminLayout
      activeItem={menuActiveItem}
      logoHref={logoHref}
      onMenuNavigate={onMenuNavigate}
      onLogout={onLogout}
    >
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[var(--text-dark)]">
          Moje Quizy
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--text-muted)]">
            {quizzes.length} {pluralizeQuiz(quizzes.length)}
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file || !onImportedQuiz) {
                return;
              }
              setImportBusy(true);
              try {
                const { id, skipped } = await uploadImport(file);
                if (!isMountedRef.current) {
                  return;
                }
                if (skipped.length > 0) {
                  window.alert(
                    `Quiz zaimportowany, ale pominięto ${skipped.length} plik(ów) przekraczających limit rozmiaru:\n\n${skipped.join('\n')}\n\nW edytorze pojawią się puste pola - wgraj brakujące zasoby ponownie.`,
                  );
                }
                onImportedQuiz(id);
              } catch (err) {
                if (isMountedRef.current) {
                  window.alert(
                    err instanceof Error
                      ? err.message
                      : 'Import nie powiódł się.',
                  );
                }
              } finally {
                if (isMountedRef.current) {
                  setImportBusy(false);
                }
              }
            }}
          />
          <button
            type="button"
            disabled={!onImportedQuiz || importBusy}
            aria-disabled={!onImportedQuiz || importBusy}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-dark)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Upload size={14} />
            Importuj (.zip)
          </button>
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

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center text-sm text-[var(--text-muted)]">
            Ładowanie quizów...
          </div>
        ) : quizzes.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center text-sm text-[var(--text-muted)]">
            Brak quizów. Stwórz pierwszy quiz.
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
                {quiz.questionCount} pytań
                {quiz.lastActivatedAt
                  ? ` · ostatnio ${quiz.lastActivatedAt}`
                  : ''}
              </p>
              <footer className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">
                  Utworzony: {quiz.createdAt}
                </span>
                <span className="text-xs font-semibold text-[var(--primary-blue)]">
                  Edytuj
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
