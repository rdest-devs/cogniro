'use client';

import { cn } from '@/lib/cn';

import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface QuizCard {
  id: string;
  title: string;
  questionsCount: number;
  responsesCount: number;
  createdAt: string;
  status: 'Aktywny' | 'Stare' | 'Zakończony';
}

interface AdminPanelProps {
  quizzes?: QuizCard[];
}

const statusColors: Record<string, string> = {
  Aktywny: 'bg-[var(--active)] text-white',
  Stare: 'bg-[var(--orange)] text-white',
  Zakończony: 'bg-[var(--wrong-fg)] text-white',
};

export default function AdminPanel({
  quizzes = [
    {
      id: '1',
      title: 'Quiz z Informatyki',
      questionsCount: 10,
      responsesCount: 48,
      createdAt: '12 mar 2026',
      status: 'Aktywny',
    },
    {
      id: '2',
      title: 'Algorytmy i Struktury Danych',
      questionsCount: 15,
      responsesCount: 32,
      createdAt: '6 mar 2026',
      status: 'Aktywny',
    },
    {
      id: '3',
      title: 'Bazy Danych SQL',
      questionsCount: 8,
      responsesCount: 0,
      createdAt: '15 mar 2026',
      status: 'Stare',
    },
    {
      id: '4',
      title: 'Sieci Komputerowe',
      questionsCount: 12,
      responsesCount: 65,
      createdAt: '1 mar 2026',
      status: 'Zakończony',
    },
  ],
}: AdminPanelProps) {
  return (
    <div className="flex h-screen w-full bg-[var(--page-bg)]">
      <Sidebar activeItem="quizy" />

      <div className="flex flex-1 flex-col">
        <TopBar />

        <div className="flex flex-1 flex-col gap-6 p-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-[28px] font-bold text-[var(--text-dark)]">
              Moje Quizy
            </h1>
            <span className="text-sm font-medium text-[var(--text-muted)]">
              {quizzes.length} quizy
            </span>
          </div>

          {/* Quiz Grid */}
          <div className="grid grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 transition-shadow hover:shadow-md"
              >
                <span
                  className={cn(
                    'w-fit rounded-md px-2 py-0.5 text-[11px] font-semibold',
                    statusColors[quiz.status],
                  )}
                >
                  {quiz.status}
                </span>
                <h3 className="text-base font-bold text-[var(--text-dark)]">
                  {quiz.title}
                </h3>
                <p className="text-[13px] text-[var(--text-muted)]">
                  {quiz.questionsCount} pytań · {quiz.responsesCount} odpowiedzi
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">
                    Utworzony: {quiz.createdAt}
                  </span>
                  <button className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-dark)]">
                    ···
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Card */}
            <button className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-transparent py-12 text-3xl text-[var(--text-muted)] transition-colors hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]">
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
