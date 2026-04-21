'use client';

import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import StatusBadge from '@/app/components/common/StatusBadge';
import type { QuizEditorFormValues, QuizQuestionType } from '@/app/types';
import { cn } from '@/lib/cn';

import { typeColors } from '../shared/constants';
import QuestionPreview from './QuestionPreview';

interface QuestionListItemProps {
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

const typeOptions: Array<{ label: string; value: QuizQuestionType }> = [
  { label: 'Jednokrotny', value: 'single_choice' },
  { label: 'Wielokrotny', value: 'multiple_choice' },
];

const typeLabelMap: Record<QuizQuestionType, string> = {
  single_choice: 'Jednokrotny',
  multiple_choice: 'Wielokrotny',
};

export default function QuestionListItem({
  index,
  isExpanded,
  onToggle,
  onRemove,
  canRemove,
}: QuestionListItemProps) {
  const {
    control,
    register,
    watch,
    getValues,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<QuizEditorFormValues>();

  const questionPath = `questions.${index}` as const;
  const answersPath = `${questionPath}.answers` as const;

  const { fields, append, remove } = useFieldArray({
    control,
    name: answersPath,
  });

  const questionText = watch(`${questionPath}.text` as const);
  const questionType =
    watch(`${questionPath}.type` as const) ?? ('single_choice' as const);
  const questionAnswers = watch(answersPath);
  const questionErrors = errors.questions?.[index];

  const handleSetSingleCorrect = (selectedAnswerIndex: number) => {
    const answers = getValues(answersPath);

    answers.forEach((_, answerIndex) => {
      setValue(
        `${answersPath}.${answerIndex}.isCorrect`,
        answerIndex === selectedAnswerIndex,
        { shouldValidate: true, shouldDirty: true },
      );
    });

    void trigger(questionPath);
  };

  const handleSetMultipleCorrect = (answerIndex: number, checked: boolean) => {
    setValue(`${answersPath}.${answerIndex}.isCorrect`, checked, {
      shouldValidate: true,
      shouldDirty: true,
    });
    void trigger(questionPath);
  };

  const handleTypeChange = (nextType: QuizQuestionType) => {
    setValue(`${questionPath}.type`, nextType, {
      shouldValidate: true,
      shouldDirty: true,
    });

    if (nextType === 'single_choice') {
      const answers = getValues(answersPath);
      const firstCorrectIndex = answers.findIndex((answer) => answer.isCorrect);
      const targetIndex = firstCorrectIndex >= 0 ? firstCorrectIndex : 0;

      answers.forEach((_, answerIndex) => {
        setValue(
          `${answersPath}.${answerIndex}.isCorrect`,
          answerIndex === targetIndex,
          { shouldValidate: true, shouldDirty: true },
        );
      });
    }

    void trigger(questionPath);
  };

  const panelId = `question-panel-${index}`;

  return (
    <article>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          className={cn(
            'flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors',
            isExpanded
              ? 'border-[var(--orange)] bg-[var(--selected-bg)]'
              : 'border-[var(--border)] bg-[var(--card-bg)]',
          )}
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-sm font-bold text-white">
            {index + 1}
          </span>
          <span className="flex-1 text-left text-sm font-medium text-[var(--text-dark)]">
            {questionText || `Pytanie ${index + 1}`}
          </span>
          <StatusBadge
            label={typeLabelMap[questionType]}
            colorMap={typeColors}
          />
        </button>

        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--wrong-fg)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Usun pytanie ${index + 1}`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {isExpanded && (
        <div
          id={panelId}
          className="mt-2 rounded-2xl border border-[var(--orange)] bg-[var(--selected-bg)] p-5"
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-[var(--text-muted)]">
                  Tresc pytania
                </span>
                <input
                  {...register(`${questionPath}.text`)}
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
                />
                {questionErrors?.text?.message && (
                  <span className="text-xs text-[var(--wrong-fg)]">
                    {questionErrors.text.message}
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-[var(--text-muted)]">
                  Typ pytania
                </span>
                <div className="relative w-56">
                  <select
                    value={questionType}
                    onChange={(event) =>
                      handleTypeChange(event.target.value as QuizQuestionType)
                    }
                    className="w-full appearance-none rounded-xl border border-[var(--border)] bg-white px-3 py-2 pr-8 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
                  >
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                </div>
              </label>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-[13px] font-medium text-[var(--text-muted)]">
                  Odpowiedzi ({fields.length})
                </legend>

                {fields.map((answerField, answerIndex) => {
                  const answerTextPath =
                    `${answersPath}.${answerIndex}.text` as const;
                  const answerCorrectPath =
                    `${answersPath}.${answerIndex}.isCorrect` as const;
                  const answerInputId = `question-${index}-answer-${answerIndex}-text`;
                  const answerLabelId = `${answerInputId}-label`;
                  const answerText = watch(answerTextPath);
                  const isCorrect = watch(answerCorrectPath);
                  const answerError =
                    questionErrors?.answers?.[answerIndex]?.text?.message;

                  return (
                    <div
                      key={answerField.id}
                      className="flex items-start gap-2"
                    >
                      {questionType === 'single_choice' ? (
                        <input
                          type="radio"
                          name={`question-${index}-correct`}
                          checked={isCorrect}
                          onChange={() => handleSetSingleCorrect(answerIndex)}
                          aria-labelledby={answerLabelId}
                          className="mt-2 h-4 w-4 accent-[var(--orange)]"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isCorrect}
                          onChange={(event) =>
                            handleSetMultipleCorrect(
                              answerIndex,
                              event.target.checked,
                            )
                          }
                          aria-labelledby={answerLabelId}
                          className="mt-2 h-4 w-4 accent-[var(--orange)]"
                        />
                      )}

                      <div className="flex flex-1 flex-col gap-1">
                        <label
                          id={answerLabelId}
                          htmlFor={answerInputId}
                          className="sr-only"
                        >
                          {answerText?.trim()
                            ? `Odpowiedz: ${answerText}`
                            : `Odpowiedz ${answerIndex + 1}`}
                        </label>
                        <input
                          id={answerInputId}
                          {...register(answerTextPath)}
                          aria-labelledby={answerLabelId}
                          className={cn(
                            'rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]',
                            isCorrect
                              ? 'border-[var(--orange)] bg-[var(--selected-bg)]'
                              : 'border-[var(--border)] bg-white',
                          )}
                        />
                        {answerError && (
                          <span className="text-xs text-[var(--wrong-fg)]">
                            {answerError}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(answerIndex)}
                        disabled={fields.length <= 2}
                        className="mt-0.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--wrong-fg)] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Usun odpowiedz ${answerIndex + 1} w pytaniu ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => append({ text: '', isCorrect: false })}
                  className="mt-1 flex cursor-pointer items-center gap-2 self-start rounded-xl border border-dashed border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-blue)]"
                >
                  <Plus size={14} />
                  Dodaj odpowiedz
                </button>

                {questionErrors?.answers?.message && (
                  <span className="text-xs text-[var(--wrong-fg)]">
                    {questionErrors.answers.message}
                  </span>
                )}
              </fieldset>
            </div>

            <QuestionPreview
              question={{
                text: questionText ?? '',
                type: questionType,
                answers: questionAnswers ?? [],
              }}
            />
          </div>
        </div>
      )}
    </article>
  );
}
