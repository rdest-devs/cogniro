'use client';

import { ChevronDown } from 'lucide-react';

import type { Question } from '@/app/types';
import { cn } from '@/lib/cn';

import { typeColors } from '../shared/constants';
import StatusBadge from '../shared/StatusBadge';

interface QuestionListItemProps {
  question: Question;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function QuestionListItem({
  question: q,
  isExpanded,
  onToggle,
}: QuestionListItemProps) {
  const panelId = `question-panel-${q.id}`;

  return (
    <article>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors',
          isExpanded
            ? 'border-[var(--orange)] bg-[var(--selected-bg)]'
            : 'border-[var(--border)] bg-[var(--card-bg)]',
        )}
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-sm font-bold text-white">
          {q.id}
        </span>
        <span className="flex-1 text-left text-sm font-medium text-[var(--text-dark)]">
          {q.text}
        </span>
        <StatusBadge label={q.type} colorMap={typeColors} />
      </button>

      {isExpanded && (
        <div
          id={panelId}
          className="mt-2 flex flex-col gap-4 rounded-2xl border border-[var(--orange)] bg-[var(--selected-bg)] p-5"
        >
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-[var(--text-muted)]">
              Treść pytania
            </span>
            <input
              defaultValue={q.text}
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-[var(--text-muted)]">
              Typ pytania
            </span>
            <div className="relative w-48">
              <select
                defaultValue={q.type}
                className="w-full appearance-none rounded-xl border border-[var(--border)] bg-white px-3 py-2 pr-8 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
              >
                <option>Jednokrotny</option>
                <option>Wielokrotny</option>
                <option>Obrazkowy</option>
                <option>Kolejność</option>
                <option>Suwak</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--text-muted)]"
              />
            </div>
          </label>

          {q.answers.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-[13px] font-medium text-[var(--text-muted)]">
                Odpowiedzi ({q.answers.length})
              </legend>
              {q.answers.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md',
                      a.isCorrect
                        ? 'bg-[var(--orange)]'
                        : 'border border-[var(--border)] bg-white',
                    )}
                  >
                    {a.isCorrect && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6L5 9L10 3"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <input
                    defaultValue={a.text}
                    className={cn(
                      'flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]',
                      a.isCorrect
                        ? 'border-[var(--orange)] bg-[var(--selected-bg)]'
                        : 'border-[var(--border)] bg-white',
                    )}
                  />
                  {a.isCorrect && (
                    <span className="text-[11px] font-medium text-[var(--active)]">
                      Poprawna
                    </span>
                  )}
                </div>
              ))}
            </fieldset>
          )}
        </div>
      )}
    </article>
  );
}
