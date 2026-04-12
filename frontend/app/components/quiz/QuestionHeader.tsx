import { Timer } from 'lucide-react';

interface QuestionHeaderProps {
  current: number;
  total: number;
  time: string;
}

export default function QuestionHeader({
  current,
  total,
  time,
}: QuestionHeaderProps) {
  return (
    <div className="flex w-full items-center justify-between px-6 pt-4">
      <span className="text-[13px] font-medium text-[var(--text-muted)]">
        Pytanie {current} z {total}
      </span>
      <div className="flex items-center gap-1.5">
        <Timer size={16} className="text-[var(--text-muted)]" />
        <span className="text-[13px] font-medium text-[var(--text-muted)]">
          {time}
        </span>
      </div>
    </div>
  );
}
