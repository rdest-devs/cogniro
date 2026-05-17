/** Asset metadata returned by POST /admin/assets (matches backend QuizImage). */
export interface QuizImage {
  assetId: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  alt: string;
}

/** Player-facing choice (demo / review UI); not the admin editor payload shape. */
export interface QuizChoiceAnswer {
  text?: string;
  image?: QuizImage;
}

export const kqfQuestionTypeValues = [
  'singlechoice',
  'multichoice',
  'truefalse',
  'slider',
] as const;

export type KqfQuestionType = (typeof kqfQuestionTypeValues)[number];

export interface QuizEditorChoiceForm {
  text: string;
  isCorrect: boolean;
}

interface QuizEditorQuestionFormBase {
  id?: string;
  text: string;
  timeS?: number | null;
  /** Question point weight; missing or 0 in KQF / API is treated as 1. */
  points: number;
  /** KQF @image: URL or relative path from upload */
  image?: string | null;
  hint?: string | null;
}

export type QuizEditorQuestionForm =
  | (QuizEditorQuestionFormBase & {
      type: 'singlechoice';
      choices: QuizEditorChoiceForm[];
    })
  | (QuizEditorQuestionFormBase & {
      type: 'multichoice';
      choices: QuizEditorChoiceForm[];
    })
  | (QuizEditorQuestionFormBase & {
      type: 'truefalse';
      correct: boolean;
    })
  | (QuizEditorQuestionFormBase & {
      type: 'slider';
      correct: number;
      min: number;
      max: number;
      step: number;
      tolerance: number;
      unit?: string | null;
    });

export interface QuizEditorFormValues {
  title: string;
  description?: string | null;
  author?: string | null;
  tags: string[];
  /** After the quiz: whether the player may open the answer review screen. */
  showAnswerReview: boolean;
  questions: QuizEditorQuestionForm[];
}

/** API choice shape (read / write) — mirrors backend snake_case. */
export interface AdminQuizApiChoice {
  text: string;
  is_correct: boolean;
}

export type AdminQuizApiQuestion =
  | {
      id?: string;
      type: 'singlechoice';
      text: string;
      time_s?: number | null;
      points?: number | null;
      image?: string | null;
      hint?: string | null;
      choices: AdminQuizApiChoice[];
    }
  | {
      id?: string;
      type: 'multichoice';
      text: string;
      time_s?: number | null;
      points?: number | null;
      image?: string | null;
      hint?: string | null;
      choices: AdminQuizApiChoice[];
    }
  | {
      id?: string;
      type: 'truefalse';
      text: string;
      time_s?: number | null;
      points?: number | null;
      image?: string | null;
      hint?: string | null;
      correct: boolean;
    }
  | {
      id?: string;
      type: 'slider';
      text: string;
      time_s?: number | null;
      points?: number | null;
      image?: string | null;
      hint?: string | null;
      correct: number;
      min: number;
      max: number;
      step?: number;
      tolerance?: number;
      unit?: string | null;
    };

export interface AdminQuizApiDetails {
  id: string;
  title: string;
  description?: string | null;
  author?: string | null;
  tags?: string[];
  /** Defaults to true; stored in KQF front matter. */
  show_answer_review?: boolean;
  status?: 'idle' | 'running';
  created_at: string;
  updated_at?: string;
  last_activated_at?: string | null;
  questions: AdminQuizApiQuestion[];
}

export interface AdminQuizApiListItem {
  id: string;
  title: string;
  status: 'idle' | 'running';
  created_at: string;
  last_activated_at?: string | null;
  question_count: number;
}

export type AdminQuizUpsertQuestionPayload =
  | {
      id?: string;
      type: 'singlechoice';
      text: string;
      time_s?: number | null;
      points: number;
      image?: string | null;
      hint?: string | null;
      choices: Array<{ text: string; is_correct: boolean }>;
    }
  | {
      id?: string;
      type: 'multichoice';
      text: string;
      time_s?: number | null;
      points: number;
      image?: string | null;
      hint?: string | null;
      choices: Array<{ text: string; is_correct: boolean }>;
    }
  | {
      id?: string;
      type: 'truefalse';
      text: string;
      time_s?: number | null;
      points: number;
      image?: string | null;
      hint?: string | null;
      correct: boolean;
    }
  | {
      id?: string;
      type: 'slider';
      text: string;
      time_s?: number | null;
      points: number;
      image?: string | null;
      hint?: string | null;
      correct: number;
      min: number;
      max: number;
      step?: number;
      tolerance?: number;
      unit?: string | null;
    };

export interface AdminQuizUpsertPayload {
  title: string;
  description?: string | null;
  author?: string | null;
  tags: string[];
  show_answer_review?: boolean;
  questions: AdminQuizUpsertQuestionPayload[];
}

export interface AdminQuizSaveResponse {
  id?: string;
}

export type AdminAssetUploadResponse = QuizImage;
