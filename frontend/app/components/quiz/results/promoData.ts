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
 * view picks one at random (a lightweight "ad engine"), so add or swap entries
 * here to change what participants see. Each entry degrades gracefully: a
 * missing image falls back to a branded gradient header, and a missing CTA is
 * simply omitted.
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
    title: 'Koło Naukowe BIT',
    description:
      'Studencka przestrzeń do wymiany wiedzy i testowania pomysłów - web, algorytmy, AI i nie tylko. Rozwijaj się z najlepszymi studentami Informatyki AGH.',
    ctaLabel: 'Poznaj KN BIT',
    ctaHref: 'https://knbit.edu.pl/',
    imageUrl: '/images/knbit-logo.svg',
    imageAlt: 'Logo Koła Naukowego BIT',
    imageBg: 'light',
  },
  {
    title: 'WRSS Wydziału Informatyki',
    description:
      'Wydziałowa Rada Samorządu Studentów reprezentuje studentów WI AGH, dba o jakość kształcenia i organizuje wydarzenia integracyjne dla całej społeczności.',
    ctaLabel: 'Sprawdź WRSS WI',
    ctaHref: 'https://wrss.informatyka.agh.edu.pl/',
    imageUrl: '/images/wrss-wi-logo-white.png',
    imageAlt: 'Logo WRSS Wydziału Informatyki AGH',
    imageBg: 'brand',
  },
];

/** Default promo entry, used when a caller wants a single deterministic card. */
export const promoContent: PromoContent = promoContents[0];
