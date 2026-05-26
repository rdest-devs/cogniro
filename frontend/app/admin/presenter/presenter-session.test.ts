import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  presenterPlayHref,
  resolvePresenterSession,
} from './presenter-session';

test('resolvePresenterSession normalizes a valid presenter pin', () => {
  assert.deepEqual(resolvePresenterSession(' ab2cd3 '), {
    pin: 'AB2CD3',
    playHref: '/play/?code=AB2CD3',
  });
});

test('resolvePresenterSession prefers a validated participant URL when provided', () => {
  assert.deepEqual(
    resolvePresenterSession(
      'ab2cd3',
      'https://quiz.example.edu/play/?code=AB2CD3',
    ),
    {
      pin: 'AB2CD3',
      playHref: 'https://quiz.example.edu/play/?code=AB2CD3',
    },
  );
});

test('resolvePresenterSession builds an absolute participant URL when origin is provided', () => {
  assert.deepEqual(
    resolvePresenterSession('ab2cd3', 'https://quiz.example.edu'),
    {
      pin: 'AB2CD3',
      playHref: 'https://quiz.example.edu/play/?code=AB2CD3',
    },
  );
});

test('resolvePresenterSession rejects invalid presenter pins', () => {
  assert.equal(resolvePresenterSession(null), null);
  assert.equal(resolvePresenterSession(''), null);
  assert.equal(resolvePresenterSession('ABC1234'), null);
  assert.equal(resolvePresenterSession('abc10o'), null);
  assert.equal(resolvePresenterSession('javascript:alert(1)'), null);
});

test('resolvePresenterSession rejects an invalid participant URL and falls back to pin-only href', () => {
  assert.deepEqual(resolvePresenterSession('ab2cd3', 'javascript:alert(1)'), {
    pin: 'AB2CD3',
    playHref: '/play/?code=AB2CD3',
  });
});

test('resolvePresenterSession preserves deployment sub-path from a full participant URL', () => {
  assert.deepEqual(
    resolvePresenterSession(
      'ab2cd3',
      'https://quiz.example.edu/cogniro/play/?code=AB2CD3',
    ),
    {
      pin: 'AB2CD3',
      playHref: 'https://quiz.example.edu/cogniro/play/?code=AB2CD3',
    },
  );
});

test('presenterPlayHref encodes the pin into the participant route', () => {
  assert.equal(presenterPlayHref('AB2CD3'), '/play/?code=AB2CD3');
});

test('presenterPlayHref returns absolute URL when origin is valid', () => {
  assert.equal(
    presenterPlayHref('AB2CD3', 'https://quiz.example.edu'),
    'https://quiz.example.edu/play/?code=AB2CD3',
  );
});
