import { z } from 'zod';

/** FastAPI serializes missing optional str fields as JSON `null`; normalize for TS. */
const nullableJsonString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v == null ? undefined : v));

export const kqfFrontMatterSchema = z.object({
  title: z.string().min(1),
  description: nullableJsonString,
  author: nullableJsonString,
  version: nullableJsonString,
  language: nullableJsonString,
  tags: z.array(z.string()).default([]),
  show_answer_review: z.boolean().optional().default(true),
  time_limit: z.number().int().positive().nullable().optional().default(null),
  shuffle_questions: z.boolean().optional().default(false),
  shuffle_mode: z
    .enum(['per_player', 'session'])
    .optional()
    .default('per_player'),
});

export const kqfMediaSchema = z.object({
  image: nullableJsonString,
  video: nullableJsonString,
  audio: nullableJsonString,
  hint: nullableJsonString,
});

const defaultKqfMedia: z.infer<typeof kqfMediaSchema> = {
  image: undefined,
  video: undefined,
  audio: undefined,
  hint: undefined,
};

export const kqfChoiceSchema = z.object({
  text: z.string().default(''),
  is_correct: z.boolean(),
  image: nullableJsonString,
});

function normalizeKqfPoints(value: unknown): number {
  if (value == null) {
    return 1;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 1) {
      return 1;
    }
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) {
      return 1;
    }
    return Math.trunc(n);
  }
  return 1;
}

const baseFields = {
  id: z.string().min(1),
  text: z.string().min(1),
  time_s: z.number().int().positive().nullish(),
  points: z.preprocess(normalizeKqfPoints, z.number().int().min(1)),
  media: kqfMediaSchema.default(defaultKqfMedia),
};

export const kqfSingleChoiceSchema = z
  .object({
    ...baseFields,
    type: z.literal('singlechoice'),
    choices: z.array(kqfChoiceSchema).min(2).max(6),
  })
  .superRefine((v, ctx) => {
    if (v.choices.filter((c) => c.is_correct).length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'singlechoice must have exactly 1 correct',
        path: ['choices'],
      });
    }
  });

export const kqfMultiChoiceSchema = z
  .object({
    ...baseFields,
    type: z.literal('multichoice'),
    choices: z.array(kqfChoiceSchema).min(2).max(8),
  })
  .superRefine((v, ctx) => {
    if (!v.choices.some((c) => c.is_correct)) {
      ctx.addIssue({
        code: 'custom',
        message: 'multichoice must have ≥1 correct',
        path: ['choices'],
      });
    }
  });

export const kqfTrueFalseSchema = z.object({
  ...baseFields,
  type: z.literal('truefalse'),
  correct: z.boolean(),
});

export const kqfSliderSchema = z
  .object({
    ...baseFields,
    type: z.literal('slider'),
    correct: z.number().nullable().default(null),
    min: z.number(),
    max: z.number(),
    step: z.number().default(1),
    tolerance: z.number().nonnegative().default(0),
    unit: nullableJsonString,
    score: z.enum(['range', 'scale']).default('range'),
    label_min: nullableJsonString,
    label_max: nullableJsonString,
  })
  .superRefine((v, ctx) => {
    if (v.min >= v.max) {
      ctx.addIssue({
        code: 'custom',
        message: 'min must be < max',
        path: ['max'],
      });
    }
    if (v.step <= 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'step must be > 0',
        path: ['step'],
      });
    }
    if (v.score === 'range') {
      if (v.correct === null) {
        ctx.addIssue({
          code: 'custom',
          message: 'slider with score=range requires correct field',
          path: ['correct'],
        });
      } else if (v.correct < v.min || v.correct > v.max) {
        ctx.addIssue({
          code: 'custom',
          message: 'correct must be in [min, max]',
          path: ['correct'],
        });
      }
    }
  });

export const kqfOrderingSchema = z
  .object({
    ...baseFields,
    type: z.literal('ordering'),
    items: z.array(z.string().min(1)).min(2).max(8),
    correct_order: z.array(z.number().int().nonnegative()),
  })
  .superRefine((v, ctx) => {
    const n = v.items.length;
    if (v.correct_order.length !== n) {
      ctx.addIssue({
        code: 'custom',
        message: `correct_order must have ${n} elements`,
        path: ['correct_order'],
      });
      return;
    }
    const sorted = [...v.correct_order].sort((a, b) => a - b);
    for (let i = 0; i < n; i++) {
      if (sorted[i] !== i) {
        ctx.addIssue({
          code: 'custom',
          message: 'correct_order must be a permutation of 0..n-1',
          path: ['correct_order'],
        });
        return;
      }
    }
  });

export const kqfImagePixelateSchema = z
  .object({
    ...baseFields,
    type: z.literal('imagepixelate'),
    choices: z.array(kqfChoiceSchema).min(2).max(6),
  })
  .superRefine((v, ctx) => {
    if (v.choices.filter((c) => c.is_correct).length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'imagepixelate must have exactly 1 correct',
        path: ['choices'],
      });
    }
    if (!v.media?.image?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'imagepixelate requires an image',
        path: ['media', 'image'],
      });
    }
    if (v.time_s == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'imagepixelate requires a per-question time',
        path: ['time_s'],
      });
    }
  });

export const kqfQuestionSchema = z.discriminatedUnion('type', [
  kqfSingleChoiceSchema,
  kqfMultiChoiceSchema,
  kqfTrueFalseSchema,
  kqfSliderSchema,
  kqfOrderingSchema,
  kqfImagePixelateSchema,
]);

export const kqfQuizSchema = z.object({
  front_matter: kqfFrontMatterSchema,
  questions: z.array(kqfQuestionSchema).min(1),
});

export type KqfQuiz = z.infer<typeof kqfQuizSchema>;
export type KqfQuestion = z.infer<typeof kqfQuestionSchema>;
export type KqfSingleChoice = z.infer<typeof kqfSingleChoiceSchema>;
export type KqfMultiChoice = z.infer<typeof kqfMultiChoiceSchema>;
export type KqfTrueFalse = z.infer<typeof kqfTrueFalseSchema>;
export type KqfSlider = z.infer<typeof kqfSliderSchema>;
export type KqfOrdering = z.infer<typeof kqfOrderingSchema>;
export type KqfImagePixelate = z.infer<typeof kqfImagePixelateSchema>;
export type KqfMedia = z.infer<typeof kqfMediaSchema>;
export type KqfChoice = z.infer<typeof kqfChoiceSchema>;
