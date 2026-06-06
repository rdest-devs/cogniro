import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseResultDate, parseTimeSeconds } from './admin-result-sort';

test('parseTimeSeconds parses M:SS / MM:SS / H:MM:SS', () => {
  assert.equal(parseTimeSeconds('4:32'), 4 * 60 + 32);
  assert.equal(parseTimeSeconds('12:05'), 12 * 60 + 5);
  assert.equal(parseTimeSeconds('1:02:03'), 1 * 3600 + 2 * 60 + 3);
});

test('parseTimeSeconds tolerates surrounding whitespace', () => {
  assert.equal(parseTimeSeconds(' 0:09 '), 9);
});

test('parseTimeSeconds returns NaN for non-numeric segments', () => {
  assert.ok(Number.isNaN(parseTimeSeconds('abc')));
  assert.ok(Number.isNaN(parseTimeSeconds('1:xx')));
});

test('parseTimeSeconds orders durations correctly', () => {
  assert.ok(parseTimeSeconds('4:32') < parseTimeSeconds('5:01'));
  assert.ok(parseTimeSeconds('59:59') < parseTimeSeconds('1:00:00'));
});

test('parseResultDate parses "D mon YYYY" Polish dates', () => {
  assert.equal(parseResultDate('12 mar 2026'), new Date(2026, 2, 12).getTime());
  assert.equal(parseResultDate('6 mar 2026'), new Date(2026, 2, 6).getTime());
});

test('parseResultDate is case-insensitive and accepts the "paz" alias', () => {
  const expected = new Date(2026, 9, 3).getTime();
  assert.equal(parseResultDate('3 Paź 2026'), expected);
  assert.equal(parseResultDate('3 paz 2026'), expected);
});

test('parseResultDate orders dates chronologically', () => {
  assert.ok(parseResultDate('6 mar 2026') < parseResultDate('12 mar 2026'));
  assert.ok(parseResultDate('28 lut 2026') < parseResultDate('1 mar 2026'));
});

test('parseResultDate returns NaN for an unknown month', () => {
  assert.ok(Number.isNaN(parseResultDate('12 xyz 2026')));
});

test('parseResultDate returns NaN for an overflowed (impossible) date', () => {
  // 31 April does not exist; Date would silently normalize it to 1 May.
  assert.ok(Number.isNaN(parseResultDate('31 kwi 2026')));
});

test('parseResultDate falls back to Date.parse for ISO-like input', () => {
  assert.equal(parseResultDate('2026-03-12'), Date.parse('2026-03-12'));
});

test('parseResultDate returns NaN for unparseable input', () => {
  assert.ok(Number.isNaN(parseResultDate('not a date')));
});
