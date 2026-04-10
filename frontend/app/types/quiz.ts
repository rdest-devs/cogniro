export interface ImageAnswerOption {
  imageUrl: string;
  label: string;
}

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
  state: ReviewAnswerState;
  yourAnswer?: boolean;
}

export interface ReviewQuestion {
  number: number;
  text: string;
  isCorrect: boolean;
  answers: ReviewAnswer[];
}
