'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import ProgressiveQuizImage from '@/app/components/quiz/shared/ProgressiveQuizImage';
import { isAdminQuizMediaFetchUrl } from '@/lib/media-url';

import AdminProgressiveBearerImage from './AdminProgressiveBearerImage';

type EditorQuestionImagePreviewProps = {
  /** Resolved fetch URLs (e.g. after `resolveEditorQuestionPlayImageUrls`). */
  fullUrl: string;
  thumbUrl: string;
  alt: string;
  imgClassName: string;
  errorMessage: ReactNode;
};

export default function EditorQuestionImagePreview({
  fullUrl,
  thumbUrl,
  alt,
  imgClassName,
  errorMessage,
}: EditorQuestionImagePreviewProps) {
  const [errorUrls, setErrorUrls] = useState<{
    fullUrl: string;
    thumbUrl: string;
  } | null>(null);
  const loadError =
    errorUrls !== null &&
    errorUrls.fullUrl === fullUrl &&
    errorUrls.thumbUrl === thumbUrl;

  if (loadError) {
    return <p className="text-xs text-[var(--text-muted)]">{errorMessage}</p>;
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-3">
      {isAdminQuizMediaFetchUrl(fullUrl) ? (
        <AdminProgressiveBearerImage
          thumbFetchUrl={thumbUrl}
          fullFetchUrl={fullUrl}
          alt={alt}
          onLoadError={() => setErrorUrls({ fullUrl, thumbUrl })}
          className={imgClassName}
        />
      ) : (
        <ProgressiveQuizImage
          fullUrl={fullUrl}
          thumbUrl={thumbUrl}
          alt={alt}
          className={imgClassName}
          loading="lazy"
        />
      )}
    </div>
  );
}
