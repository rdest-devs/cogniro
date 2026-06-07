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

test('renders image-based answer choices instead of dropping them to text labels', () => {
  const imageChoice = (url: string, text: string) => ({
    text,
    image: {
      assetId: '',
      url,
      // Empty thumb => no progressive pair, so the full url is the rendered src.
      thumbUrl: '',
      width: 0,
      height: 0,
      alt: '',
    },
  });
  const html = ReactDOMServer.renderToString(
    <ImagePixelateQuestion
      questionNumber={1}
      totalQuestions={1}
      time="--:--"
      question="Który obraz pasuje?"
      imageUrl="http://example.com/media/x.jpg"
      answers={[
        imageChoice('http://example.com/media/a.webp', ''),
        imageChoice('http://example.com/media/b.webp', 'Opis'),
      ]}
    />,
  );
  // The configured answer images are rendered (not silently discarded), and the
  // optional caption text on an image choice is shown.
  assert.match(html, /media\/a\.webp/);
  assert.match(html, /media\/b\.webp/);
  assert.match(html, /Opis/);
  assert.match(html, /role="radio"/);
});
