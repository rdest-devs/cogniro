'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import { isAdminQuizMediaFetchUrl } from '@/lib/media-url';

import AdminBearerImage from './AdminBearerImage';

type EditorQuestionImagePreviewProps = {
  /** Parent should set `key={imageDisplaySrc}` so load errors reset when the URL changes. */
  imageDisplaySrc: string;
  alt: string;
  imgClassName: string;
  errorMessage: ReactNode;
};

export default function EditorQuestionImagePreview({
  imageDisplaySrc,
  alt,
  imgClassName,
  errorMessage,
}: EditorQuestionImagePreviewProps) {
  const [loadError, setLoadError] = useState(false);

  if (loadError) {
    return <p className="text-xs text-[var(--text-muted)]">{errorMessage}</p>;
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-3">
      {isAdminQuizMediaFetchUrl(imageDisplaySrc) ? (
        <AdminBearerImage
          fetchUrl={imageDisplaySrc}
          alt={alt}
          onLoadError={() => setLoadError(true)}
          className={imgClassName}
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDisplaySrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setLoadError(true)}
            className={imgClassName}
          />
        </>
      )}
    </div>
  );
}
