import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import { Breadcrumbs } from './Breadcrumbs';

test('renders a link for non-final items and marks the last as current', () => {
  const html = ReactDOMServer.renderToString(
    <Breadcrumbs
      items={[
        { label: 'Moje Quizy', href: '/admin/' },
        { label: 'Edycja quizu' },
      ]}
    />,
  );
  assert.match(html, /Moje Quizy/);
  assert.match(html, /href="\/admin\/?"/);
  assert.match(html, /Edycja quizu/);
  assert.match(html, /aria-current="page"/);
});
