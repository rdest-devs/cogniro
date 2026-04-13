import { z } from 'zod';

import { questionTypeValues } from '@/app/types/admin-editor';

export const questionTypeSchema = z.enum(questionTypeValues);

const editorAnswerSchema = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(1, 'Odpowiedź jest wymagana'),
  isCorrect: z.boolean(),
});

const editorQuestionSchema = z
  .object({
    id: z.string().optional(),
    text: z.string().trim().min(1, 'Treść pytania jest wymagana'),
    type: questionTypeSchema,
    answers: z
      .array(editorAnswerSchema)
      .min(2, 'Pytanie musi mieć co najmniej 2 odpowiedzi'),
  })
  .superRefine((question, ctx) => {
    const correctAnswersCount = question.answers.filter(
      (answer) => answer.isCorrect,
    ).length;

    if (question.type === 'single_choice' && correctAnswersCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pytanie jednokrotne musi mieć dokładnie 1 poprawną odpowiedź',
        path: ['answers'],
      });
    }

    if (question.type === 'multiple_choice' && correctAnswersCount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Pytanie wielokrotne musi mieć co najmniej 1 poprawną odpowiedź',
        path: ['answers'],
      });
    }
  });

export const quizEditorFormSchema = z.object({
  title: z.string().trim().min(1, 'Tytuł quizu jest wymagany'),
  timeLimit: z.number().int().positive().nullable(),
  shuffleQuestions: z.boolean(),
  showAnswersAfter: z.boolean(),
  showLeaderboardAfter: z.boolean(),
  questions: z
    .array(editorQuestionSchema)
    .min(1, 'Dodaj co najmniej 1 pytanie'),
});

const apiIdSchema = z.union([z.string(), z.number()]);

export const adminQuizApiAnswerSchema = z
  .object({
    id: apiIdSchema.optional(),
    text: z.string().optional(),
    content: z.string().optional(),
    is_correct: z.boolean().optional(),
    isCorrect: z.boolean().optional(),
  })
  .passthrough();

export const adminQuizApiQuestionSchema = z
  .object({
    id: apiIdSchema.optional(),
    text: z.string().optional(),
    content: z.string().optional(),
    type: z.string().optional(),
    answers: z.array(adminQuizApiAnswerSchema).default([]),
  })
  .passthrough();

export const adminQuizApiDetailsSchema = z
  .object({
    id: z.string().optional(),
    title: z.string(),
    status: z.string().optional(),
    time_limit: z.coerce.number().nullable(),
    shuffle_questions: z.boolean(),
    show_answers_after: z.boolean(),
    show_leaderboard_after: z.boolean().default(false),
    questions: z.array(adminQuizApiQuestionSchema).default([]),
  })
  .passthrough();

export const adminQuizApiListItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
    created_at: z.string(),
    participants_count: z.coerce.number(),
  })
  .passthrough();

export const adminQuizApiListSchema = z.array(adminQuizApiListItemSchema);

const adminQuizPayloadAnswerSchema = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(1),
  is_correct: z.boolean(),
});

const adminQuizPayloadQuestionSchema = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(1),
  type: questionTypeSchema,
  answers: z.array(adminQuizPayloadAnswerSchema).min(2),
});

export const adminQuizUpsertPayloadSchema = z.object({
  title: z.string().trim().min(1),
  time_limit: z.number().int().positive().nullable(),
  shuffle_questions: z.boolean(),
  show_answers_after: z.boolean(),
  show_leaderboard_after: z.boolean(),
  questions: z.array(adminQuizPayloadQuestionSchema).min(1),
});

export const adminQuizSaveResponseSchema = z
  .object({
    id: z.string().optional(),
  })
  .passthrough();
