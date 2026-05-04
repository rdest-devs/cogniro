import type { z } from 'zod';

import type { quizImageSchema } from '@/lib/admin-quiz/schemas';

export const questionTypeValues = ['single_choice', 'multiple_choice'] as const;

export type QuizQuestionType = (typeof questionTypeValues)[number];

export type QuizImage = z.infer<typeof quizImageSchema>;

export interface QuizChoiceAnswer {
  text?: string;
  image?: QuizImage;
}

export interface QuizEditorAnswerForm {
  id?: string;
  text: string;
  isCorrect: boolean;
  image?: QuizImage;
}

export interface QuizEditorQuestionForm {
  id?: string;
  text: string;
  type: QuizQuestionType;
  image?: QuizImage;
  answers: QuizEditorAnswerForm[];
}

export interface QuizEditorFormValues {
  title: string;
  timeLimit: number | null;
  shuffleQuestions: boolean;
  showAnswersAfter: boolean;
  showLeaderboardAfter: boolean;
  questions: QuizEditorQuestionForm[];
}

export interface AdminQuizApiAnswer {
  id?: string | number;
  text?: string;
  content?: string;
  is_correct?: boolean;
  isCorrect?: boolean;
  image?: QuizImage;
}

export interface AdminQuizApiQuestion {
  id?: string | number;
  text?: string;
  content?: string;
  type?: string;
  image?: QuizImage;
  answers: AdminQuizApiAnswer[];
}

export interface AdminQuizApiDetails {
  id?: string;
  title: string;
  status?: string;
  time_limit: number | null;
  shuffle_questions: boolean;
  show_answers_after: boolean;
  show_leaderboard_after: boolean;
  questions: AdminQuizApiQuestion[];
}

export interface AdminQuizApiListItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  participants_count: number;
}

export interface AdminQuizUpsertPayload {
  title: string;
  time_limit: number | null;
  shuffle_questions: boolean;
  show_answers_after: boolean;
  show_leaderboard_after: boolean;
  questions: Array<{
    id?: string;
    text: string;
    image?: QuizImage;
    type: QuizQuestionType;
    answers: Array<{
      id?: string;
      text: string;
      is_correct: boolean;
      image?: QuizImage;
    }>;
  }>;
}

export interface AdminQuizSaveResponse {
  id?: string;
}

export type AdminAssetUploadResponse = QuizImage;
