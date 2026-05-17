import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import { TrueFalseQuestion } from '@/app/components/quiz/questions/TrueFalseQuestion';

test('renders both options', () => {
  const html = ReactDOMServer.renderToString(
    <TrueFalseQuestion value={undefined} onChange={() => {}} />,
  );
  assert.match(html, /Prawda/);
  assert.match(html, /Fałsz/);
});
