import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  buildStatsCsv,
  computeScoreStats,
  csvEscape,
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
