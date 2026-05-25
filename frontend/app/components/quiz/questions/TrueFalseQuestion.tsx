'use client';

import { cn } from '@/lib/cn';

type Props = { value: boolean | undefined; onChange: (v: boolean) => void };

export function TrueFalseQuestion({ value, onChange }: Props) {
  return (
    <div className="flex gap-3" role="radiogroup" aria-label="Prawda lub fałsz">
      {[true, false].map((v) => {
        const selected = value === v;
        const label = v ? 'Prawda' : 'Fałsz';
        return (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            onClick={() => onChange(v)}
            className={cn(
              'rounded-2xl px-4 py-2 text-[15px] transition-all',
              selected
                ? 'border-2 border-[var(--selected-border)] bg-[var(--selected-bg)] font-semibold text-[var(--text-dark)]'
                : 'border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] font-medium text-[var(--text-dark)]',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
