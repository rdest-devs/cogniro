'use client';

import { ChevronDown, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import StatusBadge from '@/app/components/common/StatusBadge';
import type { QuizEditorFormValues, QuizQuestionType } from '@/app/types';
import { AdminQuizApiError, uploadAdminAsset } from '@/lib/admin-quiz';
import { cn } from '@/lib/cn';
import { resolveMediaUrl } from '@/lib/media-url';

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

function toUploadErrorMessage(error: unknown): string {
  if (error instanceof AdminQuizApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Nie udało się przesłać obrazu.';
}

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

  const [uploadingKeys, setUploadingKeys] = useState<Set<string>>(new Set());
  const [uploadError, setUploadError] = useState<string | null>(null);

  const questionPath = `questions.${index}` as const;
  const answersPath = `${questionPath}.answers` as const;

  const { fields, append, remove } = useFieldArray({
    control,
    name: answersPath,
  });

  const questionText = watch(`${questionPath}.text` as const);
  const questionType =
    watch(`${questionPath}.type` as const) ?? ('single_choice' as const);
  const questionImage = watch(`${questionPath}.image` as const);
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

  const addUploadingKey = (key: string) =>
    setUploadingKeys((prev) => new Set(prev).add(key));
  const removeUploadingKey = (key: string) =>
    setUploadingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

  const handleQuestionImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    event.currentTarget.value = '';

    if (!selectedFile) {
      return;
    }

    setUploadError(null);
    addUploadingKey('question');

    try {
      const uploadedImage = await uploadAdminAsset(selectedFile);
      setValue(`${questionPath}.image`, uploadedImage, {
        shouldDirty: true,
        shouldValidate: true,
      });
      void trigger(questionPath);
    } catch (error) {
      setUploadError(toUploadErrorMessage(error));
    } finally {
      removeUploadingKey('question');
    }
  };

  const handleAnswerImageUpload =
    (answerIndex: number) => async (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      event.currentTarget.value = '';

      if (!selectedFile) {
        return;
      }

      const key = `answer-${answerIndex}`;
      setUploadError(null);
      addUploadingKey(key);

      try {
        const uploadedImage = await uploadAdminAsset(selectedFile);
        const imagePath = `${answersPath}.${answerIndex}.image` as const;
        setValue(imagePath, uploadedImage, {
          shouldDirty: true,
          shouldValidate: true,
        });
        void trigger(questionPath);
      } catch (error) {
        setUploadError(toUploadErrorMessage(error));
      } finally {
        removeUploadingKey(key);
      }
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
          <span className="flex-1 truncate text-left text-sm font-medium text-[var(--text-dark)]">
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
          aria-label={`Usuń pytanie ${index + 1}`}
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
                  Treść pytania
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

              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-[var(--text-muted)]">
                  Obraz pytania (opcjonalnie)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-dark)]">
                    {uploadingKeys.has('question') ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Prześlij obraz
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={uploadingKeys.has('question')}
                      onChange={handleQuestionImageUpload}
                    />
                  </label>
                  {questionImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue(`${questionPath}.image`, undefined, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        void trigger(questionPath);
                      }}
                      className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--wrong-fg)]"
                    >
                      Usuń obraz
                    </button>
                  )}
                </div>
                {questionImage && (
                  <div className="rounded-xl border border-[var(--border)] bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveMediaUrl(questionImage.thumbUrl)}
                      alt={questionImage.alt || 'Podgląd obrazu pytania'}
                      width={questionImage.width}
                      height={questionImage.height}
                      loading="lazy"
                      decoding="async"
                      className="max-h-40 w-full rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>

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
                  const answerImagePath =
                    `${answersPath}.${answerIndex}.image` as const;
                  const answerInputId = `question-${index}-answer-${answerIndex}-text`;
                  const answerLabelId = `${answerInputId}-label`;
                  const answerText = watch(answerTextPath);
                  const answerImage = watch(answerImagePath);
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

                      <div className="flex flex-1 flex-col gap-2">
                        <label
                          id={answerLabelId}
                          htmlFor={answerInputId}
                          className="sr-only"
                        >
                          {answerText?.trim()
                            ? `Odpowiedź: ${answerText}`
                            : `Odpowiedź ${answerIndex + 1}`}
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

                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-dark)]">
                            {uploadingKeys.has(`answer-${answerIndex}`) ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Upload size={14} />
                            )}
                            Obraz odpowiedzi
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              disabled={uploadingKeys.has(
                                `answer-${answerIndex}`,
                              )}
                              onChange={handleAnswerImageUpload(answerIndex)}
                            />
                          </label>

                          {answerImage && (
                            <button
                              type="button"
                              onClick={() => {
                                setValue(answerImagePath, undefined, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                                void trigger(questionPath);
                              }}
                              className="rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--wrong-fg)]"
                            >
                              Usuń obraz
                            </button>
                          )}
                        </div>

                        {answerImage && (
                          <div className="rounded-lg border border-[var(--border)] bg-white p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveMediaUrl(answerImage.thumbUrl)}
                              alt={
                                answerImage.alt ||
                                `Podgląd obrazu odpowiedzi ${answerIndex + 1}`
                              }
                              width={answerImage.width}
                              height={answerImage.height}
                              loading="lazy"
                              decoding="async"
                              className="max-h-28 w-full rounded-md object-contain"
                            />
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(answerIndex)}
                        disabled={fields.length <= 2}
                        className="mt-0.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--wrong-fg)] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Usuń odpowiedź ${answerIndex + 1} w pytaniu ${index + 1}`}
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
                  Dodaj odpowiedź
                </button>

                {(questionErrors?.answers?.message ??
                  questionErrors?.answers?.root?.message) && (
                  <span className="text-xs text-[var(--wrong-fg)]">
                    {questionErrors.answers?.message ??
                      questionErrors.answers?.root?.message}
                  </span>
                )}
              </fieldset>

              {uploadError && (
                <div
                  role="alert"
                  className="rounded-xl border border-[var(--wrong-fg)] bg-white px-3 py-2 text-xs text-[var(--wrong-fg)]"
                >
                  {uploadError}
                </div>
              )}
            </div>

            <QuestionPreview
              question={{
                text: questionText ?? '',
                image: questionImage,
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
