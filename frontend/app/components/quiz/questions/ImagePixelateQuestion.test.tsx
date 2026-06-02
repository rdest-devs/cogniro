import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import ImagePixelateQuestion from '@/app/components/quiz/questions/ImagePixelateQuestion';

test('renders the question text and answer options', () => {
  const html = ReactDOMServer.renderToString(
    <ImagePixelateQuestion
      questionNumber={1}
      totalQuestions={1}
      time="--:--"
      question="Co jest na obrazku?"
      imageUrl="http://example.com/media/x.jpg"
      answers={['Pies', 'Kot', 'Ptak']}
    />,
  );
  assert.match(html, /Co jest na obrazku\?/);
  assert.match(html, /Pies/);
  assert.match(html, /Kot/);
  assert.match(html, /Ptak/);
  // The pixelating image is rendered as a canvas.
  assert.match(html, /<canvas/);
});
