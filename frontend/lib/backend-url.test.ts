import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BACKEND_BASE_URL, joinApiUrl } from './backend-url';

test('uses localhost backend by default for same-site local cookies', () => {
  assert.equal(BACKEND_BASE_URL, 'http://localhost:8000');
});

test('joinApiUrl joins base URLs and paths with one slash', () => {
  assert.equal(
    joinApiUrl('http://localhost:8000/', '/admin/auth/refresh'),
    'http://localhost:8000/admin/auth/refresh',
  );
});
