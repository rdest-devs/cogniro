interface ProgressBarProps {
  percent: number;
  animated?: boolean;
}

export default function ProgressBar({
  percent,
  animated = true,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-1.5 w-full bg-[var(--border)]">
      <div
        className={
          animated
            ? 'h-full bg-[var(--orange)] transition-[width] duration-300 ease-linear'
            : 'h-full bg-[var(--orange)]'
        }
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
