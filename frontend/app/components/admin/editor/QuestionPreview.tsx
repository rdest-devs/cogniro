import type { Question } from '@/app/types';
import { cn } from '@/lib/cn';

interface QuestionPreviewProps {
  question: Question;
}

export default function QuestionPreview({ question }: QuestionPreviewProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <h3 className="text-sm font-bold text-[var(--text-dark)]">
        Podgląd pytania
      </h3>
      <p className="text-sm text-[var(--text-dark)]">{question.text}</p>
      {question.answers.length > 0 && (
        <div className="flex flex-col gap-2">
          {question.answers.map((a, i) => (
            <div
              key={i}
              className={cn(
                'rounded-xl px-3 py-2 text-sm',
                a.isCorrect
                  ? 'border border-[var(--orange)] bg-[var(--selected-bg)] font-semibold'
                  : 'border border-[var(--border)] bg-white',
              )}
            >
              {a.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
