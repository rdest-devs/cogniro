import assert from 'node:assert/strict';
import { registerHooks, type RegisterHooksOptions } from 'node:module';
import { test } from 'node:test';

const projectRootUrl = new URL('../../', import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(
        new URL(`${specifier.slice(2)}.ts`, projectRootUrl).href,
        context,
      );
    }

    return nextResolve(specifier, context);
  },
} satisfies RegisterHooksOptions);

async function loadClientModule() {
  return import('./client');
}

type ClientModulePromise = ReturnType<typeof loadClientModule>;

let clientPromise: ClientModulePromise | null = null;

async function getClient() {
  clientPromise ??= loadClientModule();
  return clientPromise;
}

type FetchArgs = Parameters<typeof globalThis.fetch>;

test('logoutAdmin posts logout even when no access token is stored', async () => {
  const { clearStoredAdminToken, logoutAdmin } = await getClient();

  const originalFetch = globalThis.fetch;
  const calls: FetchArgs[] = [];
  globalThis.fetch = async (...args: FetchArgs) => {
    calls.push(args);
    return new Response('{}', { status: 200 });
  };

  try {
    clearStoredAdminToken();

    await logoutAdmin();

    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'http://127.0.0.1:8000/admin/auth/logout');
    assert.equal(calls[0][1]?.method, 'POST');
    assert.equal(calls[0][1]?.credentials, 'include');
    assert.equal(new Headers(calls[0][1]?.headers).get('Authorization'), null);
  } finally {
    globalThis.fetch = originalFetch;
    clearStoredAdminToken();
  }
});

test('logoutAdmin sends Authorization when an access token is stored', async () => {
  const {
    clearStoredAdminToken,
    getStoredAdminToken,
    logoutAdmin,
    setStoredAdminToken,
  } = await getClient();

  const originalFetch = globalThis.fetch;
  const calls: FetchArgs[] = [];
  globalThis.fetch = async (...args: FetchArgs) => {
    calls.push(args);
    assert.equal(getStoredAdminToken(), 'access-token');
    return new Response('{}', { status: 200 });
  };

  try {
    setStoredAdminToken('access-token');

    await logoutAdmin();

    assert.equal(calls.length, 1);
    assert.equal(
      new Headers(calls[0][1]?.headers).get('Authorization'),
      'Bearer access-token',
    );
    assert.equal(getStoredAdminToken(), null);
  } finally {
    globalThis.fetch = originalFetch;
    clearStoredAdminToken();
  }
});
