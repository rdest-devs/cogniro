import { cn } from '@/lib/cn';

interface StatusBadgeProps {
  label: string;
  colorMap: Record<string, string>;
  fallback?: string;
}

export default function StatusBadge({
  label,
  colorMap,
  fallback = 'bg-[var(--card-bg)] text-[var(--text-muted)]',
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'rounded-md px-2 py-0.5 text-[11px] font-semibold',
        colorMap[label] || fallback,
      )}
    >
      {label}
    </span>
  );
}
