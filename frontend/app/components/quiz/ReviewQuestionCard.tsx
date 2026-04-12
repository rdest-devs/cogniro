import { CircleCheck, CircleX } from 'lucide-react';

import type { ReviewQuestion } from '@/app/types';
import { cn } from '@/lib/cn';

interface ReviewQuestionCardProps {
  question: ReviewQuestion;
}

export default function ReviewQuestionCard({
  question: q,
}: ReviewQuestionCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-2xl border-[1.5px] bg-[var(--card-bg)] p-4',
        q.isCorrect ? 'border-[var(--correct-fg)]' : 'border-[var(--wrong-fg)]',
      )}
    >
      <header className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[var(--text-muted)]">
          Pytanie {q.number}
        </span>
        {q.isCorrect ? (
          <span className="flex items-center gap-1 rounded-full bg-[var(--correct-bg)] px-2.5 py-1">
            <CircleCheck size={12} className="text-[var(--correct-fg)]" />
            <span className="text-[11px] font-semibold text-[var(--correct-fg)]">
              Poprawna
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-[var(--wrong-bg)] px-2.5 py-1">
            <CircleX size={12} className="text-[var(--wrong-fg)]" />
            <span className="text-[11px] font-semibold text-[var(--wrong-fg)]">
              Błędna
            </span>
          </span>
        )}
      </header>

      <p className="text-sm leading-[1.4] font-semibold text-[var(--text-dark)]">
        {q.text}
      </p>

      <div className="flex flex-col gap-2">
        {q.answers.map((a, i) => (
          <div
            key={`${i}-${a.text}`}
            className={cn(
              'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5',
              a.state === 'correct-selected' &&
                'border-[1.5px] border-[var(--correct-fg)] bg-[var(--correct-bg)]',
              a.state === 'wrong-selected' &&
                'border-[1.5px] border-[var(--wrong-fg)] bg-[var(--wrong-bg)]',
              a.state === 'correct' &&
                'border-[1.5px] border-[var(--correct-fg)] bg-[var(--correct-bg)]',
              a.state === 'neutral' &&
                'border border-[var(--border)] bg-[var(--page-bg)]',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full',
                a.state === 'correct-selected' && 'bg-[var(--correct-fg)]',
                a.state === 'wrong-selected' && 'bg-[var(--wrong-fg)]',
                a.state === 'correct' && 'bg-[var(--correct-fg)]',
                a.state === 'neutral' &&
                  'border-[1.5px] border-[var(--border)] bg-white',
              )}
            >
              {(a.state === 'correct-selected' || a.state === 'correct') && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M1.5 5L4 7.5L8.5 2.5"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {a.state === 'wrong-selected' && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </span>
            <span
              className={cn(
                'text-sm',
                a.state === 'correct-selected'
                  ? 'font-semibold text-[var(--correct-fg)]'
                  : a.state === 'wrong-selected'
                    ? 'font-semibold text-[var(--wrong-fg)]'
                    : a.state === 'correct'
                      ? 'font-semibold text-[var(--correct-fg)]'
                      : 'font-medium text-[var(--text-dark)]',
              )}
            >
              {a.text}
            </span>
            {a.yourAnswer && (
              <span
                className={cn(
                  'ml-auto text-[11px] font-medium',
                  a.state === 'correct-selected'
                    ? 'text-[var(--correct-fg)]'
                    : 'text-[var(--wrong-fg)]',
                )}
              >
                Twoja odpowiedź
              </span>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}
