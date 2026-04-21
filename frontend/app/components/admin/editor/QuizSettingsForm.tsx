'use client';

import { cn } from '@/lib/cn';

interface QuizSettingsFormProps {
  title: string;
  onTitleChange: (value: string) => void;
  timeLimit: number | null;
  onTimeLimitChange: (value: number | null) => void;
  shuffleQuestions: boolean;
  onShuffleQuestionsToggle: () => void;
  showAnswersAfter: boolean;
  onShowAnswersAfterToggle: () => void;
  showLeaderboardAfter: boolean;
  onShowLeaderboardAfterToggle: () => void;
  titleError?: string;
  timeLimitError?: string;
}

export default function QuizSettingsForm({
  title,
  onTitleChange,
  timeLimit,
  onTimeLimitChange,
  shuffleQuestions,
  onShuffleQuestionsToggle,
  showAnswersAfter,
  onShowAnswersAfterToggle,
  showLeaderboardAfter,
  onShowLeaderboardAfterToggle,
  titleError,
  timeLimitError,
}: QuizSettingsFormProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
      <h2 className="text-base font-bold text-[var(--text-dark)]">
        Ustawienia quizu
      </h2>

      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">
            Tytuł quizu
          </span>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
          />
          {titleError && (
            <span className="text-xs text-[var(--wrong-fg)]">{titleError}</span>
          )}
        </label>

        <label className="flex w-28 flex-col gap-1">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">
            Limit (min)
          </span>
          <input
            type="number"
            min={1}
            value={timeLimit ?? ''}
            onChange={(event) =>
              onTimeLimitChange(
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
            placeholder="bez limitu"
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
          />
          {timeLimitError && (
            <span className="text-xs text-[var(--wrong-fg)]">
              {timeLimitError}
            </span>
          )}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={shuffleQuestions}
            onClick={onShuffleQuestionsToggle}
            className={cn(
              'flex h-5 w-9 cursor-pointer items-center rounded-full p-0.5 transition-colors',
              shuffleQuestions
                ? 'bg-[var(--primary-blue)]'
                : 'bg-[var(--border)]',
            )}
          >
            <span
              className={cn(
                'h-4 w-4 rounded-full bg-white transition-transform',
                shuffleQuestions && 'translate-x-4',
              )}
            />
          </button>
          <span className="text-sm text-[var(--text-dark)]">
            Wymieszaj pytania
          </span>
        </label>

        <label className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={showAnswersAfter}
            onClick={onShowAnswersAfterToggle}
            className={cn(
              'flex h-5 w-9 cursor-pointer items-center rounded-full p-0.5 transition-colors',
              showAnswersAfter
                ? 'bg-[var(--primary-blue)]'
                : 'bg-[var(--border)]',
            )}
          >
            <span
              className={cn(
                'h-4 w-4 rounded-full bg-white transition-transform',
                showAnswersAfter && 'translate-x-4',
              )}
            />
          </button>
          <span className="text-sm text-[var(--text-dark)]">
            Pokaż odpowiedzi po quizie
          </span>
        </label>

        <label className="flex items-center gap-2 lg:col-span-2">
          <button
            type="button"
            role="switch"
            aria-checked={showLeaderboardAfter}
            onClick={onShowLeaderboardAfterToggle}
            className={cn(
              'flex h-5 w-9 cursor-pointer items-center rounded-full p-0.5 transition-colors',
              showLeaderboardAfter
                ? 'bg-[var(--primary-blue)]'
                : 'bg-[var(--border)]',
            )}
          >
            <span
              className={cn(
                'h-4 w-4 rounded-full bg-white transition-transform',
                showLeaderboardAfter && 'translate-x-4',
              )}
            />
          </button>
          <span className="text-sm text-[var(--text-dark)]">
            Pokaż ranking po quizie
          </span>
        </label>
      </div>
    </section>
  );
}
