import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';

import ImageAnswers from './ImageAnswers';

test('image answers render radio semantics for choices', () => {
  const markup = renderToStaticMarkup(
    <ImageAnswers
      questionNumber={1}
      totalQuestions={5}
      time="00:30"
      question="Which option matches?"
      answers={[
        { imageUrl: 'images/a.png', label: 'Option A' },
        { imageUrl: 'images/b.png', label: 'Option B' },
      ]}
    />,
  );

  assert.ok(markup.includes('role="radiogroup"'));
  assert.ok(markup.includes('role="radio"'));
  assert.ok(markup.includes('aria-checked="false"'));
});

test('image answers expose selected radio state', () => {
  const markup = renderToStaticMarkup(
    <ImageAnswers
      questionNumber={1}
      totalQuestions={5}
      time="00:30"
      question="Which option matches?"
      answers={[
        { imageUrl: 'images/a.png', label: 'Option A' },
        { imageUrl: 'images/b.png', label: 'Option B' },
      ]}
      initialSelectedIndex={0}
    />,
  );

  assert.ok(markup.includes('aria-checked="true"'));
});
