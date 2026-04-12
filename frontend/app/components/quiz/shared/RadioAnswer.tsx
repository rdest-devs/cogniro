import { cn } from '@/lib/cn';

interface RadioAnswerProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

export default function RadioAnswer({
  label,
  selected = false,
  onClick,
}: RadioAnswerProps) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-2xl px-5 py-4 transition-all',
        selected
          ? 'border-2 border-[var(--selected-border)] bg-[var(--selected-bg)]'
          : 'border-[1.5px] border-[var(--border)] bg-[var(--card-bg)]',
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
          selected
            ? 'bg-[var(--orange)]'
            : 'border-[1.5px] border-[var(--border)] bg-[var(--page-bg)]',
        )}
      >
        {selected && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6L5 9L10 3"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span
        className={cn(
          'text-[15px] text-[var(--text-dark)]',
          selected ? 'font-semibold' : 'font-medium',
        )}
      >
        {label}
      </span>
    </button>
  );
}
