'use client';

import { useEffect, useState } from 'react';

import { resolveMediaUrl } from '@/lib/media-url';

type Props = {
  /** Smaller asset; shown first when distinct from `fullUrl`. */
  thumbUrl?: string | null;
  /** Final asset URL (relative or absolute). */
  fullUrl: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'eager' | 'lazy';
};

/**
 * Loads `thumbUrl` first when it differs from `fullUrl` (after resolution), then
 * swaps to `fullUrl` only after the full image **successfully** preloads; if preload
 * fails, the visible `src` stays on the thumb (same idea as `AdminProgressiveBearerImage`).
 *
 * Typical KQF play flow: `fullUrl` is the full-size image (often ``…/image.webp``);
 * `thumbUrl` is the lighter asset (often sibling ``thumb.webp``). Values come from
 * `resolveKqfPlayImageUrls` in `PlayingShell` / `media-url.ts` (asset base URLs get
 * ``/image.webp`` and ``/thumb.webp`` appended in one step). Progressive loading is this component.
 */
export default function ProgressiveQuizImage({
  thumbUrl,
  fullUrl,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
}: Props) {
  const fullResolved = resolveMediaUrl(fullUrl);
  const thumbResolved = thumbUrl?.trim()
    ? resolveMediaUrl(thumbUrl.trim())
    : null;
  const useProgressive = Boolean(
    thumbResolved && thumbResolved !== fullResolved,
  );

  const [showFull, setShowFull] = useState(!useProgressive);

  /* Two-phase load: show thumb until full asset decodes; on full error keep thumb. */
  /* eslint-disable react-hooks/set-state-in-effect -- intentional reset + completion */
  useEffect(() => {
    if (!useProgressive) {
      setShowFull(true);
      return;
    }
    setShowFull(false);
    let cancelled = false;
    const img = new Image();
    const onLoad = () => {
      if (!cancelled) {
        setShowFull(true);
      }
    };
    img.addEventListener('load', onLoad);
    img.src = fullResolved;
    return () => {
      cancelled = true;
      img.removeEventListener('load', onLoad);
    };
  }, [fullResolved, thumbResolved, useProgressive]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const displaySrc =
    useProgressive && thumbResolved && !showFull ? thumbResolved : fullResolved;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={displaySrc}
      width={width}
      height={height}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
    />
  );
}
