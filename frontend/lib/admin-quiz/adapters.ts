import type {
  AdminQuizApiChoice,
  AdminQuizApiDetails,
  AdminQuizApiQuestion,
  AdminQuizUpsertPayload,
  AdminQuizUpsertQuestionPayload,
  KqfQuestionType,
  QuizEditorChoiceForm,
  QuizEditorFormValues,
  QuizEditorQuestionForm,
} from '@/app/types';
import { normalizeKqfQuestionImageToDirectoryPath } from '@/lib/media-url';

import { createDefaultQuizFormValues, createQuestionForType } from './defaults';
import { adminQuizUpsertPayloadSchema, quizEditorFormSchema } from './schemas';

const CANONICAL_QUESTION_TYPES = new Set<KqfQuestionType>([
  'singlechoice',
  'multichoice',
  'truefalse',
  'slider',
  'ordering',
]);

function mapApiChoiceToForm(c: AdminQuizApiChoice): QuizEditorChoiceForm {
  return {
    text: c.text,
    isCorrect: c.is_correct,
    image:
      normalizeKqfQuestionImageToDirectoryPath(c.image ?? undefined) ?? null,
  };
}

function mapApiQuestionToForm(q: AdminQuizApiQuestion): QuizEditorQuestionForm {
  const id = q.id;
  const text = q.text;
  const timeS = q.time_s ?? null;
  const points = q.points ?? 1;
  const image = normalizeKqfQuestionImageToDirectoryPath(q.image ?? undefined);
  const hint = q.hint ?? null;

  switch (q.type) {
    case 'singlechoice':
      return {
        id,
        text,
        timeS,
        points,
        image,
        hint,
        type: 'singlechoice',
        choices: q.choices.map(mapApiChoiceToForm),
      };
    case 'multichoice':
      return {
        id,
        text,
        timeS,
        points,
        image,
        hint,
        type: 'multichoice',
        choices: q.choices.map(mapApiChoiceToForm),
      };
    case 'truefalse':
      return {
        id,
        text,
        timeS,
        points,
        image,
        hint,
        type: 'truefalse',
        correct: q.correct,
      };
    case 'slider':
      return {
        id,
        text,
        timeS,
        points,
        image,
        hint,
        type: 'slider',
        correct: q.correct ?? null,
        min: q.min,
        max: q.max,
        step: q.step,
        tolerance: q.tolerance,
        unit: q.unit ?? null,
        score: q.score ?? 'range',
        label_min: q.label_min ?? null,
        label_max: q.label_max ?? null,
      };
    case 'ordering':
      return {
        id,
        text,
        timeS,
        points,
        image,
        hint,
        type: 'ordering',
        items: q.items,
        correct_order: q.correct_order,
      };
    default: {
      const _exhaustive: never = q;
      return _exhaustive;
    }
  }
}

function safeParseApiQuestion(
  raw: unknown,
): QuizEditorQuestionForm | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const t = typeof o.type === 'string' ? o.type : '';
  if (!CANONICAL_QUESTION_TYPES.has(t as KqfQuestionType)) {
    return undefined;
  }
  return mapApiQuestionToForm(o as AdminQuizApiQuestion);
}

export function toQuizEditorFormValues(
  quiz: AdminQuizApiDetails,
): QuizEditorFormValues {
  const mappedQuestions = quiz.questions
    .map((q) => safeParseApiQuestion(q))
    .filter((q): q is QuizEditorQuestionForm => Boolean(q));

  const values: QuizEditorFormValues = {
    title: quiz.title,
    description: quiz.description ?? null,
    author: quiz.author ?? null,
    tags: Array.isArray(quiz.tags) ? quiz.tags : [],
    showAnswerReview: quiz.show_answer_review !== false,
    quizTimeLimit: quiz.time_limit ?? null,
    shuffleQuestions: quiz.shuffle_questions ?? false,
    shuffleMode: quiz.shuffle_mode ?? 'per_player',
    questions:
      mappedQuestions.length > 0
        ? mappedQuestions
        : createDefaultQuizFormValues().questions,
  };

  return quizEditorFormSchema.parse(values);
}

function mapFormChoiceToPayload(c: QuizEditorChoiceForm): {
  text: string;
  is_correct: boolean;
  image?: string | null;
} {
  return {
    text: c.text.trim(),
    is_correct: c.isCorrect,
    image:
      normalizeKqfQuestionImageToDirectoryPath(c.image ?? undefined) ??
      undefined,
  };
}

function trimTags(tags: string[]): string[] {
  return tags.map((t) => t.trim()).filter(Boolean);
}

function mapQuestionToPayload(
  q: QuizEditorQuestionForm,
): AdminQuizUpsertQuestionPayload {
  const common = {
    id: q.id,
    text: q.text.trim(),
    time_s: q.timeS ?? undefined,
    points: q.points,
    image: normalizeKqfQuestionImageToDirectoryPath(q.image) ?? undefined,
    hint: q.hint?.trim() ? q.hint.trim() : undefined,
  };

  switch (q.type) {
    case 'singlechoice':
      return {
        ...common,
        type: 'singlechoice',
        choices: q.choices.map(mapFormChoiceToPayload),
      };
    case 'multichoice':
      return {
        ...common,
        type: 'multichoice',
        choices: q.choices.map(mapFormChoiceToPayload),
      };
    case 'truefalse':
      return {
        ...common,
        type: 'truefalse',
        correct: q.correct,
      };
    case 'slider':
      return {
        ...common,
        type: 'slider',
        correct: q.correct ?? undefined,
        min: q.min,
        max: q.max,
        step: q.step,
        tolerance: q.tolerance,
        unit: q.unit?.trim() ? q.unit.trim() : undefined,
        score: q.score ?? 'range',
        label_min: q.label_min?.trim() ? q.label_min.trim() : undefined,
        label_max: q.label_max?.trim() ? q.label_max.trim() : undefined,
      };
    case 'ordering':
      return {
        ...common,
        type: 'ordering',
        items: q.items,
        correct_order: q.correct_order,
      };
    default: {
      const _never: never = q;
      return _never;
    }
  }
}

export function toAdminQuizUpsertPayload(
  values: QuizEditorFormValues,
): AdminQuizUpsertPayload {
  const payload: AdminQuizUpsertPayload = {
    title: values.title.trim(),
    description: values.description?.trim() ? values.description.trim() : null,
    author: values.author?.trim() ? values.author.trim() : null,
    tags: trimTags(values.tags),
    show_answer_review: values.showAnswerReview,
    time_limit: values.quizTimeLimit ?? null,
    shuffle_questions: values.shuffleQuestions,
    shuffle_mode: values.shuffleMode,
    questions: values.questions.map(mapQuestionToPayload),
  };

  return adminQuizUpsertPayloadSchema.parse(payload);
}

export function mapApiQuizStatusToLabel(status: string): string {
  const normalized = status.trim().toLowerCase();

  if (normalized === 'running') {
    return 'Aktywny';
  }

  if (normalized === 'idle') {
    return 'Nieaktywny';
  }

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

export function switchQuestionTypePreservingCommon(
  current: QuizEditorQuestionForm,
  nextType: KqfQuestionType,
): QuizEditorQuestionForm {
  if (current.type === nextType) {
    return current;
  }

  return createQuestionForType(nextType, {
    id: current.id,
    text: current.text,
    hint: current.hint,
    timeS: current.timeS,
    points: current.points,
    image: normalizeKqfQuestionImageToDirectoryPath(current.image) ?? null,
  });
}
