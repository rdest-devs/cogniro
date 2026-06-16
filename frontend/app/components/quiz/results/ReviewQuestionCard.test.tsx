import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import type { ReviewQuestion } from '@/app/types';

import ReviewQuestionCard from './ReviewQuestionCard';

test('image-only review answers get a fallback alt label', () => {
  const question: ReviewQuestion = {
    number: 1,
    text: 'Który obraz pasuje?',
    isCorrect: false,
    answers: [
      {
        text: '',
        image: {
          assetId: '',
          url: '/media/asset_a/image.webp',
          thumbUrl: '/media/asset_a/thumb.webp',
          width: 0,
          height: 0,
          alt: '',
        },
        state: 'wrong-selected',
        yourAnswer: true,
      },
    ],
  };

  const html = ReactDOMServer.renderToString(
    <ReviewQuestionCard question={question} />,
  );

  assert.match(html, /alt="Odpowiedź 1"/);
});
