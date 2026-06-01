import { strict as assert } from 'node:assert';
import { afterEach, test } from 'node:test';

import { joinPlay } from '@/lib/play/client';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch(status: number, body: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
}

test('joinPlay flags profanity on 400 nickname_profanity', async () => {
  stubFetch(400, {
    detail: { error: 'nickname_profanity', detail_pl: 'niedozwolone' },
  });
  const r = await joinPlay('ABC123', 'kurwa');
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, 400);
    assert.equal(r.profanity, true);
  }
});

test('joinPlay does not flag profanity on unrelated 400', async () => {
  stubFetch(400, { detail: 'something else' });
  const r = await joinPlay('ABC123', 'Ala');
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, 400);
    assert.notEqual(r.profanity, true);
  }
});

test('joinPlay passes through a 409 taken nickname', async () => {
  stubFetch(409, { detail: 'nickname_taken' });
  const r = await joinPlay('ABC123', 'Ala');
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, 409);
    assert.notEqual(r.profanity, true);
  }
});
