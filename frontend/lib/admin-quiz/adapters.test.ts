import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { QuizEditorFormValues } from '@/app/types/admin-editor';

import { toAdminQuizUpsertPayload } from './adapters';

it('maps choice image paths through form and payload', () => {
  const formValues: QuizEditorFormValues = {
    title: 'T',
    description: null,
    author: null,
    tags: [],
    showAnswerReview: true,
    questions: [
      {
        type: 'singlechoice',
        text: 'Q',
        timeS: null,
        points: 1,
        image: null,
        hint: null,
        choices: [
          { text: '', isCorrect: true, image: './media/asset_a' },
          { text: 'B', isCorrect: false, image: null },
        ],
      },
    ],
  };

  const payload = toAdminQuizUpsertPayload(formValues);
  const question = payload.questions[0];
  assert.ok('choices' in question, 'expected choices question');
  assert.strictEqual(question.choices[0].image, './media/asset_a');
});
