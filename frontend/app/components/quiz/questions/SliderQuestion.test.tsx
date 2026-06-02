import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import SliderQuestion from '@/app/components/quiz/questions/SliderQuestion';

test('renders the extreme labels when provided', () => {
  const html = ReactDOMServer.renderToString(
    <SliderQuestion
      playInline
      question="Jak bardzo się zgadzasz?"
      min={1}
      max={10}
      defaultValue={5}
      unit=""
      ticks={[1, 5, 10]}
      minLabel="Zdecydowanie nie"
      maxLabel="Zdecydowanie tak"
    />,
  );
  assert.match(html, /Zdecydowanie nie/);
  assert.match(html, /Zdecydowanie tak/);
});

test('omits the label row when no labels are provided', () => {
  const html = ReactDOMServer.renderToString(
    <SliderQuestion
      playInline
      question="Q"
      min={1}
      max={10}
      defaultValue={5}
      unit=""
      ticks={[1, 5, 10]}
    />,
  );
  assert.doesNotMatch(html, /Zdecydowanie/);
});
