import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatAdminDate } from './admin-date-time';

test('formats datetime as dd.MM.yyyy, HH:mm in given timezone', () => {
  const formatted = formatAdminDate('2026-05-27T12:30:00Z', 'datetime', {
    timeZone: 'Europe/Warsaw',
  });

  assert.equal(formatted, '27.05.2026, 14:30');
});

test('formats date-only folder key without day shift', () => {
  const formatted = formatAdminDate('2026-05-27', 'folder-date');

  assert.equal(formatted, '27.05.2026');
});

test('returns null for invalid date input', () => {
  assert.equal(formatAdminDate('not-a-date'), null);
  assert.equal(formatAdminDate('2026-13-99', 'folder-date'), null);
});
