import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { calculateScore } from '@/app/play/scoring';

const quiz = {
  front_matter: { title: 'T', tags: [] },
  questions: [
    {
      id: 'Q1',
      type: 'singlechoice',
      text: '?',
      points: 100,
      choices: [
        { text: 'a', is_correct: true },
        { text: 'b', is_correct: false },
      ],
      media: {},
    },
    {
      id: 'Q2',
      type: 'truefalse',
      text: '?',
      points: 50,
      correct: true,
      media: {},
    },
    {
      id: 'Q3',
      type: 'slider',
      text: '?',
      points: 200,
      correct: 50,
      min: 0,
      max: 100,
      step: 1,
      tolerance: 5,
      media: {},
    },
  ],
} as const;

test('singlechoice correct = full points', () => {
  assert.equal(calculateScore(quiz as never, { Q1: 0 }), 100);
});

test('singlechoice wrong = 0', () => {
  assert.equal(calculateScore(quiz as never, { Q1: 1 }), 0);
});

test('truefalse correct', () => {
  assert.equal(calculateScore(quiz as never, { Q2: true }), 50);
});

test('slider within tolerance', () => {
  assert.equal(calculateScore(quiz as never, { Q3: 53 }), 200);
});

test('slider outside tolerance', () => {
  assert.equal(calculateScore(quiz as never, { Q3: 80 }), 0);
});

test('slider scale always scores 0', () => {
  const q = {
    front_matter: { title: 'T', tags: [] },
    questions: [
      {
        id: 'S',
        type: 'slider',
        text: '?',
        points: 100,
        correct: null,
        min: 1,
        max: 10,
        step: 1,
        tolerance: 0,
        score: 'scale',
        media: {},
      },
    ],
  };
  assert.equal(calculateScore(q as never, { S: 5 }), 0);
  assert.equal(calculateScore(q as never, { S: 1 }), 0);
});

test('ordering fully correct = full points', () => {
  const q = {
    front_matter: { title: 'T', tags: [] },
    questions: [
      {
        id: 'O',
        type: 'ordering',
        text: '?',
        points: 100,
        items: ['B', 'C', 'A'],
        correct_order: [2, 0, 1],
        media: {},
      },
    ],
  };
  assert.equal(calculateScore(q as never, { O: [2, 0, 1] }), 100);
});

test('ordering wrong = 0', () => {
  const q = {
    front_matter: { title: 'T', tags: [] },
    questions: [
      {
        id: 'O',
        type: 'ordering',
        text: '?',
        points: 99,
        items: ['B', 'C', 'A'],
        correct_order: [2, 0, 1],
        media: {},
      },
    ],
  };
  assert.equal(calculateScore(q as never, { O: [0, 1, 2] }), 0);
});

test('ordering partially correct = 0 (no partial credit)', () => {
  const q = {
    front_matter: { title: 'T', tags: [] },
    questions: [
      {
        id: 'O',
        type: 'ordering',
        text: '?',
        points: 120,
        items: ['A', 'B', 'C', 'D'],
        correct_order: [0, 1, 2, 3],
        media: {},
      },
    ],
  };
  assert.equal(calculateScore(q as never, { O: [0, 1, 3, 2] }), 0);
});

test('multichoice exact match', () => {
  const q = {
    front_matter: { title: 'T', tags: [] },
    questions: [
      {
        id: 'M',
        type: 'multichoice',
        text: '?',
        points: 60,
        choices: [
          { text: 'a', is_correct: true },
          { text: 'b', is_correct: true },
          { text: 'c', is_correct: false },
        ],
        media: {},
      },
    ],
  };
  assert.equal(calculateScore(q as never, { M: [0, 1] }), 60);
  assert.equal(calculateScore(q as never, { M: [0] }), 0);
});
