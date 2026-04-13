import type {
  QuizEditorAnswerForm,
  QuizEditorFormValues,
  QuizEditorQuestionForm,
} from '@/app/types';

export function createEmptyAnswer(): QuizEditorAnswerForm {
  return {
    text: '',
    isCorrect: false,
  };
}

export function createEmptyQuestion(): QuizEditorQuestionForm {
  return {
    text: '',
    type: 'single_choice',
    answers: [createEmptyAnswer(), createEmptyAnswer()],
  };
}

export function createDefaultQuizFormValues(): QuizEditorFormValues {
  return {
    title: '',
    timeLimit: null,
    shuffleQuestions: false,
    showAnswersAfter: true,
    showLeaderboardAfter: false,
    questions: [createEmptyQuestion()],
  };
}
