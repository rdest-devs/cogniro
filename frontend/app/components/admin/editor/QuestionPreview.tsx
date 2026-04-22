import type { QuizEditorQuestionForm } from '@/app/types';
import { cn } from '@/lib/cn';

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
        {question.text || 'Brak treści pytania'}
      </p>

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
            {answer.text || 'Pusta odpowiedz'}
          </div>
        ))}
      </div>
    </div>
  );
}
