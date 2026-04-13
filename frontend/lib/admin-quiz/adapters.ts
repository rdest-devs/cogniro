import type {
  AdminQuizApiDetails,
  AdminQuizUpsertPayload,
  QuizEditorFormValues,
  QuizQuestionType,
} from '@/app/types';

import { createDefaultQuizFormValues } from './defaults';
import { adminQuizUpsertPayloadSchema, quizEditorFormSchema } from './schemas';

const questionTypeMap: Record<string, QuizQuestionType> = {
  single_choice: 'single_choice',
  single: 'single_choice',
  jednokrotny: 'single_choice',
  multiple_choice: 'multiple_choice',
  multiple: 'multiple_choice',
  wielokrotny: 'multiple_choice',
};

export function normalizeQuestionType(rawType?: string): QuizQuestionType {
  if (!rawType) {
    return 'single_choice';
  }

  const normalized = rawType.trim().toLowerCase();
  return questionTypeMap[normalized] ?? 'single_choice';
}

export function toQuizEditorFormValues(
  quiz: AdminQuizApiDetails,
): QuizEditorFormValues {
  const mappedQuestions = quiz.questions.map((question) => ({
    id:
      question.id !== undefined && question.id !== null
        ? String(question.id)
        : undefined,
    text: question.text ?? question.content ?? '',
    type: normalizeQuestionType(question.type),
    answers: question.answers.map((answer) => ({
      id:
        answer.id !== undefined && answer.id !== null
          ? String(answer.id)
          : undefined,
      text: answer.text ?? answer.content ?? '',
      isCorrect: Boolean(answer.is_correct ?? answer.isCorrect),
    })),
  }));

  const values: QuizEditorFormValues = {
    title: quiz.title,
    timeLimit: quiz.time_limit,
    shuffleQuestions: quiz.shuffle_questions,
    showAnswersAfter: quiz.show_answers_after,
    showLeaderboardAfter: quiz.show_leaderboard_after,
    questions:
      mappedQuestions.length > 0
        ? mappedQuestions
        : createDefaultQuizFormValues().questions,
  };

  return quizEditorFormSchema.parse(values);
}

export function toAdminQuizUpsertPayload(
  values: QuizEditorFormValues,
): AdminQuizUpsertPayload {
  const payload: AdminQuizUpsertPayload = {
    title: values.title.trim(),
    time_limit: values.timeLimit,
    shuffle_questions: values.shuffleQuestions,
    show_answers_after: values.showAnswersAfter,
    show_leaderboard_after: values.showLeaderboardAfter,
    questions: values.questions.map((question) => ({
      id: question.id,
      text: question.text.trim(),
      type: question.type,
      answers: question.answers.map((answer) => ({
        id: answer.id,
        text: answer.text.trim(),
        is_correct: answer.isCorrect,
      })),
    })),
  };

  return adminQuizUpsertPayloadSchema.parse(payload);
}

export function mapApiQuizStatusToLabel(status: string): string {
  const normalized = status.trim().toLowerCase();

  if (normalized === 'active') {
    return 'Aktywny';
  }

  if (normalized === 'completed') {
    return 'Zakończony';
  }

  if (normalized === 'archived' || normalized === 'inactive') {
    return 'Stare';
  }

  return status;
}
