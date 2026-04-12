import { cn } from '@/lib/cn';

interface CheckboxAnswerProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

export default function CheckboxAnswer({
  label,
  selected = false,
  onClick,
}: CheckboxAnswerProps) {
  return (
    <button
      role="checkbox"
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
          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[3px]',
          selected
            ? 'bg-[var(--orange)]'
            : 'border-[1.5px] border-[var(--border)] bg-[var(--page-bg)]',
        )}
      >
        {selected && (
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
