export type QuizStatus = 'Aktywny' | 'Nieaktywny' | 'Stare' | 'Zakończony';

export interface QuizCard {
  id: string;
  title: string;
  questionCount: number;
  lastActivatedAt?: string | null;
  createdAt: string;
  status: QuizStatus;
}

export interface QuizInfo {
  id: string;
  title: string;
  status: QuizStatus;
  date: string;
  questionCount: number;
  lastActivatedAt?: string | null;
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
