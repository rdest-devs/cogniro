import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { promoContents } from './promoData';

test('seeds several promo entries (Olasz: WRSS, KN BIT, ...)', () => {
  assert.ok(
    promoContents.length >= 3,
    `expected at least 3 promo entries, got ${promoContents.length}`,
  );
});

test('includes the KN BIT and WRSS entries', () => {
  const titles = promoContents.map((c) => c.title.toLowerCase());
  assert.ok(
    titles.some((t) => t.includes('bit')),
    'expected a KN BIT entry',
  );
  assert.ok(
    titles.some((t) => t.includes('wrss')),
    'expected a WRSS entry',
  );
});

test('every entry is well-formed with functional links and images', () => {
  for (const entry of promoContents) {
    assert.ok(entry.title.trim().length > 0, 'title must be non-empty');
    assert.ok(
      entry.description.trim().length > 0,
      'description must be non-empty',
    );

    // A CTA, when present, needs both a label and a valid https href.
    if (entry.ctaLabel || entry.ctaHref) {
      assert.ok(
        entry.ctaLabel && entry.ctaLabel.trim().length > 0,
        `${entry.title}: CTA label missing`,
      );
      assert.match(
        entry.ctaHref ?? '',
        /^https:\/\//,
        `${entry.title}: CTA href must be https`,
      );
    }

    // Images are local public assets or absolute https URLs; local assets must
    // actually exist on disk so a "functional image" never 404s.
    if (entry.imageUrl) {
      assert.match(
        entry.imageUrl,
        /^(\/images\/|https:\/\/)/,
        `${entry.title}: image must be a local /images asset or https URL`,
      );
      if (entry.imageUrl.startsWith('/images/')) {
        const assetPath = join(process.cwd(), 'public', entry.imageUrl);
        assert.ok(
          existsSync(assetPath),
          `${entry.title}: missing asset ${entry.imageUrl}`,
        );
      }
    }
  }
});
