interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percent = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full bg-[var(--border)]">
      <div
        className="h-full bg-[var(--orange)] transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
