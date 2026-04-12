import ExportedImage from 'next-image-export-optimizer';

interface QuestionCardProps {
  question: string;
  hint?: string;
  imageUrl?: string;
}

export default function QuestionCard({
  question,
  hint,
  imageUrl,
}: QuestionCardProps) {
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
      {imageUrl && (
        <div className="relative mt-2 h-[180px] w-full overflow-hidden rounded-xl">
          <ExportedImage
            src={imageUrl}
            alt="Question"
            fill
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}
