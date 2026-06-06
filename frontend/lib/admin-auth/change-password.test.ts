import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BACKEND_BASE_URL, joinApiUrl } from '../backend-url';
import {
  changeAdminPassword,
  clearStoredAdminToken,
  setStoredAdminToken,
} from './client';
import { getChangePasswordErrorMessage } from './error-message';

type FetchArgs = Parameters<typeof globalThis.fetch>;

test('changeAdminPassword posts snake_case body with the bearer token', async () => {
  const originalFetch = globalThis.fetch;
  const calls: FetchArgs[] = [];
  globalThis.fetch = async (...args: FetchArgs) => {
    calls.push(args);
    return new Response('{"ok":true}', { status: 200 });
  };

  try {
    setStoredAdminToken('access-token');
    await changeAdminPassword({
      currentPassword: 'old-pass',
      newPassword: 'new-password',
      confirmPassword: 'new-password',
    });

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0][0],
      joinApiUrl(BACKEND_BASE_URL, 'admin/auth/change-password'),
    );
    assert.equal(calls[0][1]?.method, 'POST');
    assert.equal(
      new Headers(calls[0][1]?.headers).get('Authorization'),
      'Bearer access-token',
    );
    assert.deepEqual(JSON.parse(String(calls[0][1]?.body)), {
      current_password: 'old-pass',
      new_password: 'new-password',
      confirm_password: 'new-password',
    });
  } finally {
    globalThis.fetch = originalFetch;
    clearStoredAdminToken();
  }
});

test('changeAdminPassword throws the server detail on failure', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response('{"detail":"invalid_current_password"}', { status: 400 });

  try {
    await assert.rejects(
      changeAdminPassword({
        currentPassword: 'wrong',
        newPassword: 'new-password',
        confirmPassword: 'new-password',
      }),
      /invalid_current_password/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    clearStoredAdminToken();
  }
});

test('getChangePasswordErrorMessage maps known codes and falls back', () => {
  assert.equal(
    getChangePasswordErrorMessage(new Error('invalid_current_password')),
    'Obecne hasło jest nieprawidłowe.',
  );
  assert.equal(
    getChangePasswordErrorMessage(new Error('password_mismatch')),
    'Nowe hasło i potwierdzenie nie są takie same.',
  );
  assert.equal(
    getChangePasswordErrorMessage(new Error('password_too_long')),
    'Nowe hasło jest zbyt długie (maksymalnie 72 bajty).',
  );
  assert.equal(
    getChangePasswordErrorMessage(new Error('change_password_failed')),
    'Nie udało się zmienić hasła. Spróbuj ponownie później.',
  );
  assert.equal(
    getChangePasswordErrorMessage('not-an-error'),
    'Nie udało się zmienić hasła. Spróbuj ponownie później.',
  );
});
