import type { QuizImage } from './admin-editor';

export interface RankingEntry {
  position: number;
  name: string;
  score: string;
  isYou?: boolean;
  medal?: 'gold' | 'silver' | 'bronze';
}

export type ReviewAnswerState =
  | 'correct-selected'
  | 'wrong-selected'
  | 'correct'
  | 'neutral';

export interface ReviewAnswer {
  text: string;
  image?: QuizImage;
  state: ReviewAnswerState;
  yourAnswer?: boolean;
}

export interface ReviewQuestion {
  number: number;
  text: string;
  image?: QuizImage;
  isCorrect: boolean;
  answers: ReviewAnswer[];
}
