import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  buildStatsCsv,
  computeScoreStats,
  csvEscape,
  formatLocalDate,
  statsCsvFromPayload,
} from '@/lib/results/csvExport';

test('computeScoreStats aggregates count / average / min / max', () => {
  const stats = computeScoreStats([
    { score: 10 },
    { score: 20 },
    { score: 30 },
  ]);
  assert.deepEqual(stats, { count: 3, average: 20, min: 10, max: 30 });
});

test('computeScoreStats rounds the average to 2 decimals', () => {
  const stats = computeScoreStats([{ score: 10 }, { score: 11 }]);
  assert.equal(stats.average, 10.5);
  const stats2 = computeScoreStats([{ score: 1 }, { score: 2 }, { score: 2 }]);
  assert.equal(stats2.average, 1.67);
});

test('computeScoreStats handles a quiz with no participants', () => {
  const stats = computeScoreStats([]);
  assert.deepEqual(stats, { count: 0, average: null, min: null, max: null });
});

test('csvEscape quotes fields with commas, quotes, or newlines', () => {
  assert.equal(csvEscape('plain'), 'plain');
  assert.equal(csvEscape('a,b'), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  assert.equal(csvEscape('line1\nline2'), '"line1\nline2"');
});

test('buildStatsCsv emits a BOM, header, and one summary row', () => {
  const csv = buildStatsCsv({
    quizDate: '2026-06-01 12:00:00',
    quizTitle: 'Quiz, with comma',
    stats: { count: 3, average: 20, min: 10, max: 30 },
  });
  assert.ok(csv.startsWith('﻿'), 'starts with UTF-8 BOM');
  const [header, row] = csv.slice(1).trimEnd().split('\r\n');
  assert.equal(
    header,
    'Data quizu,Nazwa quizu,Liczba uczestników,Średni wynik,Minimalny wynik,Maksymalny wynik',
  );
  assert.equal(row, '2026-06-01 12:00:00,"Quiz, with comma",3,20,10,30');
});

test('buildStatsCsv leaves stat cells empty for an empty quiz', () => {
  const csv = buildStatsCsv({
    quizDate: '2026-06-01 12:00:00',
    quizTitle: 'Empty quiz',
    stats: { count: 0, average: null, min: null, max: null },
  });
  const row = csv.slice(1).trimEnd().split('\r\n')[1];
  assert.equal(row, '2026-06-01 12:00:00,Empty quiz,0,,,');
});

test('formatLocalDate reformats a valid ISO timestamp and falls back otherwise', () => {
  // A valid ISO timestamp is reformatted into the pl-PL locale string, so it is
  // no longer the raw ISO value. The exact string is timezone-dependent, so we
  // only assert it changed and still carries the year.
  const formatted = formatLocalDate('2026-06-01T12:00:00Z');
  assert.notEqual(formatted, '2026-06-01T12:00:00Z');
  assert.match(formatted, /2026/);
  // Missing timestamp -> empty cell (the "session never stopped" case).
  assert.equal(formatLocalDate(undefined), '');
  // Unparseable timestamp -> passed through verbatim.
  assert.equal(formatLocalDate('not a date'), 'not a date');
});

test('statsCsvFromPayload quotes the locale-formatted date and aggregates scores', () => {
  const csv = statsCsvFromPayload({
    quiz_id: 'quiz_demo',
    quiz_title: 'Przykładowy quiz',
    session_started_at: '2026-06-01T11:30:00Z',
    session_stopped_at: '2026-06-01T12:00:00Z',
    max_score: 30,
    scores: [
      { nickname: 'Ala', score: 10, submitted_at: '2026-06-01T11:45:00Z' },
      { nickname: 'Bartek', score: 20, submitted_at: '2026-06-01T11:46:00Z' },
      { nickname: 'Czarek', score: 30, submitted_at: '2026-06-01T11:47:00Z' },
    ],
  });
  // The pl-PL date (e.g. "1.06.2026, 14:00:00") contains a comma, so the real
  // production date cell must be RFC-4180 quoted - the path the hand-fed
  // buildStatsCsv tests never exercise. Derive the expected value from
  // formatLocalDate so the assertion stays timezone-independent.
  const expectedDate = formatLocalDate('2026-06-01T12:00:00Z');
  assert.ok(expectedDate.includes(','), 'sanity: pl-PL date contains a comma');
  assert.ok(
    csv.includes(`"${expectedDate}"`),
    'date cell is quoted in the CSV',
  );
  // The aggregated stats land in the summary row: count,average,min,max.
  assert.ok(
    csv.trimEnd().endsWith(',3,20,10,30'),
    'summary row ends with 3,20,10,30',
  );
});
