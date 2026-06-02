export interface PromoContent {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  /** Optional promo image (local path under /public or absolute URL). */
  imageUrl?: string;
  imageAlt?: string;
}

/**
 * Promotional content shown on the results screen after a quiz.
 * Swap this single object to change what participants see.
 */
export const promoContent: PromoContent = {
  title: 'Wydział Informatyki AGH',
  description:
    'Poznaj kierunki, koła naukowe i wydarzenia. Dołącz do społeczności i twórz z nami technologię.',
  ctaLabel: 'Odwiedź stronę wydziału',
  ctaHref: 'https://www.informatyka.agh.edu.pl',
};
