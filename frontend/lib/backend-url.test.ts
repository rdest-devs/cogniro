import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BACKEND_BASE_URL,
  joinApiUrl,
  resolveBackendBaseUrl,
} from './backend-url';

/** Env when `./backend-url` loaded; used to assert `BACKEND_BASE_URL` only in the default-import case. */
const nextPublicBackendUrlAtImport = process.env.NEXT_PUBLIC_BACKEND_URL;

test('uses localhost backend by default for same-site local cookies', () => {
  const previousValue = process.env.NEXT_PUBLIC_BACKEND_URL;
  delete process.env.NEXT_PUBLIC_BACKEND_URL;

  try {
    assert.equal(resolveBackendBaseUrl(), 'http://localhost:8000');
    if (!nextPublicBackendUrlAtImport) {
      assert.equal(BACKEND_BASE_URL, 'http://localhost:8000');
    }
  } finally {
    if (previousValue === undefined) {
      delete process.env.NEXT_PUBLIC_BACKEND_URL;
    } else {
      process.env.NEXT_PUBLIC_BACKEND_URL = previousValue;
    }
  }
});

test('joinApiUrl joins base URLs and paths with one slash', () => {
  assert.equal(
    joinApiUrl('http://localhost:8000/', '/admin/auth/refresh'),
    'http://localhost:8000/admin/auth/refresh',
  );
});
