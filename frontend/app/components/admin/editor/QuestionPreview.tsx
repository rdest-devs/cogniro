'use client';

import { useMemo } from 'react';

import type { QuizEditorQuestionForm } from '@/app/types';
import { cn } from '@/lib/cn';
import { resolveEditorQuestionImageUrl } from '@/lib/media-url';

import EditorQuestionImagePreview from './EditorQuestionImagePreview';

interface QuestionPreviewProps {
  question: QuizEditorQuestionForm;
  editorQuizId?: string | null;
}

const typeLabel: Record<QuizEditorQuestionForm['type'], string> = {
  singlechoice: 'Jednokrotny wybór',
  multichoice: 'Wielokrotny wybór',
  truefalse: 'Prawda / fałsz',
  slider: 'Suwak',
};

function previewBody(question: QuizEditorQuestionForm) {
  switch (question.type) {
    case 'singlechoice':
    case 'multichoice':
      return question.choices.map((choice, i) => (
        <div
          key={i}
          className={cn(
            'rounded-xl border px-3 py-2 text-sm',
            choice.isCorrect
              ? 'border-[var(--orange)] bg-[var(--selected-bg)] font-semibold'
              : 'border-[var(--border)] bg-white',
          )}
        >
          {choice.text.trim() || `Odpowiedź ${i + 1}`}
        </div>
      ));
    case 'truefalse':
      return (
        <p className="text-sm text-[var(--text-dark)]">
          Poprawna:{' '}
          <span className="font-semibold">
            {question.correct ? 'Prawda' : 'Fałsz'}
          </span>
        </p>
      );
    case 'slider': {
      const { min, max, step, correct, tolerance, unit } = question;
      return (
        <div className="flex flex-col gap-1 text-sm text-[var(--text-dark)]">
          <p>
            Zakres: {min} – {max}
            {unit ? ` ${unit}` : ''}, krok {step}
            {tolerance > 0 ? `, tolerancja ±${tolerance}` : ''}
          </p>
          <p className="font-semibold">Docelowo: {correct}</p>
        </div>
      );
    }
    default: {
      const _exhaustive: never = question;
      return _exhaustive;
    }
  }
}

export default function QuestionPreview({
  question,
  editorQuizId,
}: QuestionPreviewProps) {
  const rawImage =
    typeof question.image === 'string' && question.image.trim()
      ? question.image.trim()
      : null;

  const imageDisplaySrc = useMemo(
    () =>
      rawImage ? resolveEditorQuestionImageUrl(rawImage, editorQuizId) : null,
    [rawImage, editorQuizId],
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <h3 className="text-sm font-bold text-[var(--text-dark)]">
        Podgląd pytania
      </h3>
      <p className="text-xs font-semibold text-[var(--text-muted)]">
        {typeLabel[question.type]}
      </p>
      <p className="text-sm text-[var(--text-dark)]">
        {question.text.trim() || 'Brak treści pytania'}
      </p>
      {rawImage && !imageDisplaySrc && (
        <p className="text-xs text-[var(--text-muted)]">
          Obraz z katalogu quizu — zapisz quiz, aby znać identyfikator i
          zbudować adres podglądu.
        </p>
      )}
      {imageDisplaySrc && (
        <EditorQuestionImagePreview
          key={imageDisplaySrc}
          imageDisplaySrc={imageDisplaySrc}
          alt="Ilustracja do pytania"
          imgClassName="w-full rounded-lg object-contain"
          errorMessage={
            <>
              Nie udało się załadować obrazu (plik w media/, zalogowanie w
              panelu admina lub adres API).
            </>
          }
        />
      )}

      <div className="flex flex-col gap-2">{previewBody(question)}</div>
    </div>
  );
}
