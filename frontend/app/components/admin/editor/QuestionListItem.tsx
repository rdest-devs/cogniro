'use client';

import {
  ChevronDown,
  Loader2,
  Plus,
  Shuffle,
  Trash2,
  Upload,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useMemo, useState } from 'react';
import type { Path } from 'react-hook-form';
import { useFieldArray, useFormContext } from 'react-hook-form';

import StatusBadge from '@/app/components/common/StatusBadge';
import type {
  KqfQuestionType,
  QuizEditorFormValues,
  QuizEditorQuestionForm,
} from '@/app/types';
import {
  AdminQuizApiError,
  switchQuestionTypePreservingCommon,
  uploadAdminAsset,
} from '@/lib/admin-quiz';
import { cn } from '@/lib/cn';
import {
  normalizeKqfQuestionImageToDirectoryPath,
  resolveEditorQuestionPlayImageUrls,
} from '@/lib/media-url';

import { typeColors } from '../shared/constants';
import EditorQuestionImagePreview from './EditorQuestionImagePreview';
import QuestionPreview from './QuestionPreview';

interface QuestionListItemProps {
  index: number;
  /** In edit mode: `./media/…` URLs resolve to `GET /admin/quiz/{quizId}/media/…` (Bearer). */
  editorQuizId?: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

const typeOptions: Array<{ label: string; value: KqfQuestionType }> = [
  { label: 'Jednokrotny', value: 'singlechoice' },
  { label: 'Wielokrotny', value: 'multichoice' },
  { label: 'Prawda / fałsz', value: 'truefalse' },
  { label: 'Suwak', value: 'slider' },
  { label: 'Porządkowanie', value: 'ordering' },
  { label: 'Obraz pikselowany', value: 'imagepixelate' },
];

const typeLabelMap: Record<KqfQuestionType, string> = {
  singlechoice: 'Jednokrotny',
  multichoice: 'Wielokrotny',
  truefalse: 'Prawda / fałsz',
  slider: 'Suwak',
  ordering: 'Porządkowanie',
  imagepixelate: 'Obraz pikselowany',
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

function ChoiceAnswersSection({
  questionIndex,
  editorQuizId,
}: {
  questionIndex: number;
  editorQuizId?: string | null;
}) {
  const {
    control,
    register,
    watch,
    getValues,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<QuizEditorFormValues>();

  const questionPath = `questions.${questionIndex}` as const;
  const choicesPath = `${questionPath}.choices` as const;
  const questionType = watch(`${questionPath}.type` as const) as
    | 'singlechoice'
    | 'multichoice'
    | 'imagepixelate';
  const isSingleSelect =
    questionType === 'singlechoice' || questionType === 'imagepixelate';

  const { fields, append, remove } = useFieldArray({
    control,
    name: choicesPath,
  });

  const [choiceUploadingKeys, setChoiceUploadingKeys] = useState<Set<string>>(
    new Set(),
  );
  const [choiceUploadError, setChoiceUploadError] = useState<string | null>(
    null,
  );

  const addChoiceUploadingKey = (key: string) =>
    setChoiceUploadingKeys((prev) => new Set(prev).add(key));
  const removeChoiceUploadingKey = (key: string) =>
    setChoiceUploadingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

  // Field errors for discriminated question unions are not narrowed by RHF.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionErrors = errors.questions?.[questionIndex] as any;
  const maxChoices = isSingleSelect ? 6 : 8;

  const handleSetSingleCorrect = (selectedAnswerIndex: number) => {
    const answers = getValues(choicesPath);
    answers.forEach((_, answerIndex) => {
      setValue(
        `${choicesPath}.${answerIndex}.isCorrect`,
        answerIndex === selectedAnswerIndex,
        { shouldValidate: true, shouldDirty: true },
      );
    });
    void trigger(questionPath);
  };

  const handleSetMultipleCorrect = (answerIndex: number, checked: boolean) => {
    setValue(`${choicesPath}.${answerIndex}.isCorrect`, checked, {
      shouldValidate: true,
      shouldDirty: true,
    });
    void trigger(questionPath);
  };

  const handleAnswerImageUpload =
    (answerIdx: number) => async (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      event.currentTarget.value = '';
      if (!selectedFile) return;
      const key = `answer-${answerIdx}`;
      setChoiceUploadError(null);
      addChoiceUploadingKey(key);
      try {
        const uploaded = await uploadAdminAsset(selectedFile);
        const dirPath = normalizeKqfQuestionImageToDirectoryPath(uploaded.url);
        const imgPath =
          `${choicesPath}.${answerIdx}.image` as Path<QuizEditorFormValues>;
        setValue(imgPath, dirPath ?? uploaded.url, {
          shouldDirty: true,
          shouldValidate: true,
        });
        void trigger(questionPath);
      } catch (error) {
        setChoiceUploadError(toUploadErrorMessage(error));
      } finally {
        removeChoiceUploadingKey(key);
      }
    };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[13px] font-medium text-[var(--text-muted)]">
        Odpowiedzi ({fields.length})
      </legend>

      {fields.map((answerField, answerIndex) => {
        const answerTextPath = `${choicesPath}.${answerIndex}.text` as const;
        const answerCorrectPath =
          `${choicesPath}.${answerIndex}.isCorrect` as const;
        const answerInputId = `question-${questionIndex}-answer-${answerIndex}-text`;
        const answerLabelId = `${answerInputId}-label`;
        const answerText = watch(answerTextPath);
        const isCorrect = watch(answerCorrectPath);
        const answerImage = watch(
          `${choicesPath}.${answerIndex}.image` as Path<QuizEditorFormValues>,
        ) as string | null | undefined;
        const answerError =
          questionErrors?.choices?.[answerIndex]?.text?.message;

        const rawAnswerImage =
          typeof answerImage === 'string' && answerImage.trim()
            ? answerImage.trim()
            : null;
        const answerImageUrls = rawAnswerImage
          ? resolveEditorQuestionPlayImageUrls(rawAnswerImage, editorQuizId)
          : null;

        return (
          <div key={answerField.id} className="flex items-start gap-2">
            {isSingleSelect ? (
              <input
                type="radio"
                name={`question-${questionIndex}-correct`}
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
                  handleSetMultipleCorrect(answerIndex, event.target.checked)
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

              {/* Answer image upload */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'relative inline-flex min-h-[2.25rem] cursor-pointer items-center gap-2 overflow-hidden rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-dark)]',
                    choiceUploadingKeys.has(`answer-${answerIndex}`) &&
                      'cursor-wait opacity-60',
                  )}
                >
                  <span className="pointer-events-none inline-flex items-center gap-2">
                    {choiceUploadingKeys.has(`answer-${answerIndex}`) ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Prześlij obraz
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={choiceUploadingKeys.has(`answer-${answerIndex}`)}
                    onChange={handleAnswerImageUpload(answerIndex)}
                    aria-label={`Prześlij obraz odpowiedzi ${answerIndex + 1}`}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  />
                </span>
                {rawAnswerImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue(
                        `${choicesPath}.${answerIndex}.image` as Path<QuizEditorFormValues>,
                        null,
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      );
                      void trigger(questionPath);
                    }}
                    className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--wrong-fg)]"
                  >
                    Usuń obraz
                  </button>
                )}
              </div>
              {answerImageUrls && (
                <EditorQuestionImagePreview
                  key={answerImageUrls.fullUrl}
                  fullUrl={answerImageUrls.fullUrl}
                  thumbUrl={answerImageUrls.thumbUrl}
                  alt={`Podgląd obrazu odpowiedzi ${answerIndex + 1}`}
                  imgClassName="max-h-28 w-full rounded-lg object-contain"
                  errorMessage={<>Nie udało się załadować obrazu odpowiedzi.</>}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => remove(answerIndex)}
              disabled={fields.length <= 2}
              className="mt-0.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--wrong-fg)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Usuń odpowiedź ${answerIndex + 1} w pytaniu ${questionIndex + 1}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => append({ text: '', isCorrect: false, image: null })}
        disabled={fields.length >= maxChoices}
        className="mt-1 flex cursor-pointer items-center gap-2 self-start rounded-xl border border-dashed border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-blue)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={14} />
        Dodaj odpowiedź
      </button>

      {(questionErrors?.choices?.message ??
        questionErrors?.choices?.root?.message) && (
        <span className="text-xs text-[var(--wrong-fg)]">
          {questionErrors.choices?.message ??
            questionErrors.choices?.root?.message}
        </span>
      )}

      {choiceUploadError && (
        <div
          role="alert"
          className="rounded-xl border border-[var(--wrong-fg)] bg-white px-3 py-2 text-xs text-[var(--wrong-fg)]"
        >
          {choiceUploadError}
        </div>
      )}
    </fieldset>
  );
}

function TrueFalseSection({ questionIndex }: { questionIndex: number }) {
  const { watch, setValue, trigger } = useFormContext<QuizEditorFormValues>();
  const questionPath = `questions.${questionIndex}` as const;
  const correct = watch(`${questionPath}.correct` as const);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-[var(--text-muted)]">
        Poprawna odpowiedź
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(correct)}
          aria-label="Przełącz prawdę lub fałsz"
          onClick={() => {
            setValue(`${questionPath}.correct`, !correct, {
              shouldDirty: true,
              shouldValidate: true,
            });
            void trigger(questionPath);
          }}
          className={cn(
            'flex h-5 w-9 cursor-pointer items-center rounded-full p-0.5 transition-colors',
            correct ? 'bg-[var(--primary-blue)]' : 'bg-[var(--border)]',
          )}
        >
          <span
            className={cn(
              'h-4 w-4 rounded-full bg-white transition-transform',
              correct && 'translate-x-4',
            )}
          />
        </button>
        <span className="text-sm text-[var(--text-dark)]">
          {correct ? 'Prawda' : 'Fałsz'}
        </span>
      </div>
    </div>
  );
}

function SliderSection({ questionIndex }: { questionIndex: number }) {
  const { register, watch, setValue, trigger } =
    useFormContext<QuizEditorFormValues>();
  const questionPath = `questions.${questionIndex}` as const;
  const min = Number(
    watch(`${questionPath}.min` as unknown as Path<QuizEditorFormValues>),
  );
  const max = Number(
    watch(`${questionPath}.max` as unknown as Path<QuizEditorFormValues>),
  );
  const step = Number(
    watch(`${questionPath}.step` as unknown as Path<QuizEditorFormValues>),
  );
  const correct = watch(
    `${questionPath}.correct` as unknown as Path<QuizEditorFormValues>,
  ) as number | null;
  const tolerance = Number(
    watch(`${questionPath}.tolerance` as unknown as Path<QuizEditorFormValues>),
  );
  const unitStr =
    (
      watch(`${questionPath}.unit` as unknown as Path<QuizEditorFormValues>) as
        | string
        | null
    )?.trim() ?? '';
  const scoreMode =
    (watch(
      `${questionPath}.score` as unknown as Path<QuizEditorFormValues>,
    ) as string) ?? 'range';

  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  const previewTicks = 5;
  const span = max - min;
  const tickValues =
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    span > 0 &&
    Number.isFinite(safeStep)
      ? Array.from(
          { length: previewTicks + 1 },
          (_, i) => min + (span * i) / previewTicks,
        )
      : [];

  const inputClass =
    'rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm';

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-[var(--text-muted)]">
          Tryb punktacji
        </span>
        <select
          value={scoreMode}
          onChange={(e) => {
            setValue(
              `${questionPath}.score` as unknown as Path<QuizEditorFormValues>,
              e.target.value,
              { shouldDirty: true },
            );
            if (e.target.value === 'scale') {
              setValue(
                `${questionPath}.correct` as unknown as Path<QuizEditorFormValues>,
                null,
                { shouldDirty: true },
              );
            }
            void trigger(questionPath);
          }}
          className={inputClass}
        >
          <option value="range">Zakres (z wartością docelową)</option>
          <option value="scale">Skala opinii (bez oceny)</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">
            Min
          </span>
          <input
            type="number"
            step="any"
            {...register(
              `${questionPath}.min` as unknown as Path<QuizEditorFormValues>,
              { valueAsNumber: true },
            )}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">
            Max
          </span>
          <input
            type="number"
            step="any"
            {...register(
              `${questionPath}.max` as unknown as Path<QuizEditorFormValues>,
              { valueAsNumber: true },
            )}
            className={inputClass}
          />
        </label>
        {scoreMode === 'range' && (
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-[var(--text-muted)]">
              Poprawna wartość
            </span>
            <input
              type="number"
              step="any"
              {...register(
                `${questionPath}.correct` as unknown as Path<QuizEditorFormValues>,
                { valueAsNumber: true },
              )}
              className={inputClass}
            />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">
            Krok
          </span>
          <input
            type="number"
            step="any"
            {...register(
              `${questionPath}.step` as unknown as Path<QuizEditorFormValues>,
              { valueAsNumber: true },
            )}
            className={inputClass}
          />
        </label>
        {scoreMode === 'range' && (
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-[var(--text-muted)]">
              Tolerancja
            </span>
            <input
              type="number"
              step="any"
              min={0}
              {...register(
                `${questionPath}.tolerance` as unknown as Path<QuizEditorFormValues>,
                { valueAsNumber: true },
              )}
              className={inputClass}
            />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">
            Jednostka (opcj.)
          </span>
          <input
            value={
              (watch(
                `${questionPath}.unit` as unknown as Path<QuizEditorFormValues>,
              ) as string | null) ?? ''
            }
            onChange={(event) => {
              const v = event.target.value;
              setValue(
                `${questionPath}.unit` as unknown as Path<QuizEditorFormValues>,
                v.trim() ? v : null,
                {
                  shouldDirty: true,
                  shouldValidate: true,
                },
              );
              void trigger(questionPath);
            }}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">
            Etykieta min (opcj.)
          </span>
          <input
            value={
              (watch(
                `${questionPath}.label_min` as unknown as Path<QuizEditorFormValues>,
              ) as string | null) ?? ''
            }
            onChange={(event) => {
              const v = event.target.value;
              setValue(
                `${questionPath}.label_min` as unknown as Path<QuizEditorFormValues>,
                v || null,
                { shouldDirty: true },
              );
            }}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">
            Etykieta max (opcj.)
          </span>
          <input
            value={
              (watch(
                `${questionPath}.label_max` as unknown as Path<QuizEditorFormValues>,
              ) as string | null) ?? ''
            }
            onChange={(event) => {
              const v = event.target.value;
              setValue(
                `${questionPath}.label_max` as unknown as Path<QuizEditorFormValues>,
                v || null,
                { shouldDirty: true },
              );
            }}
            className={inputClass}
          />
        </label>
      </div>

      <div className="rounded-xl border border-dashed border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--text-muted)]">
        <span className="font-semibold text-[var(--text-dark)]">
          Podgląd zakresu:
        </span>{' '}
        {Number.isFinite(min) && Number.isFinite(max) ? (
          <>
            [{min}, {max}]{unitStr ? ` ${unitStr}` : ''} · krok {safeStep}
            {scoreMode === 'range' &&
            Number.isFinite(tolerance) &&
            tolerance > 0
              ? ` · ±${tolerance}`
              : ''}
            {scoreMode === 'range' &&
            correct !== null &&
            Number.isFinite(correct)
              ? ` · cel: ${correct}`
              : ''}
            {scoreMode === 'scale' ? ' · skala opinii' : ''}
          </>
        ) : (
          'Uzupełnij min i max.'
        )}
      </div>

      {tickValues.length > 0 && scoreMode === 'range' && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium tracking-wide text-[var(--text-muted)] uppercase">
            Skala (orientacyjnie)
          </span>
          <div className="relative h-6 rounded-full bg-[var(--border)]/60">
            {tickValues.map((v) => {
              const pct = span > 0 ? ((v - min) / span) * 100 : 0;
              return (
                <span
                  key={v}
                  title={String(v)}
                  className="absolute top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--text-muted)]"
                  style={{ left: `${pct}%` }}
                />
              );
            })}
            {correct !== null && Number.isFinite(correct) && span > 0 && (
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--orange)] shadow"
                style={{
                  left: `${Math.min(100, Math.max(0, ((correct - min) / span) * 100))}%`,
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function OrderingSection({ questionIndex }: { questionIndex: number }) {
  const { watch, setValue, trigger } = useFormContext<QuizEditorFormValues>();
  const questionPath = `questions.${questionIndex}` as const;

  type FV = QuizEditorFormValues;
  const p = (s: string) => s as unknown as Path<FV>;

  const items = (watch(p(`${questionPath}.items`)) as string[]) ?? [];
  const correctOrder =
    (watch(p(`${questionPath}.correct_order`)) as number[]) ?? [];

  // Local string state so the user can type freely without the field snapping back.
  // We sync it explicitly whenever we programmatically change correct_order.
  const [orderStr, setOrderStr] = useState(() =>
    correctOrder.map((i) => i + 1).join(', '),
  );

  const applyItems = (next: string[]) =>
    setValue(p(`${questionPath}.items`), next, { shouldDirty: true });

  const applyOrder = (next: number[]) => {
    setValue(p(`${questionPath}.correct_order`), next, { shouldDirty: true });
    setOrderStr(next.map((i) => i + 1).join(', '));
    void trigger(questionPath);
  };

  const handleAddItem = () => {
    applyItems([...items, '']);
    applyOrder([...correctOrder, items.length]);
  };

  const handleRemoveItem = (idx: number) => {
    applyItems(items.filter((_, i) => i !== idx));
    applyOrder(
      correctOrder.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i)),
    );
  };

  const handleShuffle = () => {
    // Derive the correct semantic sequence from the current data
    const seq = correctOrder.map((i) => items[i]);
    let shuffled: string[];
    let attempts = 0;
    // Retry until the shuffled order is NOT already the correct sequence
    do {
      shuffled = fisherYates(items);
      attempts++;
    } while (attempts < 100 && seq.every((item, k) => shuffled[k] === item));

    const newOrder = seq.map((item) => shuffled.indexOf(item));
    applyItems(shuffled);
    applyOrder(newOrder);
  };

  const handleOrderStrChange = (value: string) => {
    setOrderStr(value);
    // Push to form only when the string is a valid complete permutation
    const parts = value.split(',').map((s) => parseInt(s.trim(), 10) - 1);
    const n = items.length;
    const isValid =
      parts.length === n &&
      parts.every((v) => Number.isFinite(v) && v >= 0 && v < n) &&
      new Set(parts).size === n;
    if (isValid) {
      setValue(p(`${questionPath}.correct_order`), parts, {
        shouldDirty: true,
      });
      void trigger(questionPath);
    }
  };

  const inputClass =
    'rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm';

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] font-medium text-[var(--text-muted)]">
          Elementy do porządkowania ({items.length}/8)
        </legend>
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-[11px] font-bold text-white">
              {idx + 1}
            </span>
            <input
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[idx] = e.target.value;
                applyItems(next);
              }}
              placeholder={`Element ${idx + 1}`}
              className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={items.length <= 2}
              onClick={() => handleRemoveItem(idx)}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--wrong-fg)] text-[var(--wrong-fg)] hover:bg-[var(--wrong-fg)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {items.length < 8 && (
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--primary-blue)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-blue)] hover:bg-[var(--primary-blue)] hover:text-white"
            >
              <Plus size={13} />
              Dodaj element
            </button>
          )}
          <button
            type="button"
            onClick={handleShuffle}
            title="Losowo przetasuj kolejność elementów (wynik nie będzie poprawnym ułożeniem)"
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--orange)] hover:text-[var(--orange)]"
          >
            <Shuffle size={13} />
            Przetasuj
          </button>
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-[var(--text-muted)]">
          Prawidłowa kolejność (numery elementów oddzielone przecinkami)
        </span>
        <input
          value={orderStr}
          onChange={(e) => handleOrderStrChange(e.target.value)}
          onBlur={() => setOrderStr(correctOrder.map((i) => i + 1).join(', '))}
          placeholder={`np. ${Array.from({ length: items.length }, (_, i) => i + 1).join(', ')}`}
          className={inputClass}
        />
        <span className="text-[11px] text-[var(--text-muted)]">
          Wpisz numery elementów (1–{items.length}) w poprawnej kolejności, np.{' '}
          <code>2, 1, 4, 3</code>. Zapis do formularza nastąpi gdy wpiszesz
          kompletną permutację.
        </span>
      </label>
    </div>
  );
}

export default function QuestionListItem({
  index,
  editorQuizId,
  isExpanded,
  onToggle,
  onRemove,
  canRemove,
}: QuestionListItemProps) {
  const {
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

  const questionText = watch(`${questionPath}.text` as const);
  const questionType = watch(
    `${questionPath}.type` as const,
  ) as KqfQuestionType;
  const questionImage = watch(`${questionPath}.image` as const) as
    | string
    | null
    | undefined;
  const questionErrors = errors.questions?.[index];

  const questionForPreview = watch(questionPath) as QuizEditorQuestionForm;
  const allQuestions = watch('questions');
  const quizMaxPoints = allQuestions.reduce((sum, q) => {
    const p = q?.points;
    return sum + (typeof p === 'number' && p >= 1 ? p : 1);
  }, 0);

  const addUploadingKey = (key: string) =>
    setUploadingKeys((prev) => new Set(prev).add(key));
  const removeUploadingKey = (key: string) =>
    setUploadingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

  const handleTypeChange = (nextType: KqfQuestionType) => {
    const current = getValues(questionPath) as QuizEditorQuestionForm;
    setValue(
      questionPath,
      switchQuestionTypePreservingCommon(current, nextType),
      {
        shouldValidate: true,
        shouldDirty: true,
      },
    );
    void trigger(questionPath);
  };

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
      const uploaded = await uploadAdminAsset(selectedFile);
      const dirPath = normalizeKqfQuestionImageToDirectoryPath(uploaded.url);
      setValue(`${questionPath}.image`, dirPath ?? uploaded.url, {
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

  const panelId = `question-panel-${index}`;
  const rawQuestionImage =
    typeof questionImage === 'string' && questionImage.trim()
      ? questionImage.trim()
      : null;

  const questionImageUrls = useMemo(
    () =>
      rawQuestionImage
        ? resolveEditorQuestionPlayImageUrls(rawQuestionImage, editorQuizId)
        : null,
    [rawQuestionImage, editorQuizId],
  );

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
          disabled={!canRemove || uploadingKeys.size > 0}
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[13px] font-medium text-[var(--text-muted)]">
                    Czas na pytanie (s, opcj.)
                  </span>
                  <input
                    type="number"
                    min={1}
                    placeholder="brak"
                    {...register(`${questionPath}.timeS` as const, {
                      setValueAs: (v) => {
                        if (v === '' || v === null || v === undefined) {
                          return null;
                        }
                        const n = Number(v);
                        return Number.isFinite(n) && n > 0 ? n : null;
                      },
                    })}
                    className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[13px] font-medium text-[var(--text-muted)]">
                    Punkty
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="1"
                    {...register(`${questionPath}.points` as const, {
                      setValueAs: (v) => {
                        if (v === '' || v === null || v === undefined) {
                          return 1;
                        }
                        const n = Number(v);
                        return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : 1;
                      },
                    })}
                    className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-[var(--text-muted)]">
                  Podpowiedź (opcj.)
                </span>
                <input
                  {...register(`${questionPath}.hint` as const)}
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-[var(--text-muted)]">
                  {questionType === 'imagepixelate'
                    ? 'Obraz do pytania (wymagany — będzie pikselowany)'
                    : 'Obraz do pytania (opcj., URL z uploadu)'}
                </span>
                {questionType === 'imagepixelate' && !rawQuestionImage && (
                  <p className="text-xs text-[var(--wrong-fg)]">
                    To pytanie wymaga obrazu, który będzie się odpikselowywać.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'relative inline-flex min-h-[2.25rem] cursor-pointer items-center gap-2 overflow-hidden rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-dark)]',
                      uploadingKeys.has('question') && 'cursor-wait opacity-60',
                    )}
                  >
                    <span className="pointer-events-none inline-flex items-center gap-2">
                      {uploadingKeys.has('question') ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      Prześlij obraz
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={uploadingKeys.has('question')}
                      onChange={handleQuestionImageUpload}
                      aria-label="Prześlij obraz do pytania"
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    />
                  </span>
                  {questionImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue(`${questionPath}.image`, null, {
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
                {rawQuestionImage && !questionImageUrls && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Obraz z katalogu quizu (`./media/…`) - zapisz quiz, aby znać
                    identyfikator i zbudować adres podglądu.
                  </p>
                )}
                {questionImageUrls && (
                  <EditorQuestionImagePreview
                    key={questionImageUrls.fullUrl}
                    fullUrl={questionImageUrls.fullUrl}
                    thumbUrl={questionImageUrls.thumbUrl}
                    alt="Podgląd obrazu pytania"
                    imgClassName="max-h-40 w-full rounded-lg object-contain"
                    errorMessage={
                      <>
                        Nie udało się załadować obrazu (sprawdź, czy plik jest w
                        folderze media quizu, czy jesteś zalogowany w panelu
                        admina i czy adres API jest poprawny).
                      </>
                    }
                  />
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
                      handleTypeChange(event.target.value as KqfQuestionType)
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

              {(questionType === 'singlechoice' ||
                questionType === 'multichoice' ||
                questionType === 'imagepixelate') && (
                <ChoiceAnswersSection
                  questionIndex={index}
                  editorQuizId={editorQuizId}
                />
              )}

              {questionType === 'truefalse' && (
                <TrueFalseSection questionIndex={index} />
              )}

              {questionType === 'slider' && (
                <SliderSection questionIndex={index} />
              )}

              {questionType === 'ordering' && (
                <OrderingSection questionIndex={index} />
              )}

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
              question={questionForPreview}
              editorQuizId={editorQuizId}
              quizMaxPoints={quizMaxPoints}
            />
          </div>
        </div>
      )}
    </article>
  );
}
