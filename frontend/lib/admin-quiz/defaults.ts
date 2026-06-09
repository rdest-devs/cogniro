import type {
  KqfQuestionType,
  QuizEditorChoiceForm,
  QuizEditorFormValues,
  QuizEditorQuestionForm,
} from '@/app/types';

export function createEmptyChoice(): QuizEditorChoiceForm {
  return {
    text: '',
    isCorrect: false,
    image: null,
  };
}

export function createQuestionForType(
  type: KqfQuestionType,
  options: {
    id?: string;
    text?: string;
    hint?: string | null;
    timeS?: number | null;
    points?: number;
    image?: string | null;
  } = {},
): QuizEditorQuestionForm {
  const base = {
    id: options.id,
    text: options.text ?? '',
    hint: options.hint ?? null,
    timeS: options.timeS ?? null,
    points:
      options.points !== undefined &&
      Number.isFinite(options.points) &&
      options.points >= 1
        ? Math.trunc(options.points)
        : 1,
    image: options.image ?? null,
  };

  switch (type) {
    case 'singlechoice':
      return {
        ...base,
        type: 'singlechoice',
        choices: [createEmptyChoice(), createEmptyChoice()],
      };
    case 'multichoice':
      return {
        ...base,
        type: 'multichoice',
        choices: [createEmptyChoice(), createEmptyChoice()],
      };
    case 'truefalse':
      return {
        ...base,
        type: 'truefalse',
        correct: true,
      };
    case 'slider':
      return {
        ...base,
        type: 'slider',
        correct: 5,
        min: 0,
        max: 10,
        step: 1,
        tolerance: 0,
        unit: null,
        score: 'range' as const,
        label_min: null,
        label_max: null,
      };
    case 'ordering':
      return {
        ...base,
        type: 'ordering',
        items: ['Element 1', 'Element 2', 'Element 3'],
        correct_order: [0, 1, 2],
      };
    case 'imagepixelate':
      return {
        ...base,
        // imagepixelate requires a per-question time (drives the reveal + scoring);
        // seed a sensible default so a new question is born valid.
        timeS: base.timeS ?? 20,
        type: 'imagepixelate',
        choices: [createEmptyChoice(), createEmptyChoice()],
      };
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function createEmptyQuestion(): QuizEditorQuestionForm {
  return createQuestionForType('singlechoice');
}

export function createDefaultQuizFormValues(): QuizEditorFormValues {
  return {
    title: '',
    description: null,
    author: null,
    tags: [],
    showAnswerReview: true,
    quizTimeLimit: null,
    shuffleQuestions: false,
    shuffleMode: 'per_player',
    questions: [createEmptyQuestion()],
  };
}
