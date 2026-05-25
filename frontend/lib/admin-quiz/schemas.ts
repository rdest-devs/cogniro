import { z } from 'zod';

import { kqfQuestionTypeValues } from '@/app/types/admin-editor';

export const kqfQuestionTypeSchema = z.enum(kqfQuestionTypeValues);

export const quizImageSchema = z.object({
  assetId: z.string().trim().min(1),
  url: z.string().trim().min(1),
  thumbUrl: z.string().trim().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string(),
});

const optionalId = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v == null ? undefined : String(v)));

const optionalTrimmedString = z
  .string()
  .nullish()
  .transform((v) => (v == null ? undefined : v));

const optionalNullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

function countCorrectChoices(choices: { isCorrect: boolean }[]): number {
  return choices.filter((c) => c.isCorrect).length;
}

const editorChoiceSchema = z
  .object({
    text: z.string(),
    isCorrect: z.boolean(),
    image: z
      .union([z.string().trim().min(1), z.literal(''), z.null()])
      .optional()
      .transform((v) => (v === undefined || v === null || v === '' ? null : v)),
  })
  .superRefine((c, ctx) => {
    if (!c.text.trim() && !c.image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Odpowiedź musi mieć tekst lub obraz',
        path: ['text'],
      });
    }
  });

const questionCommonFormSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, 'Treść pytania jest wymagana'),
  timeS: z
    .union([z.number().int().positive(), z.nan()])
    .nullable()
    .optional()
    .transform((v) =>
      v === undefined || v === null || Number.isNaN(v) ? null : v,
    ),
  points: z.preprocess((v) => {
    if (v === undefined || v === null || v === '') {
      return 1;
    }
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n < 1) {
      return 1;
    }
    return Math.trunc(n);
  }, z.number().int().min(1)),
  image: z
    .union([z.string().trim().min(1), z.literal(''), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') {
        return null;
      }
      return v;
    }),
  hint: z
    .union([z.string(), z.literal(''), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') {
        return null;
      }
      return v;
    }),
});

const editorSingleChoiceSchema = questionCommonFormSchema
  .extend({
    type: z.literal('singlechoice'),
    choices: z
      .array(editorChoiceSchema)
      .min(2, 'Minimum 2 odpowiedzi')
      .max(6, 'Maksimum 6 odpowiedzi'),
  })
  .superRefine((q, ctx) => {
    const n = countCorrectChoices(q.choices);
    if (n !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Jednokrotny wybór wymaga dokładnie 1 poprawnej odpowiedzi',
        path: ['choices'],
      });
    }
  });

const editorMultiChoiceSchema = questionCommonFormSchema
  .extend({
    type: z.literal('multichoice'),
    choices: z
      .array(editorChoiceSchema)
      .min(2, 'Minimum 2 odpowiedzi')
      .max(8, 'Maksimum 8 odpowiedzi'),
  })
  .superRefine((q, ctx) => {
    if (countCorrectChoices(q.choices) < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Wielokrotny wybór wymaga co najmniej 1 poprawnej odpowiedzi',
        path: ['choices'],
      });
    }
  });

const editorTrueFalseSchema = questionCommonFormSchema.extend({
  type: z.literal('truefalse'),
  correct: z.boolean(),
});

const editorSliderSchema = questionCommonFormSchema
  .extend({
    type: z.literal('slider'),
    correct: z.coerce.number().finite(),
    min: z.coerce.number().finite(),
    max: z.coerce.number().finite(),
    step: z.coerce.number().finite().positive().default(1),
    tolerance: z.coerce.number().finite().min(0).default(0),
    unit: z
      .union([z.string(), z.literal(''), z.null()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === null || v === '') {
          return null;
        }
        return v;
      }),
  })
  .superRefine((q, ctx) => {
    if (q.min >= q.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Min musi być mniejsze niż max',
        path: ['min'],
      });
    }
    if (q.correct < q.min || q.correct > q.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Poprawna wartość musi być w zakresie [min, max]',
        path: ['correct'],
      });
    }
  });

export const quizEditorQuestionFormSchema = z.discriminatedUnion('type', [
  editorSingleChoiceSchema,
  editorMultiChoiceSchema,
  editorTrueFalseSchema,
  editorSliderSchema,
]);

export const quizEditorFormSchema = z.object({
  title: z.string().trim().min(1, 'Tytuł quizu jest wymagany'),
  description: z
    .union([z.string(), z.literal(''), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') {
        return null;
      }
      return v;
    }),
  author: z
    .union([z.string(), z.literal(''), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') {
        return null;
      }
      return v;
    }),
  tags: z.array(z.string().trim().min(1)),
  showAnswerReview: z.boolean().default(true),
  questions: z
    .array(quizEditorQuestionFormSchema)
    .min(1, 'Dodaj co najmniej 1 pytanie'),
});

const apiChoiceSchema = z.object({
  text: z.string(),
  is_correct: z.boolean(),
  image: z
    .union([z.string().trim().min(1), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === undefined || v === null || v === '' ? null : v)),
});

const apiQuestionCommon = {
  id: optionalId,
  text: z.string(),
  time_s: z.coerce.number().int().positive().nullish(),
  points: z.preprocess((v) => {
    if (v === undefined || v === null || v === '') {
      return 1;
    }
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n < 1) {
      return 1;
    }
    return Math.trunc(n);
  }, z.number().int().min(1)),
  image: optionalNullableString,
  hint: optionalNullableString,
};

const adminQuizApiSingleSchema = z
  .object({
    ...apiQuestionCommon,
    type: z.literal('singlechoice'),
    choices: z.array(apiChoiceSchema).min(1),
  })
  .passthrough();

const adminQuizApiMultiSchema = z
  .object({
    ...apiQuestionCommon,
    type: z.literal('multichoice'),
    choices: z.array(apiChoiceSchema).min(1),
  })
  .passthrough();

const adminQuizApiTrueFalseSchema = z
  .object({
    ...apiQuestionCommon,
    type: z.literal('truefalse'),
    correct: z.boolean(),
  })
  .passthrough();

const adminQuizApiSliderSchema = z
  .object({
    ...apiQuestionCommon,
    type: z.literal('slider'),
    correct: z.coerce.number(),
    min: z.coerce.number(),
    max: z.coerce.number(),
    step: z.coerce.number(),
    tolerance: z.coerce.number(),
    unit: optionalTrimmedString,
  })
  .passthrough();

export const adminQuizApiQuestionSchema = z.discriminatedUnion('type', [
  adminQuizApiSingleSchema,
  adminQuizApiMultiSchema,
  adminQuizApiTrueFalseSchema,
  adminQuizApiSliderSchema,
]);

export const adminQuizApiDetailsSchema = z
  .object({
    id: optionalId.transform((v) => (v === undefined ? '' : v)),
    title: z.string(),
    description: optionalNullableString,
    author: optionalNullableString,
    tags: z.array(z.string()).optional().default([]),
    show_answer_review: z.boolean().optional().default(true),
    status: z.enum(['idle', 'running']).optional(),
    created_at: z.string(),
    updated_at: z.string().optional(),
    last_activated_at: z.string().nullable().optional(),
    questions: z.array(adminQuizApiQuestionSchema).default([]),
  })
  .passthrough();

export const adminQuizApiListItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    title: z.string(),
    status: z.enum(['idle', 'running']),
    created_at: z.string(),
    last_activated_at: z.string().nullable().optional(),
    question_count: z.coerce.number().int().min(0),
  })
  .passthrough();

export const adminQuizApiListSchema = z.array(adminQuizApiListItemSchema);

const upsertChoiceSchema = z
  .object({
    text: z.string().trim(),
    is_correct: z.boolean(),
    image: z
      .union([z.string(), z.literal(''), z.null()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === null || v === '') {
          return undefined;
        }
        const t = v.trim();
        return t === '' ? undefined : t;
      }),
  })
  .superRefine((c, ctx) => {
    if (!c.text && !c.image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'choice must have text or image',
        path: ['text'],
      });
    }
  });

const upsertCommon = {
  id: z.string().optional(),
  text: z.string().trim().min(1),
  time_s: z.number().int().positive().nullable().optional(),
  points: z.preprocess((v) => {
    if (v === undefined || v === null) {
      return 1;
    }
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n < 1) {
      return 1;
    }
    return Math.trunc(n);
  }, z.number().int().min(1)),
  image: z
    .union([z.string(), z.literal(''), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') {
        return undefined;
      }
      const t = v.trim();
      return t === '' ? undefined : t;
    }),
  hint: z
    .union([z.string(), z.literal(''), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') {
        return undefined;
      }
      const t = v.trim();
      return t === '' ? undefined : t;
    }),
};

const upsertSingleSchema = z
  .object({
    ...upsertCommon,
    type: z.literal('singlechoice'),
    choices: z.array(upsertChoiceSchema).min(2).max(6),
  })
  .superRefine((q, ctx) => {
    const correct = q.choices.filter((c) => c.is_correct).length;
    if (correct !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'singlechoice wymaga dokładnie 1 poprawnej odpowiedzi',
        path: ['choices'],
      });
    }
  });

const upsertMultiSchema = z
  .object({
    ...upsertCommon,
    type: z.literal('multichoice'),
    choices: z.array(upsertChoiceSchema).min(2).max(8),
  })
  .superRefine((q, ctx) => {
    if (!q.choices.some((c) => c.is_correct)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'multichoice wymaga co najmniej 1 poprawnej odpowiedzi',
        path: ['choices'],
      });
    }
  });

const upsertTrueFalseSchema = z.object({
  ...upsertCommon,
  type: z.literal('truefalse'),
  correct: z.boolean(),
});

const upsertSliderSchema = z
  .object({
    ...upsertCommon,
    type: z.literal('slider'),
    correct: z.number().finite(),
    min: z.number().finite(),
    max: z.number().finite(),
    step: z.number().finite().positive().default(1),
    tolerance: z.number().finite().min(0).default(0),
    unit: z
      .union([z.string(), z.literal(''), z.null()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === null || v === '') {
          return undefined;
        }
        const t = v.trim();
        return t === '' ? undefined : t;
      }),
  })
  .superRefine((q, ctx) => {
    if (q.min >= q.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'min must be < max',
        path: ['min'],
      });
    }
    if (q.correct < q.min || q.correct > q.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correct must be in [min, max]',
        path: ['correct'],
      });
    }
  });

const adminQuizUpsertQuestionSchema = z.discriminatedUnion('type', [
  upsertSingleSchema,
  upsertMultiSchema,
  upsertTrueFalseSchema,
  upsertSliderSchema,
]);

export const adminQuizUpsertPayloadSchema = z.object({
  title: z.string().trim().min(1),
  description: z
    .union([z.string(), z.literal(''), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') {
        return null;
      }
      const t = v.trim();
      return t === '' ? null : t;
    }),
  author: z
    .union([z.string(), z.literal(''), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') {
        return null;
      }
      const t = v.trim();
      return t === '' ? null : t;
    }),
  tags: z.array(z.string().trim().min(1)),
  show_answer_review: z.boolean().optional().default(true),
  questions: z.array(adminQuizUpsertQuestionSchema).min(1),
});

export const adminQuizSaveResponseSchema = z
  .object({
    id: optionalId,
  })
  .passthrough()
  .transform((data) => ({
    ...data,
    id: data.id === undefined ? undefined : String(data.id),
  }));

export const adminAssetUploadResponseSchema = quizImageSchema;
