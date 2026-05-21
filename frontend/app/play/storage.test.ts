import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  clearPlayState,
  loadPlayState,
  savePlayState,
  storageKey,
} from '@/app/play/storage';

const fakeStorage = (): Storage => {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
    removeItem: (k: string) => {
      m.delete(k);
    },
    clear: () => {
      m.clear();
    },
  } as Storage;
};

test('storageKey shape', () => {
  assert.equal(storageKey('ABC123', 'Ala'), 'cogniro:play:ABC123:Ala:state');
});

test('save/load/clear roundtrip', () => {
  const s = fakeStorage();
  const state = {
    quiz: { front_matter: { title: 'T' }, questions: [] } as never,
    currentQuestionIndex: 1,
    answers: { Q1: 'a' },
    startedAt: 't',
    submitted: false,
  };
  savePlayState(s, 'ABC123', 'Ala', state);
  assert.deepEqual(loadPlayState(s, 'ABC123', 'Ala'), state);
  clearPlayState(s, 'ABC123', 'Ala');
  assert.equal(loadPlayState(s, 'ABC123', 'Ala'), null);
});

test('loadPlayState returns null and clears entry on corrupt JSON', () => {
  const s = fakeStorage();
  s.setItem(storageKey('ABC123', 'Ala'), '{not valid json');
  assert.equal(loadPlayState(s, 'ABC123', 'Ala'), null);
  assert.equal(s.getItem(storageKey('ABC123', 'Ala')), null);
});
