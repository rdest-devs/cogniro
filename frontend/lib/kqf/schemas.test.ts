import assert from 'node:assert/strict';
import { test } from 'node:test';

import { kqfQuizSchema } from '@/lib/kqf/schemas';

test('parses a minimal valid KQF-shaped quiz object', () => {
  const parsed = kqfQuizSchema.parse({
    front_matter: { title: 'T' },
    questions: [
      {
        id: 'Q1',
        type: 'singlechoice',
        text: '?',
        choices: [
          { text: 'a', is_correct: true },
          { text: 'b', is_correct: false },
        ],
      },
    ],
  });
  assert.equal(parsed.front_matter.title, 'T');
  assert.equal(parsed.front_matter.show_answer_review, true);
  assert.equal(parsed.questions[0].type, 'singlechoice');
  assert.equal(parsed.questions[0].points, 1);
});

test('parses join-like payload with explicit null optional fields', () => {
  const parsed = kqfQuizSchema.parse({
    front_matter: {
      title: 'T',
      description: null,
      author: null,
      version: null,
      language: null,
      tags: [],
    },
    questions: [
      {
        id: 'Q1',
        type: 'singlechoice',
        text: '?',
        choices: [
          { text: 'a', is_correct: true },
          { text: 'b', is_correct: false },
        ],
        media: {
          image: null,
          video: null,
          audio: null,
          hint: null,
        },
      },
      {
        id: 'Q2',
        type: 'slider',
        text: 's?',
        correct: 5,
        min: 0,
        max: 10,
        step: 1,
        tolerance: 0,
        unit: null,
        media: {
          image: null,
          video: null,
          audio: null,
          hint: null,
        },
      },
    ],
  });
  assert.equal(parsed.questions[0].media.image, undefined);
  assert.equal(parsed.questions[0].points, 1);
  assert.equal(parsed.questions[1].type, 'slider');
  assert.equal(parsed.questions[1].points, 1);
  assert.equal(parsed.questions[1].unit, undefined);
});

test('parses ordering question', () => {
  const parsed = kqfQuizSchema.parse({
    front_matter: { title: 'T' },
    questions: [
      {
        id: 'O1',
        type: 'ordering',
        text: 'Order these.',
        items: ['B', 'C', 'A'],
        correct_order: [2, 0, 1],
      },
    ],
  });
  const q = parsed.questions[0];
  assert.equal(q.type, 'ordering');
  if (q.type === 'ordering') {
    assert.deepEqual(q.items, ['B', 'C', 'A']);
    assert.deepEqual(q.correct_order, [2, 0, 1]);
  }
});

test('rejects ordering with wrong correct_order length', () => {
  assert.throws(() =>
    kqfQuizSchema.parse({
      front_matter: { title: 'T' },
      questions: [
        {
          id: 'O1',
          type: 'ordering',
          text: 'Order.',
          items: ['A', 'B', 'C'],
          correct_order: [0, 1],
        },
      ],
    }),
  );
});

test('rejects ordering with duplicate index in correct_order', () => {
  assert.throws(() =>
    kqfQuizSchema.parse({
      front_matter: { title: 'T' },
      questions: [
        {
          id: 'O1',
          type: 'ordering',
          text: 'Order.',
          items: ['A', 'B', 'C'],
          correct_order: [0, 0, 2],
        },
      ],
    }),
  );
});

test('parses slider with score=scale without correct field', () => {
  const parsed = kqfQuizSchema.parse({
    front_matter: { title: 'T' },
    questions: [
      {
        id: 'S1',
        type: 'slider',
        text: 'Rate.',
        min: 1,
        max: 10,
        score: 'scale',
      },
    ],
  });
  const q = parsed.questions[0];
  assert.equal(q.type, 'slider');
  if (q.type === 'slider') {
    assert.equal(q.score, 'scale');
    assert.equal(q.correct, null);
  }
});

test('rejects slider with score=range without correct field', () => {
  assert.throws(() =>
    kqfQuizSchema.parse({
      front_matter: { title: 'T' },
      questions: [
        {
          id: 'S1',
          type: 'slider',
          text: 'Year?',
          min: 1900,
          max: 2000,
          score: 'range',
        },
      ],
    }),
  );
});

test('parses slider with label_min and label_max', () => {
  const parsed = kqfQuizSchema.parse({
    front_matter: { title: 'T' },
    questions: [
      {
        id: 'S1',
        type: 'slider',
        text: 'Rate.',
        correct: 5,
        min: 1,
        max: 10,
        label_min: 'Low',
        label_max: 'High',
      },
    ],
  });
  const q = parsed.questions[0];
  if (q.type === 'slider') {
    assert.equal(q.label_min, 'Low');
    assert.equal(q.label_max, 'High');
  }
});

test('rejects singlechoice with zero correct answers', () => {
  assert.throws(() =>
    kqfQuizSchema.parse({
      front_matter: { title: 'T' },
      questions: [
        {
          id: 'Q1',
          type: 'singlechoice',
          text: '?',
          choices: [
            { text: 'a', is_correct: false },
            { text: 'b', is_correct: false },
          ],
        },
      ],
    }),
  );
});
