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
