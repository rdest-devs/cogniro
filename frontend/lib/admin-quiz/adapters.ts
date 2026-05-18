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

const legacyTypeMap: Record<string, KqfQuestionType> = {
  singlechoice: 'singlechoice',
  single_choice: 'singlechoice',
  single: 'singlechoice',
  jednokrotny: 'singlechoice',
  multichoice: 'multichoice',
  multiple_choice: 'multichoice',
  multiple: 'multichoice',
  wielokrotny: 'multichoice',
  truefalse: 'truefalse',
  true_false: 'truefalse',
  slider: 'slider',
};

export function normalizeQuestionType(raw?: string): KqfQuestionType {
  if (!raw) {
    return 'singlechoice';
  }
  const key = raw.trim().toLowerCase();
  return legacyTypeMap[key] ?? 'singlechoice';
}

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
  const points =
    typeof q.points === 'number' && Number.isFinite(q.points) && q.points >= 1
      ? Math.trunc(q.points)
      : 1;
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
        correct: q.correct,
        min: q.min,
        max: q.max,
        step: q.step ?? 1,
        tolerance: q.tolerance ?? 0,
        unit: q.unit ?? null,
      };
    default: {
      const _exhaustive: never = q;
      return _exhaustive;
    }
  }
}

/** Fallback when API returns an unknown / legacy shape (pre-KQF list in DB). */
function coerceApiQuestionLoose(
  raw: Record<string, unknown>,
): QuizEditorQuestionForm {
  const type = normalizeQuestionType(
    typeof raw.type === 'string' ? raw.type : undefined,
  );
  const id =
    raw.id !== undefined && raw.id !== null ? String(raw.id) : undefined;
  const text =
    typeof raw.text === 'string'
      ? raw.text
      : typeof raw.content === 'string'
        ? raw.content
        : '';
  const timeS =
    typeof raw.time_s === 'number' && Number.isFinite(raw.time_s)
      ? raw.time_s
      : null;
  const points =
    typeof raw.points === 'number' &&
    Number.isFinite(raw.points) &&
    raw.points >= 1
      ? Math.trunc(raw.points)
      : 1;
  const image = normalizeKqfQuestionImageToDirectoryPath(
    typeof raw.image === 'string' ? raw.image : undefined,
  );
  const hint =
    typeof raw.hint === 'string' && raw.hint.trim() ? raw.hint : null;

  if (type === 'truefalse' && typeof raw.correct === 'boolean') {
    return {
      id,
      text,
      timeS,
      points,
      image,
      hint,
      type: 'truefalse',
      correct: raw.correct,
    };
  }

  if (
    type === 'slider' &&
    typeof raw.correct === 'number' &&
    typeof raw.min === 'number' &&
    typeof raw.max === 'number'
  ) {
    return {
      id,
      text,
      timeS,
      points,
      image,
      hint,
      type: 'slider',
      correct: raw.correct,
      min: raw.min,
      max: raw.max,
      step: typeof raw.step === 'number' ? raw.step : 1,
      tolerance: typeof raw.tolerance === 'number' ? raw.tolerance : 0,
      unit: typeof raw.unit === 'string' ? raw.unit : null,
    };
  }

  const rawChoices = Array.isArray(raw.choices)
    ? raw.choices
    : Array.isArray(raw.answers)
      ? raw.answers
      : [];

  const choices: QuizEditorChoiceForm[] = rawChoices.map((item) => {
    if (!item || typeof item !== 'object') {
      return { text: '', isCorrect: false, image: null };
    }
    const o = item as Record<string, unknown>;
    const choiceText =
      typeof o.text === 'string'
        ? o.text
        : typeof o.content === 'string'
          ? o.content
          : '';
    const isCorrect = Boolean(o.is_correct ?? o.isCorrect);
    const image =
      typeof o.image === 'string' && o.image.trim()
        ? (normalizeKqfQuestionImageToDirectoryPath(o.image) ?? null)
        : null;
    return { text: choiceText, isCorrect, image };
  });

  const padded =
    choices.length >= 2
      ? choices
      : [
          ...choices,
          ...Array.from({ length: 2 - choices.length }, () => ({
            text: '',
            isCorrect: false,
            image: null,
          })),
        ];

  if (type === 'multichoice') {
    return {
      id,
      text,
      timeS,
      points,
      image,
      hint,
      type: 'multichoice',
      choices: padded,
    };
  }

  return {
    id,
    text,
    timeS,
    points,
    image,
    hint,
    type: 'singlechoice',
    choices: padded,
  };
}

function safeParseApiQuestion(
  raw: unknown,
): QuizEditorQuestionForm | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const t = typeof o.type === 'string' ? o.type : '';
  if (
    t === 'singlechoice' ||
    t === 'multichoice' ||
    t === 'truefalse' ||
    t === 'slider'
  ) {
    return mapApiQuestionToForm(o as AdminQuizApiQuestion);
  }
  return coerceApiQuestionLoose(o);
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
        correct: q.correct,
        min: q.min,
        max: q.max,
        step: q.step,
        tolerance: q.tolerance,
        unit: q.unit?.trim() ? q.unit.trim() : undefined,
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
