import { z } from 'zod';

import { questionTypeValues } from '@/app/types/admin-editor';

export const questionTypeSchema = z.enum(questionTypeValues);

export const quizImageSchema = z.object({
  assetId: z.string().trim().min(1),
  url: z.string().trim().min(1),
  thumbUrl: z.string().trim().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string(),
});

function requireTextOrImage(
  value: { text: string; image?: unknown },
  ctx: z.RefinementCtx,
  message: string,
): void {
  if (!value.text.trim() && !value.image) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: ['text'],
    });
  }
}

function requireAnswerTextOrImage(
  answer: { text: string; image?: unknown },
  ctx: z.RefinementCtx,
): void {
  requireTextOrImage(answer, ctx, 'Odpowiedź musi mieć tekst lub obraz');
}

function requireQuestionTextOrImage(
  question: { text: string; image?: unknown },
  ctx: z.RefinementCtx,
): void {
  requireTextOrImage(question, ctx, 'Pytanie musi mieć treść lub obraz');
}

const editorAnswerSchema = z
  .object({
    id: z.string().optional(),
    text: z.string(),
    isCorrect: z.boolean(),
    image: quizImageSchema.optional(),
  })
  .superRefine(requireAnswerTextOrImage);

const editorQuestionSchema = z
  .object({
    id: z.string().optional(),
    text: z.string(),
    type: questionTypeSchema,
    image: quizImageSchema.optional(),
    answers: z
      .array(editorAnswerSchema)
      .min(2, 'Pytanie musi mieć co najmniej 2 odpowiedzi'),
  })
  .superRefine((question, ctx) => {
    requireQuestionTextOrImage(question, ctx);

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
const apiOptionalIdSchema = apiIdSchema
  .nullish()
  .transform((value) => (value == null ? undefined : value));
const apiOptionalStringSchema = z
  .string()
  .nullish()
  .transform((value) => (value == null ? undefined : value));
const apiOptionalQuizImageSchema = quizImageSchema
  .nullish()
  .transform((value) => (value == null ? undefined : value));

export const adminQuizApiAnswerSchema = z
  .object({
    id: apiOptionalIdSchema,
    text: apiOptionalStringSchema,
    content: apiOptionalStringSchema,
    is_correct: z.boolean().optional(),
    isCorrect: z.boolean().optional(),
    image: apiOptionalQuizImageSchema,
  })
  .passthrough();

export const adminQuizApiQuestionSchema = z
  .object({
    id: apiOptionalIdSchema,
    text: apiOptionalStringSchema,
    content: apiOptionalStringSchema,
    type: apiOptionalStringSchema,
    image: apiOptionalQuizImageSchema,
    answers: z.array(adminQuizApiAnswerSchema).default([]),
  })
  .passthrough();

export const adminQuizApiDetailsSchema = z
  .object({
    id: apiOptionalIdSchema.transform((value) =>
      value === undefined ? undefined : String(value),
    ),
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
    id: apiIdSchema.transform((value) => String(value)),
    title: z.string(),
    status: z.string(),
    created_at: z.string(),
    participants_count: z.coerce.number(),
  })
  .passthrough();

export const adminQuizApiListSchema = z.array(adminQuizApiListItemSchema);

const adminQuizPayloadAnswerSchema = z
  .object({
    id: z.string().optional(),
    text: z.string(),
    image: quizImageSchema.optional(),
    is_correct: z.boolean(),
  })
  .superRefine(requireAnswerTextOrImage);

const adminQuizPayloadQuestionSchema = z
  .object({
    id: z.string().optional(),
    text: z.string(),
    image: quizImageSchema.optional(),
    type: questionTypeSchema,
    answers: z.array(adminQuizPayloadAnswerSchema).min(2),
  })
  .superRefine(requireQuestionTextOrImage);

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
    id: apiOptionalIdSchema,
  })
  .passthrough()
  .transform((data) => ({
    ...data,
    id: data.id === undefined ? undefined : String(data.id),
  }));

export const adminAssetUploadResponseSchema = quizImageSchema;
