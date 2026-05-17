import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';

import QuestionCard from '../shared/QuestionCard';
import MultipleChoice from './MultipleChoice';
import SingleChoice from './SingleChoice';

const sharedImage = {
  assetId: 'asset_1',
  url: '/media/quiz-assets/asset_1/image.webp',
  thumbUrl: '/media/quiz-assets/asset_1/thumb.webp',
  width: 320,
  height: 180,
  alt: '',
};

test('single choice image answers expose radio semantics', () => {
  const markup = renderToStaticMarkup(
    <SingleChoice
      questionNumber={1}
      totalQuestions={3}
      time="00:30"
      question="Ktora opcja jest poprawna?"
      answers={[
        { text: '', image: sharedImage },
        {
          text: '',
          image: {
            ...sharedImage,
            assetId: 'asset_2',
            url: '/media/quiz-assets/asset_2/image.webp',
            thumbUrl: '/media/quiz-assets/asset_2/thumb.webp',
          },
        },
      ]}
    />,
  );

  assert.ok(markup.includes('role="radiogroup"'));
  assert.ok(markup.includes('role="radio"'));
  assert.ok(markup.includes('aria-checked="false"'));
});

test('multiple choice image answers expose checkbox semantics', () => {
  const markup = renderToStaticMarkup(
    <MultipleChoice
      questionNumber={1}
      totalQuestions={3}
      time="00:30"
      question="Wybierz wszystkie poprawne odpowiedzi"
      answers={[
        { text: '', image: sharedImage },
        {
          text: '',
          image: {
            ...sharedImage,
            assetId: 'asset_2',
            url: '/media/quiz-assets/asset_2/image.webp',
            thumbUrl: '/media/quiz-assets/asset_2/thumb.webp',
          },
        },
      ]}
    />,
  );

  assert.ok(markup.includes('role="group"'));
  assert.ok(markup.includes('role="checkbox"'));
  assert.ok(markup.includes('aria-checked="false"'));
});

test('question card renders fallback heading and preserves empty alt for image-only question', () => {
  const markup = renderToStaticMarkup(
    <QuestionCard
      question="   "
      image={{
        assetId: 'asset_1',
        url: '/media/quiz-assets/asset_1/image.webp',
        thumbUrl: '/media/quiz-assets/asset_1/thumb.webp',
        width: 320,
        height: 180,
        alt: '',
      }}
    />,
  );

  assert.ok(markup.includes('Pytanie obrazkowe'));
  assert.ok(markup.includes('alt=""'));
});
