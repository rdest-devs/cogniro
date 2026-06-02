import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import PromoCard from './PromoCard';

test('renders title, description and CTA from content', () => {
  const html = ReactDOMServer.renderToString(
    <PromoCard
      content={{
        title: 'Tytuł promo',
        description: 'Krótki opis zachęcający.',
        ctaLabel: 'Sprawdź',
        ctaHref: 'https://example.com',
      }}
    />,
  );
  assert.match(html, /Tytuł promo/);
  assert.match(html, /Krótki opis zachęcający\./);
  assert.match(html, /Sprawdź/);
  assert.match(html, /href="https:\/\/example\.com"/);
});

test('renders nothing when title and description are empty', () => {
  const html = ReactDOMServer.renderToString(
    <PromoCard
      content={{
        title: '   ',
        description: '',
        ctaLabel: 'Sprawdź',
        ctaHref: 'https://example.com',
      }}
    />,
  );
  assert.equal(html, '');
});

test('omits the CTA when the link is missing but keeps title and description', () => {
  const html = ReactDOMServer.renderToString(
    <PromoCard
      content={{
        title: 'Tytuł',
        description: 'Opis',
        ctaLabel: '',
        ctaHref: '',
      }}
    />,
  );
  assert.match(html, /Tytuł/);
  assert.match(html, /Opis/);
  assert.doesNotMatch(html, /<a /);
});
