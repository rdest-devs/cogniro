interface ScoreCircleProps {
  percent: number;
  correct: number;
  total: number;
}

export default function ScoreCircle({
  percent,
  correct,
  total,
}: ScoreCircleProps) {
  return (
    <div className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-b from-[var(--orange)] to-[#F8BD4D]">
      <div className="flex h-[136px] w-[136px] flex-col items-center justify-center rounded-full bg-[var(--page-bg)]">
        <span className="text-[42px] font-extrabold text-[var(--orange)]">
          {percent}%
        </span>
        <span className="text-sm font-medium text-[var(--text-muted)]">
          {correct} / {total}
        </span>
      </div>
    </div>
  );
}
