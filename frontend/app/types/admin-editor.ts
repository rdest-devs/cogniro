export const questionTypeValues = ['single_choice', 'multiple_choice'] as const;

export type QuizQuestionType = (typeof questionTypeValues)[number];

export interface QuizEditorAnswerForm {
  id?: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizEditorQuestionForm {
  id?: string;
  text: string;
  type: QuizQuestionType;
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
}

export interface AdminQuizApiQuestion {
  id?: string | number;
  text?: string;
  content?: string;
  type?: string;
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
    type: QuizQuestionType;
    answers: Array<{
      id?: string;
      text: string;
      is_correct: boolean;
    }>;
  }>;
}

export interface AdminQuizSaveResponse {
  id?: string;
}
