'use client';

import { cn } from '@/lib/cn';

interface QuizSettingsFormProps {
  nameValue: string;
  onNameChange: (value: string) => void;
  timeLimitValue: number;
  onTimeLimitChange: (value: number) => void;
  shuffle: boolean;
  onShuffleToggle: () => void;
  accessibility: string;
}

export default function QuizSettingsForm({
  nameValue,
  onNameChange,
  timeLimitValue,
  onTimeLimitChange,
  shuffle,
  onShuffleToggle,
  accessibility,
}: QuizSettingsFormProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
      <h2 className="text-base font-bold text-[var(--text-dark)]">
        Ustawienia quizu
      </h2>
      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">
            Nazwa Quizu
          </span>
          <input
            value={nameValue}
            onChange={(e) => onNameChange(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
          />
        </label>
        <label className="flex w-24 flex-col gap-1">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">
            Limit czasu (min)
          </span>
          <input
            type="number"
            value={timeLimitValue}
            onChange={(e) => onTimeLimitChange(Number(e.target.value))}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
          />
        </label>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={shuffle}
            onClick={onShuffleToggle}
            className={cn(
              'flex h-5 w-9 cursor-pointer items-center rounded-full p-0.5 transition-colors',
              shuffle ? 'bg-[var(--primary-blue)]' : 'bg-[var(--border)]',
            )}
          >
            <span
              className={cn(
                'h-4 w-4 rounded-full bg-white transition-transform',
                shuffle && 'translate-x-4',
              )}
            />
          </button>
          <span className="text-sm text-[var(--text-dark)]">
            Wymieszaj pytania
          </span>
        </label>
        <span className="text-sm text-[var(--text-muted)]">Dostępność:</span>
        <span className="rounded-lg bg-[var(--primary-blue)] px-2 py-0.5 text-xs font-semibold text-white">
          {accessibility}
        </span>
        <span className="rounded-lg bg-[var(--page-bg)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
          QR
        </span>
      </div>
    </section>
  );
}
