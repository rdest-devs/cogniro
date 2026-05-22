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

const validQuiz = {
  front_matter: { title: 'T', tags: [] as string[], show_answer_review: true },
  questions: [
    {
      id: 'Q1',
      type: 'truefalse' as const,
      text: 'Czy?',
      points: 1,
      media: {},
      correct: true,
    },
  ],
};

test('save/load/clear roundtrip', () => {
  const s = fakeStorage();
  const state = {
    quiz: validQuiz as never,
    currentQuestionIndex: 0,
    answers: { Q1: true } as Record<string, unknown>,
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

test('loadPlayState returns null and clears entry when shape is wrong', () => {
  const s = fakeStorage();
  s.setItem(
    storageKey('ABC123', 'Ala'),
    JSON.stringify({ quiz: { front_matter: { title: 'T' }, questions: [] } }),
  );
  assert.equal(loadPlayState(s, 'ABC123', 'Ala'), null);
  assert.equal(s.getItem(storageKey('ABC123', 'Ala')), null);
});

test('loadPlayState rejects out-of-bounds currentQuestionIndex', () => {
  const s = fakeStorage();
  s.setItem(
    storageKey('ABC123', 'Ala'),
    JSON.stringify({
      quiz: validQuiz,
      currentQuestionIndex: 1,
      answers: {},
      startedAt: 't',
      submitted: false,
    }),
  );
  assert.equal(loadPlayState(s, 'ABC123', 'Ala'), null);
  assert.equal(s.getItem(storageKey('ABC123', 'Ala')), null);
});
