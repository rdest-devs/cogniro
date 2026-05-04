'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, RefreshCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';

import type { QuizEditorFormValues } from '@/app/types';
import {
  AdminQuizApiError,
  createAdminQuiz,
  createDefaultQuizFormValues,
  createEmptyQuestion,
  getAdminQuiz,
  quizEditorFormSchema,
  toAdminQuizUpsertPayload,
  toQuizEditorFormValues,
  updateAdminQuiz,
} from '@/lib/admin-quiz';

import AdminLayout from '../layout/AdminLayout';
import QuestionListItem from './QuestionListItem';
import QuizSettingsForm from './QuizSettingsForm';

interface QuizEditorProps {
  mode: 'create' | 'edit';
  quizId?: string | null;
  onSaved?: (quizId: string) => void;
  onCancel?: () => void;
  onCreateQuiz?: () => void;
}

function toUiErrorMessage(error: unknown): string {
  if (error instanceof AdminQuizApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Sesja administratora wygasła. Zaloguj się ponownie.';
    }

    if (error.reason) {
      return `Błąd API: ${error.reason}`;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Wystąpił nieoczekiwany błąd.';
}

export default function QuizEditor({
  mode,
  quizId,
  onSaved,
  onCancel,
  onCreateQuiz,
}: QuizEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const formMethods = useForm<QuizEditorFormValues>({
    defaultValues: createDefaultQuizFormValues(),
    resolver: zodResolver(quizEditorFormSchema),
    mode: 'onChange',
  });

  const {
    control,
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = formMethods;

  const {
    fields: questionFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'questions',
  });

  useEffect(() => {
    let isMounted = true;
    const missingQuizIdError =
      'Brak identyfikatora quizu do edycji. Wróć do listy quizów i wybierz quiz ponownie.';

    async function loadQuizForEdit(targetQuizId: string) {
      setIsLoading(true);
      setLoadError(null);
      setSaveError(null);
      setSaveSuccess(null);

      try {
        const apiQuiz = await getAdminQuiz(targetQuizId);
        if (!isMounted) {
          return;
        }

        reset(toQuizEditorFormValues(apiQuiz));
        setExpandedIndex(0);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(toUiErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (mode === 'edit' && quizId) {
      void loadQuizForEdit(quizId);
    } else if (mode === 'edit' && !quizId) {
      setLoadError(missingQuizIdError);
      setSaveSuccess(null);
      setIsLoading(false);
    } else {
      reset(createDefaultQuizFormValues());
      setExpandedIndex(0);
      setLoadError(null);
      setSaveError(null);
      setSaveSuccess(null);
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [mode, quizId, reset]);

  const watchedTitle = watch('title');
  const watchedTimeLimit = watch('timeLimit');
  const watchedShuffle = watch('shuffleQuestions');
  const watchedShowAnswers = watch('showAnswersAfter');
  const watchedShowLeaderboard = watch('showLeaderboardAfter');
  const isMissingQuizId = mode === 'edit' && !quizId;
  const hasBlockingLoadError =
    mode === 'edit' && (isMissingQuizId || Boolean(loadError));

  const onSubmit = handleSubmit(async (values) => {
    if (hasBlockingLoadError) {
      setSaveError(
        loadError ??
          'Nie można zapisać zmian, bo brakuje identyfikatora quizu do edycji.',
      );
      setSaveSuccess(null);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const payload = toAdminQuizUpsertPayload(values);
      let response;

      if (mode === 'edit') {
        const editQuizId = quizId;

        if (!editQuizId) {
          setSaveError(
            'Nie można zapisać zmian, bo brakuje identyfikatora quizu do edycji.',
          );
          return;
        }

        response = await updateAdminQuiz(editQuizId, payload);
        const refreshed = await getAdminQuiz(editQuizId);
        reset(toQuizEditorFormValues(refreshed));
      } else {
        response = await createAdminQuiz(payload);
        reset(values);
      }

      const resolvedQuizId = response.id ?? quizId;
      setSaveSuccess('Zmiany zostały zapisane.');

      if (resolvedQuizId) {
        onSaved?.(resolvedQuizId);
      }
    } catch (error) {
      setSaveError(toUiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  });

  const handleAddQuestion = () => {
    append(createEmptyQuestion());
    setExpandedIndex(questionFields.length);
  };

  const handleRemoveQuestion = (index: number) => {
    remove(index);

    if (expandedIndex === index) {
      setExpandedIndex(Math.max(0, index - 1));
      return;
    }

    if (expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  return (
    <AdminLayout onCreateQuiz={onCreateQuiz}>
      <FormProvider {...formMethods}>
        <form onSubmit={onSubmit} className="flex min-h-0 w-full flex-1">
          <div className="flex min-h-0 flex-1 flex-col gap-5">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-dark)]">
                  {mode === 'edit' ? 'Edycja quizu' : 'Tworzenie quizu'}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="cursor-pointer rounded-2xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-dark)]"
                  >
                    Wróć
                  </button>
                )}

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    isSaving ||
                    !isValid ||
                    !isDirty ||
                    hasBlockingLoadError
                  }
                  className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--active)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSaving ? (
                    <RefreshCcw size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Zapisz quiz
                </button>
              </div>
            </header>

            {loadError && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-2xl border border-[var(--wrong-fg)] bg-[var(--selected-bg)] px-4 py-3 text-sm text-[var(--wrong-fg)]"
              >
                {loadError}
              </div>
            )}

            {saveError && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-2xl border border-[var(--wrong-fg)] bg-[var(--selected-bg)] px-4 py-3 text-sm text-[var(--wrong-fg)]"
              >
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-2xl border border-[var(--active)] bg-white px-4 py-3 text-sm text-[var(--active)]"
              >
                {saveSuccess}
              </div>
            )}

            <QuizSettingsForm
              title={watchedTitle}
              onTitleChange={(value) =>
                setValue('title', value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              timeLimit={watchedTimeLimit}
              onTimeLimitChange={(value) =>
                setValue('timeLimit', value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              shuffleQuestions={watchedShuffle}
              onShuffleQuestionsToggle={() =>
                setValue('shuffleQuestions', !watchedShuffle, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              showAnswersAfter={watchedShowAnswers}
              onShowAnswersAfterToggle={() =>
                setValue('showAnswersAfter', !watchedShowAnswers, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              showLeaderboardAfter={watchedShowLeaderboard}
              onShowLeaderboardAfterToggle={() =>
                setValue('showLeaderboardAfter', !watchedShowLeaderboard, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              titleError={errors.title?.message}
              timeLimitError={errors.timeLimit?.message}
            />

            <section className="flex flex-col gap-3">
              <h2 className="text-base font-bold text-[var(--text-dark)]">
                Pytania ({questionFields.length})
              </h2>

              {isLoading ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                  Ładowanie danych quizu...
                </div>
              ) : (
                questionFields.map((field, index) => (
                  <QuestionListItem
                    key={field.id}
                    index={index}
                    isExpanded={expandedIndex === index}
                    onToggle={() =>
                      setExpandedIndex((prevIndex) =>
                        prevIndex === index ? -1 : index,
                      )
                    }
                    onRemove={() => handleRemoveQuestion(index)}
                    canRemove={questionFields.length > 1}
                  />
                ))
              )}

              {!isLoading && (
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="flex cursor-pointer items-center justify-center gap-2 py-3 text-sm font-semibold text-[var(--primary-blue)] hover:underline"
                >
                  <Plus size={16} />
                  Dodaj pytanie
                </button>
              )}

              {errors.questions?.message && (
                <span className="text-sm text-[var(--wrong-fg)]">
                  {errors.questions.message}
                </span>
              )}
            </section>
          </div>
        </form>
      </FormProvider>
    </AdminLayout>
  );
}
