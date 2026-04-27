export type QuizStatus = 'Aktywny' | 'Stare' | 'Zakończony';

export interface QuizCard {
  id: string;
  title: string;
  questionsCount?: number;
  responsesCount: number;
  createdAt: string;
  status: QuizStatus;
}

export interface QuizInfo {
  id: string;
  title: string;
  status: QuizStatus;
  date: string;
  participants: number;
  avgScore?: number;
}

export interface ResultRow {
  name: string;
  score: number;
  time: string;
  date: string;
}

export interface QuestionAnswer {
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: number;
  text: string;
  type: string;
  answers: QuestionAnswer[];
  expanded?: boolean;
}
