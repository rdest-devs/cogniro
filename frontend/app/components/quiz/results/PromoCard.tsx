import { ArrowUpRight } from 'lucide-react';

import type { PromoContent } from './promoData';

interface PromoCardProps {
  content: PromoContent;
}

/**
 * Promotional section on the results screen. Renders nothing when there is no
 * title or description, so missing content never breaks the layout.
 */
export default function PromoCard({ content }: PromoCardProps) {
  const title = content.title?.trim() ?? '';
  const description = content.description?.trim() ?? '';
  if (!title && !description) {
    return null;
  }

  const hasCta = Boolean(content.ctaLabel?.trim() && content.ctaHref?.trim());

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
      {content.imageUrl ? (
        <div
          className={`flex h-32 w-full items-center justify-center p-5 ${
            content.imageBg === 'brand'
              ? 'bg-gradient-to-r from-[var(--primary-blue)] to-[var(--orange)]'
              : 'border-b border-[var(--border)] bg-[var(--card-bg)]'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={content.imageUrl}
            alt={content.imageAlt ?? ''}
            loading="lazy"
            decoding="async"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      ) : (
        <div
          className="h-20 w-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--orange)]"
          aria-hidden
        />
      )}
      <div className="flex flex-col gap-2 p-4">
        {title ? (
          <h2 className="text-[15px] font-bold text-[var(--text-dark)]">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="text-sm leading-[1.5] text-[var(--text-muted)]">
            {description}
          </p>
        ) : null}
        {hasCta ? (
          <a
            href={content.ctaHref}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--primary-blue)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {content.ctaLabel}
            <ArrowUpRight size={16} aria-hidden />
          </a>
        ) : null}
      </div>
    </section>
  );
}
