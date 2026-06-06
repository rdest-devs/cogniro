interface ProgressBarProps {
  percent: number;
  animated?: boolean;
  fillClassName?: string;
}

export default function ProgressBar({
  percent,
  animated = true,
  fillClassName = 'bg-[var(--orange)]',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-1.5 w-full bg-[var(--border)]">
      <div
        className={
          animated
            ? `h-full ${fillClassName} transition-[width] duration-300 ease-linear`
            : `h-full ${fillClassName}`
        }
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
