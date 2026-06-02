'use client';

import { useMemo } from 'react';

import type { QuizEditorQuestionForm } from '@/app/types';
import { cn } from '@/lib/cn';
import { resolveEditorQuestionPlayImageUrls } from '@/lib/media-url';

import EditorQuestionImagePreview from './EditorQuestionImagePreview';

interface QuestionPreviewProps {
  question: QuizEditorQuestionForm;
  editorQuizId?: string | null;
  /** Sum of question point weights for the quiz (live preview). */
  quizMaxPoints?: number;
}

const typeLabel: Record<QuizEditorQuestionForm['type'], string> = {
  singlechoice: 'Jednokrotny wybór',
  multichoice: 'Wielokrotny wybór',
  truefalse: 'Prawda / fałsz',
  slider: 'Suwak',
};

function previewBody(
  question: QuizEditorQuestionForm,
  editorQuizId?: string | null,
) {
  switch (question.type) {
    case 'singlechoice':
    case 'multichoice':
      return question.choices.map((choice, i) => {
        const rawChoiceImage =
          typeof choice.image === 'string' && choice.image.trim()
            ? choice.image.trim()
            : null;
        const choiceImageUrls = rawChoiceImage
          ? resolveEditorQuestionPlayImageUrls(rawChoiceImage, editorQuizId)
          : null;
        return (
          <div
            key={i}
            className={cn(
              'rounded-xl border px-3 py-2 text-sm',
              choice.isCorrect
                ? 'border-[var(--orange)] bg-[var(--selected-bg)] font-semibold'
                : 'border-[var(--border)] bg-white',
            )}
          >
            {choice.text.trim() ||
              (!rawChoiceImage ? `Odpowiedź ${i + 1}` : '')}
            {choiceImageUrls && (
              <EditorQuestionImagePreview
                key={choiceImageUrls.fullUrl}
                fullUrl={choiceImageUrls.fullUrl}
                thumbUrl={choiceImageUrls.thumbUrl}
                alt={`Odpowiedź ${i + 1}`}
                imgClassName="mt-1 max-h-20 w-full rounded object-contain"
                errorMessage={<>Brak obrazu</>}
              />
            )}
          </div>
        );
      });
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
      const { min, max, step, correct, tolerance, unit, minLabel, maxLabel } =
        question;
      return (
        <div className="flex flex-col gap-1 text-sm text-[var(--text-dark)]">
          <p>
            Zakres: {min} – {max}
            {unit ? ` ${unit}` : ''}, krok {step}
            {tolerance > 0 ? `, tolerancja ±${tolerance}` : ''}
          </p>
          {(minLabel?.trim() || maxLabel?.trim()) && (
            <p className="text-[var(--text-muted)]">
              {minLabel?.trim() ? `${min}: ${minLabel.trim()}` : ''}
              {minLabel?.trim() && maxLabel?.trim() ? ' · ' : ''}
              {maxLabel?.trim() ? `${max}: ${maxLabel.trim()}` : ''}
            </p>
          )}
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
  quizMaxPoints,
}: QuestionPreviewProps) {
  const rawImage =
    typeof question.image === 'string' && question.image.trim()
      ? question.image.trim()
      : null;

  const imageUrls = useMemo(
    () =>
      rawImage
        ? resolveEditorQuestionPlayImageUrls(rawImage, editorQuizId)
        : null,
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
      <p className="text-[12px] text-[var(--text-muted)]">
        Punkty za to pytanie:{' '}
        <span className="font-semibold text-[var(--text-dark)]">
          {question.points}
        </span>
        {quizMaxPoints !== undefined && quizMaxPoints > 0 && (
          <>
            {' '}
            · Łącznie maks. w quizie:{' '}
            <span className="font-semibold text-[var(--text-dark)]">
              {quizMaxPoints}
            </span>{' '}
            pkt
          </>
        )}
      </p>
      <p className="text-sm text-[var(--text-dark)]">
        {question.text.trim() || 'Brak treści pytania'}
      </p>
      {rawImage && !imageUrls && (
        <p className="text-xs text-[var(--text-muted)]">
          Obraz z katalogu quizu — zapisz quiz, aby znać identyfikator i
          zbudować adres podglądu.
        </p>
      )}
      {imageUrls && (
        <EditorQuestionImagePreview
          key={imageUrls.fullUrl}
          fullUrl={imageUrls.fullUrl}
          thumbUrl={imageUrls.thumbUrl}
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

      <div className="flex flex-col gap-2">
        {previewBody(question, editorQuizId)}
      </div>
    </div>
  );
}
