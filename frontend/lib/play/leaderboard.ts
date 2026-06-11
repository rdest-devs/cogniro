import type { RankingEntry } from '@/app/types';
import type { LeaderboardEntry } from '@/lib/play/client';

const MAX_VISIBLE = 5;

function medalFor(position: number): RankingEntry['medal'] {
  if (position === 1) return 'gold';
  if (position === 2) return 'silver';
  if (position === 3) return 'bronze';
  return undefined;
}

function sameNickname(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Build the rows shown on the results leaderboard:
 * - at most `MAX_VISIBLE` rows,
 * - if the current participant is outside the top, show the top `MAX_VISIBLE - 1`
 *   plus the current participant pinned at the bottom,
 * - the current participant is flagged with `isYou`; positions 1-3 get a medal.
 */
export function buildLeaderboardRows(
  entries: readonly LeaderboardEntry[],
  currentNickname: string,
): RankingEntry[] {
  const toRow = (entry: LeaderboardEntry): RankingEntry => ({
    position: entry.position,
    name: entry.nickname,
    score: String(entry.score),
    isYou: sameNickname(entry.nickname, currentNickname),
    medal: medalFor(entry.position),
  });

  if (entries.length <= MAX_VISIBLE) {
    return entries.map(toRow);
  }

  const currentIndex = entries.findIndex((e) =>
    sameNickname(e.nickname, currentNickname),
  );
  if (currentIndex === -1 || currentIndex < MAX_VISIBLE) {
    return entries.slice(0, MAX_VISIBLE).map(toRow);
  }
  return [
    ...entries.slice(0, MAX_VISIBLE - 1).map(toRow),
    toRow(entries[currentIndex]),
  ];
}

/** True when the current participant finished on the podium (positions 1-3). */
export function currentOnPodium(rows: readonly RankingEntry[]): boolean {
  return rows.some((row) => row.isYou && row.position <= 3);
}
