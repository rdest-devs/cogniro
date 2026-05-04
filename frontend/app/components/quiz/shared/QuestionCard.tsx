import ExportedImage from 'next-image-export-optimizer';

import type { QuizImage } from '@/app/types';
import { resolveMediaUrl } from '@/lib/media-url';

interface QuestionCardProps {
  question: string;
  hint?: string;
  imageUrl?: string;
  image?: QuizImage;
  imageLoading?: 'eager' | 'lazy';
}

export default function QuestionCard({
  question,
  hint,
  imageUrl,
  image,
  imageLoading = 'lazy',
}: QuestionCardProps) {
  const shouldRenderLegacyImage = Boolean(imageUrl) && !image;

  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl bg-[var(--card-bg)] p-5">
      <h2 className="text-lg leading-[1.4] font-bold text-[var(--text-dark)]">
        {question}
      </h2>
      {hint && (
        <p className="text-[13px] font-normal text-[var(--text-muted)]">
          {hint}
        </p>
      )}
      {shouldRenderLegacyImage && imageUrl && (
        <div className="relative mt-2 h-[180px] w-full overflow-hidden rounded-xl">
          <ExportedImage
            src={imageUrl}
            alt="Question"
            fill
            className="object-cover"
          />
        </div>
      )}
      {image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={resolveMediaUrl(image.url)}
          width={image.width}
          height={image.height}
          alt={image.alt || 'Question image'}
          loading={imageLoading}
          decoding="async"
          className="mt-2 w-full rounded-2xl object-contain"
        />
      )}
    </div>
  );
}
