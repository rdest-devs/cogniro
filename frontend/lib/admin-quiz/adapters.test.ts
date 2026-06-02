import assert from 'node:assert/strict';
import { it } from 'node:test';

import type {
  AdminQuizApiDetails,
  QuizEditorFormValues,
} from '@/app/types/admin-editor';

import { toAdminQuizUpsertPayload, toQuizEditorFormValues } from './adapters';

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

it('carries slider extreme labels from the form into the payload', () => {
  const formValues: QuizEditorFormValues = {
    title: 'T',
    description: null,
    author: null,
    tags: [],
    showAnswerReview: true,
    questions: [
      {
        type: 'slider',
        text: 'Q',
        timeS: null,
        points: 1,
        image: null,
        hint: null,
        correct: 5,
        min: 1,
        max: 10,
        step: 1,
        tolerance: 0,
        unit: null,
        minLabel: 'Zdecydowanie nie',
        maxLabel: 'Zdecydowanie tak',
      },
    ],
  };

  const payload = toAdminQuizUpsertPayload(formValues);
  const question = payload.questions[0];
  assert.ok(question.type === 'slider', 'expected slider question');
  assert.strictEqual(question.min_label, 'Zdecydowanie nie');
  assert.strictEqual(question.max_label, 'Zdecydowanie tak');
});

it('reads slider extreme labels from the API into the form', () => {
  const details: AdminQuizApiDetails = {
    id: 'quiz_1',
    title: 'T',
    created_at: '2026-01-01T00:00:00Z',
    questions: [
      {
        type: 'slider',
        text: 'Q',
        correct: 5,
        min: 1,
        max: 10,
        step: 1,
        tolerance: 0,
        unit: null,
        min_label: 'Nisko',
        max_label: 'Wysoko',
      },
    ],
  };

  const values = toQuizEditorFormValues(details);
  const question = values.questions[0];
  assert.ok(question.type === 'slider', 'expected slider question');
  assert.strictEqual(question.minLabel, 'Nisko');
  assert.strictEqual(question.maxLabel, 'Wysoko');
});
