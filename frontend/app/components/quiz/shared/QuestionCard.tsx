import ExportedImage from 'next-image-export-optimizer';

import type { QuizImage } from '@/app/types';

import ProgressiveQuizImage from './ProgressiveQuizImage';

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
  const normalizedQuestion = question.trim();
  const headingText = normalizedQuestion || (image ? 'Pytanie obrazkowe' : '');

  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl bg-[var(--card-bg)] p-5">
      {headingText && (
        <h2 className="text-lg leading-[1.4] font-bold text-[var(--text-dark)]">
          {headingText}
        </h2>
      )}
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
        <ProgressiveQuizImage
          thumbUrl={image.thumbUrl}
          fullUrl={image.url}
          width={image.width}
          height={image.height}
          alt={image.alt ?? ''}
          loading={imageLoading}
          className="mt-2 w-full rounded-2xl object-contain"
        />
      )}
    </div>
  );
}
