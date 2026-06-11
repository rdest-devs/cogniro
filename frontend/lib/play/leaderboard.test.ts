import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type { LeaderboardEntry } from '@/lib/play/client';
import { buildLeaderboardRows, currentOnPodium } from '@/lib/play/leaderboard';

function entries(...names: [string, number][]): LeaderboardEntry[] {
  return names.map(([nickname, score], i) => ({
    position: i + 1,
    nickname,
    score,
  }));
}

test('shows all rows and flags the current participant when within the top', () => {
  const rows = buildLeaderboardRows(
    entries(['Ala', 30], ['Bob', 20], ['Cyryl', 10]),
    'Bob',
  );
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((r) => r.name),
    ['Ala', 'Bob', 'Cyryl'],
  );
  assert.equal(rows.find((r) => r.name === 'Bob')?.isYou, true);
  assert.equal(rows.find((r) => r.name === 'Ala')?.isYou, false);
});

test('assigns medals to the top three positions only', () => {
  const rows = buildLeaderboardRows(
    entries(['A', 4], ['B', 3], ['C', 2], ['D', 1]),
    'A',
  );
  assert.deepEqual(
    rows.map((r) => r.medal),
    ['gold', 'silver', 'bronze', undefined],
  );
});

test('caps visible rows at five when the current participant is in the top', () => {
  const rows = buildLeaderboardRows(
    entries(
      ['A', 70],
      ['B', 60],
      ['C', 50],
      ['D', 40],
      ['E', 30],
      ['F', 20],
      ['G', 10],
    ),
    'C',
  );
  assert.equal(rows.length, 5);
  assert.deepEqual(
    rows.map((r) => r.position),
    [1, 2, 3, 4, 5],
  );
});

test('pins the current participant at the bottom when outside the top five', () => {
  const rows = buildLeaderboardRows(
    entries(
      ['A', 70],
      ['B', 60],
      ['C', 50],
      ['D', 40],
      ['E', 30],
      ['F', 20],
      ['Me', 10],
    ),
    'Me',
  );
  assert.equal(rows.length, 5);
  assert.deepEqual(
    rows.map((r) => r.name),
    ['A', 'B', 'C', 'D', 'Me'],
  );
  const me = rows[rows.length - 1];
  assert.equal(me.position, 7);
  assert.equal(me.isYou, true);
});

test('currentOnPodium is true only when the current participant is in the top three', () => {
  const podium = buildLeaderboardRows(entries(['A', 9], ['Me', 8]), 'Me');
  assert.equal(currentOnPodium(podium), true);

  const offPodium = buildLeaderboardRows(
    entries(['A', 9], ['B', 8], ['C', 7], ['Me', 6]),
    'Me',
  );
  assert.equal(currentOnPodium(offPodium), false);
});
