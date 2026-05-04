import type { QuizEditorQuestionForm } from '@/app/types';
import { cn } from '@/lib/cn';
import { resolveMediaUrl } from '@/lib/media-url';

interface QuestionPreviewProps {
  question: QuizEditorQuestionForm;
}

const typeLabel: Record<QuizEditorQuestionForm['type'], string> = {
  single_choice: 'Jednokrotny wybór',
  multiple_choice: 'Wielokrotny wybór',
};

export default function QuestionPreview({ question }: QuestionPreviewProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <h3 className="text-sm font-bold text-[var(--text-dark)]">
        Podgląd pytania
      </h3>
      <p className="text-xs font-semibold text-[var(--text-muted)]">
        {typeLabel[question.type]}
      </p>
      <p className="text-sm text-[var(--text-dark)]">
        {question.text ||
          (question.image ? 'Pytanie obrazkowe' : 'Brak treści pytania')}
      </p>
      {question.image && (
        <div className="rounded-xl border border-[var(--border)] bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveMediaUrl(question.image.thumbUrl)}
            alt={question.image.alt || 'Podgląd obrazu pytania'}
            width={question.image.width}
            height={question.image.height}
            loading="lazy"
            decoding="async"
            className="w-full rounded-lg object-contain"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {question.answers.map((answer, index) => (
          <div
            key={`${answer.id ?? 'new'}-${index}`}
            className={cn(
              'rounded-xl border px-3 py-2 text-sm',
              answer.isCorrect
                ? 'border-[var(--orange)] bg-[var(--selected-bg)] font-semibold'
                : 'border-[var(--border)] bg-white',
            )}
          >
            <div className="flex flex-col gap-2">
              <span>
                {answer.text ||
                  (answer.image ? 'Odpowiedź obrazkowa' : 'Pusta odpowiedź')}
              </span>
              {answer.image && (
                <div className="rounded-lg border border-[var(--border)] bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaUrl(answer.image.thumbUrl)}
                    alt={
                      answer.image.alt ||
                      `Podgląd obrazu odpowiedzi ${index + 1}`
                    }
                    width={answer.image.width}
                    height={answer.image.height}
                    loading="lazy"
                    decoding="async"
                    className="max-h-24 w-full rounded-md object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
