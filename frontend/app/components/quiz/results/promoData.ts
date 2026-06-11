export interface PromoContent {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Optional promo image (local path under /public or absolute URL). */
  imageUrl?: string;
  imageAlt?: string;
  /**
   * Backdrop behind the (object-contain) logo. `'light'` suits dark logos,
   * `'brand'` (gradient) suits light/white logos. Defaults to `'light'`.
   */
  imageBg?: 'light' | 'brand';
}

/**
 * Promotional entries shown on the results screen after a quiz. The results
 * view renders all of them, so add or swap entries here to change what
 * participants see. Each entry degrades gracefully: a missing image falls back
 * to a branded gradient header, and a missing CTA is simply omitted.
 */
export const promoContents: PromoContent[] = [
  {
    title: 'Wydział Informatyki AGH',
    description:
      'Poznaj kierunki, koła naukowe i wydarzenia. Dołącz do społeczności i twórz z nami technologię.',
    ctaLabel: 'Odwiedź stronę wydziału',
    ctaHref: 'https://www.informatyka.agh.edu.pl/pl/',
    imageUrl: '/images/wi-new-logo.png',
    imageAlt: 'Logo Wydziału Informatyki AGH',
    imageBg: 'light',
  },
  {
    title: 'Sylabusy Wydziału Informatyki',
    description: 'Zobacz sylabusy naszych kierunków!',
    ctaLabel: 'Zobacz sylabusy WI',
    ctaHref: 'https://sylabusy.agh.edu.pl/pl/1/2/22/0/0/63',
    imageUrl: '/images/agh-logo.svg',
    imageAlt: 'Logo Wydziału Informatyki AGH',
    imageBg: 'brand',
  },
];
