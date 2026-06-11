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

test('omits the CTA when cta fields are not provided at all', () => {
  const html = ReactDOMServer.renderToString(
    <PromoCard content={{ title: 'Tytuł', description: 'Opis' }} />,
  );
  assert.match(html, /Tytuł/);
  assert.doesNotMatch(html, /<a /);
});

test('renders the image with lazy/async hints and object-contain', () => {
  const html = ReactDOMServer.renderToString(
    <PromoCard
      content={{
        title: 'Tytuł',
        description: 'Opis',
        imageUrl: '/images/logo.png',
        imageAlt: 'Logo',
      }}
    />,
  );
  assert.match(
    html,
    /src="\/images\/nextImageExportOptimizer\/logo-opt-\d+\.WEBP"/,
  );
  assert.match(html, /srcSet="/);
  assert.match(html, /alt="Logo"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /object-contain/);
});

test('uses the brand gradient backdrop for light logos (imageBg=brand)', () => {
  const html = ReactDOMServer.renderToString(
    <PromoCard
      content={{
        title: 'Tytuł',
        description: 'Opis',
        imageUrl: '/images/white-logo.png',
        imageBg: 'brand',
      }}
    />,
  );
  assert.match(html, /bg-gradient-to-r/);
});
