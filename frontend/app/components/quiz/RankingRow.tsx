import { Trophy } from 'lucide-react';

import type { RankingEntry } from '@/app/types';

const medalColors = {
  gold: '#FFD700',
  silver: '#A8A8A8',
  bronze: '#CD7F32',
};

interface RankingRowProps {
  entry: RankingEntry;
  isLast: boolean;
}

export default function RankingRow({ entry, isLast }: RankingRowProps) {
  return (
    <div>
      <div
        className={`flex items-center gap-3 px-4 py-3 ${
          entry.isYou ? 'bg-[var(--highlight-bg)]' : ''
        }`}
      >
        {entry.medal ? (
          <>
            <span className="sr-only">{entry.position}</span>
            <Trophy
              size={20}
              color={medalColors[entry.medal]}
              fill={medalColors[entry.medal]}
              aria-hidden="true"
            />
          </>
        ) : (
          <span
            className={`w-5 text-center text-sm ${
              entry.isYou
                ? 'font-bold text-[var(--primary-blue)]'
                : 'font-medium text-[var(--text-muted)]'
            }`}
          >
            {entry.position}
          </span>
        )}
        <span
          className={`flex-1 text-sm ${
            entry.isYou
              ? 'font-bold text-[var(--primary-blue)]'
              : entry.medal === 'gold'
                ? 'font-semibold text-[var(--text-dark)]'
                : 'font-medium text-[var(--text-dark)]'
          }`}
        >
          {entry.name}
        </span>
        <span
          className={`text-sm ${
            entry.isYou
              ? 'font-bold text-[var(--primary-blue)]'
              : entry.medal === 'gold'
                ? 'font-bold text-[var(--orange)]'
                : 'font-semibold text-[var(--text-muted)]'
          }`}
        >
          {entry.score}
        </span>
      </div>
      {!isLast && <div className="h-px bg-[var(--border)]" />}
    </div>
  );
}
