import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import ReviewQuestionCard from '@/app/components/quiz/results/ReviewQuestionCard';
import { buildReviewQuestions } from '@/app/play/buildReviewQuestions';
import type { KqfQuiz } from '@/lib/kqf';

test('review question card renders the original question image when present', () => {
  const quiz: KqfQuiz = {
    front_matter: {
      title: 'Quiz',
      description: undefined,
      author: undefined,
      version: undefined,
      language: undefined,
      tags: [],
      show_answer_review: true,
      time_limit: null,
      shuffle_questions: false,
      shuffle_mode: 'per_player',
    },
    questions: [
      {
        id: 'q1',
        type: 'singlechoice',
        text: 'Który symbol przedstawia bramkę logiczną XOR?',
        time_s: null,
        points: 1,
        media: {
          image: './media/asset_deadbeefdeadbeefdeadbeefdeadbeef',
          video: undefined,
          audio: undefined,
          hint: undefined,
        },
        choices: [
          { text: 'A', is_correct: false, image: undefined },
          { text: 'B', is_correct: true, image: undefined },
        ],
      },
    ],
  };

  const [question] = buildReviewQuestions(quiz, { q1: 0 });
  const html = ReactDOMServer.renderToString(
    <ReviewQuestionCard question={question} />,
  );

  assert.match(
    html,
    /media\/asset_deadbeefdeadbeefdeadbeefdeadbeef\/thumb\.webp/,
  );
});

test('review question card renders image-based answer choices instead of blank rows', () => {
  const quiz: KqfQuiz = {
    front_matter: {
      title: 'Quiz',
      description: undefined,
      author: undefined,
      version: undefined,
      language: undefined,
      tags: [],
      show_answer_review: true,
      time_limit: null,
      shuffle_questions: false,
      shuffle_mode: 'per_player',
    },
    questions: [
      {
        id: 'q1',
        type: 'singlechoice',
        text: 'Który obraz pasuje?',
        time_s: null,
        points: 1,
        media: {
          image: undefined,
          video: undefined,
          audio: undefined,
          hint: undefined,
        },
        choices: [
          {
            text: '',
            is_correct: false,
            image: './media/asset_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          },
          {
            text: '',
            is_correct: true,
            image: './media/asset_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          },
        ],
      },
    ],
  };

  const [question] = buildReviewQuestions(quiz, { q1: 1 });
  const html = ReactDOMServer.renderToString(
    <ReviewQuestionCard question={question} />,
  );

  assert.match(
    html,
    /media\/asset_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\/thumb\.webp/,
  );
  assert.match(
    html,
    /media\/asset_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\/thumb\.webp/,
  );
});
