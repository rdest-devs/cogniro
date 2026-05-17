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
