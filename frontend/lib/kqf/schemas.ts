import { z } from 'zod';

export const kqfFrontMatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  author: z.string().optional(),
  version: z.string().optional(),
  language: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const kqfMediaSchema = z.object({
  image: z.string().optional(),
  video: z.string().optional(),
  audio: z.string().optional(),
  hint: z.string().optional(),
});

export const kqfChoiceSchema = z.object({
  text: z.string().min(1),
  is_correct: z.boolean(),
});

const baseFields = {
  id: z.string().min(1),
  text: z.string().min(1),
  time_s: z.number().int().positive().nullish(),
  points: z.number().int().nonnegative().nullish(),
  media: kqfMediaSchema.default({}),
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
    correct: z.number(),
    min: z.number(),
    max: z.number(),
    step: z.number().default(1),
    tolerance: z.number().nonnegative().default(0),
    unit: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.min >= v.max) {
      ctx.addIssue({
        code: 'custom',
        message: 'min must be < max',
        path: ['max'],
      });
    }
    if (v.correct < v.min || v.correct > v.max) {
      ctx.addIssue({
        code: 'custom',
        message: 'correct must be in [min, max]',
        path: ['correct'],
      });
    }
    if (v.step <= 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'step must be > 0',
        path: ['step'],
      });
    }
  });

export const kqfQuestionSchema = z.discriminatedUnion('type', [
  kqfSingleChoiceSchema,
  kqfMultiChoiceSchema,
  kqfTrueFalseSchema,
  kqfSliderSchema,
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
export type KqfMedia = z.infer<typeof kqfMediaSchema>;
export type KqfChoice = z.infer<typeof kqfChoiceSchema>;
