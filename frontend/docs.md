# Admin Panel Frontend Documentation

## Scope

This document covers the admin panel flow and all data contracts used between frontend and backend.

Key entry points:

- [app/admin/page.tsx](app/admin/page.tsx)
- [lib/admin-quiz/client.ts](lib/admin-quiz/client.ts)
- [lib/admin-quiz/adapters.ts](lib/admin-quiz/adapters.ts)
- [lib/admin-quiz/schemas.ts](lib/admin-quiz/schemas.ts)
- [app/types/admin-editor.ts](app/types/admin-editor.ts)

## Admin Screen Flow

Main state machine in [app/admin/page.tsx](app/admin/page.tsx):

- `screen`: `panel | detail | editor`
- `editorMode`: `create | edit`
- `selectedQuizId`: `string | null`

Behavior:

- `panel`: shows quiz list (`AdminPanel`) from API (`getAllAdminQuizzes`) or fallback demo on fetch error.
- `detail`: shows quiz details (`QuizDetail`) and quiz-specific results.
- `editor`: shows quiz editor (`QuizEditor`) in create or edit mode.

Transitions:

- `handleCreateQuiz` -> `screen=editor`, `editorMode=create`
- `handleOpenQuizDetail` -> `screen=detail`, with selected id
- `handleEditQuiz` -> `screen=editor`, `editorMode=edit`, with selected id
- `handleQuizSaved` -> reloads list and returns to detail

## Backend API Client

Client implementation: [lib/admin-quiz/client.ts](lib/admin-quiz/client.ts)

Configuration:

- `API_BASE_URL`: `NEXT_PUBLIC_API_BASE_URL` or `/api`
- `ADMIN_TOKEN_STORAGE_KEY`: `cogniro_admin_token`

Auth/header behavior:

- Sends `Content-Type: application/json` for requests with a JSON body
- Sends `Authorization: Bearer <token>` if token exists in localStorage

Response unwrapping strategy:

- Accepts direct payload or nested payloads under one of:
  - `data`
  - `quiz`
  - `items`

Error model:

- Throws `AdminQuizApiError` on non-2xx responses
- Captures:
  - `message: string`
  - `status: number`
  - `errorCode?: string` (from backend `error`)
  - `reason?: string` (from backend `reason`)

## API Endpoints And Contracts

### 1) List quizzes

Function:

- `getAllAdminQuizzes(): Promise<AdminQuizApiListItem[]>`

Request:

- `GET /admin/quiz/all`

Response item type (`AdminQuizApiListItem`):

- `id: string`
- `title: string`
- `status: string`
- `created_at: string`
- `participants_count: number` (coerced by Zod if needed)

Validation schema:

- [lib/admin-quiz/schemas.ts](lib/admin-quiz/schemas.ts): `adminQuizApiListItemSchema`, `adminQuizApiListSchema`

### 2) Get single quiz details

Function:

- `getAdminQuiz(quizId: string): Promise<AdminQuizApiDetails>`

Request:

- `GET /admin/quiz/:quizId`

Response type (`AdminQuizApiDetails`):

- `id?: string`
- `title: string`
- `status?: string`
- `time_limit: number | null` (coerced by Zod)
- `shuffle_questions: boolean`
- `show_answers_after: boolean`
- `show_leaderboard_after: boolean`
- `questions: AdminQuizApiQuestion[]`

Nested question type (`AdminQuizApiQuestion`):

- `id?: string | number`
- `text?: string`
- `content?: string` (alternate field accepted)
- `type?: string`
- `answers: AdminQuizApiAnswer[]` (defaults to `[]`)

Nested answer type (`AdminQuizApiAnswer`):

- `id?: string | number`
- `text?: string`
- `content?: string` (alternate field accepted)
- `is_correct?: boolean`
- `isCorrect?: boolean` (alternate field accepted)

Validation schema:

- [lib/admin-quiz/schemas.ts](lib/admin-quiz/schemas.ts):
  - `adminQuizApiAnswerSchema`
  - `adminQuizApiQuestionSchema`
  - `adminQuizApiDetailsSchema`

### 3) Create quiz

Function:

- `createAdminQuiz(payload: AdminQuizUpsertPayload): Promise<AdminQuizSaveResponse>`

Request:

- `POST /admin/quiz`

Request payload type (`AdminQuizUpsertPayload`):

- `title: string`
- `time_limit: number | null`
- `shuffle_questions: boolean`
- `show_answers_after: boolean`
- `show_leaderboard_after: boolean`
- `questions: Array<{ id?: string; text: string; type: QuizQuestionType; answers: Array<{ id?: string; text: string; is_correct: boolean }> }>`

Response type (`AdminQuizSaveResponse`):

- `id?: string`

Validation schema:

- [lib/admin-quiz/schemas.ts](lib/admin-quiz/schemas.ts):
  - `adminQuizUpsertPayloadSchema`
  - `adminQuizSaveResponseSchema`

### 4) Update quiz

Function:

- `updateAdminQuiz(quizId: string, payload: AdminQuizUpsertPayload): Promise<AdminQuizSaveResponse>`

Request:

- `PUT /admin/quiz/:quizId`

Payload/response types:

- Same as create endpoint.

## Frontend Form Types (Editor Domain)

Defined in [app/types/admin-editor.ts](app/types/admin-editor.ts).

Core form type (`QuizEditorFormValues`):

- `title: string`
- `timeLimit: number | null`
- `shuffleQuestions: boolean`
- `showAnswersAfter: boolean`
- `showLeaderboardAfter: boolean`
- `questions: QuizEditorQuestionForm[]`

Question type (`QuizEditorQuestionForm`):

- `id?: string`
- `text: string`
- `type: QuizQuestionType` where `QuizQuestionType = 'single_choice' | 'multiple_choice'`
- `answers: QuizEditorAnswerForm[]`

Answer type (`QuizEditorAnswerForm`):

- `id?: string`
- `text: string`
- `isCorrect: boolean`

## Adapter Layer (API <-> Form)

Adapter implementation: [lib/admin-quiz/adapters.ts](lib/admin-quiz/adapters.ts)

### API -> form (`toQuizEditorFormValues`)

Normalization rules:

- Converts ids to string where present.
- Uses `text ?? content ?? ''` fallback for question/answer text.
- Normalizes question type via `normalizeQuestionType`.
- Pads answers to minimum length 2 via `padAnswersToMinTwo` so editor schema can validate and render migrated/incomplete drafts.
- If API returns zero questions, falls back to defaults from [lib/admin-quiz/defaults.ts](lib/admin-quiz/defaults.ts).
- Final output is validated with `quizEditorFormSchema.parse(values)`.

### Form -> API (`toAdminQuizUpsertPayload`)

Normalization rules:

- Trims `title`, `question.text`, and `answer.text`.
- Maps camelCase form fields to snake_case API payload fields.
- Maps `isCorrect` -> `is_correct`.
- Final output is validated with `adminQuizUpsertPayloadSchema.parse(payload)`.

### Status mapping helper

`mapApiQuizStatusToLabel(status: string)` maps backend status to UI labels:

- `active` -> `Aktywny`
- `completed` -> `Zakończony`
- `archived` or `inactive` -> `Stare`
- fallback: original status string

Used by [app/admin/page.tsx](app/admin/page.tsx) in `mapApiQuizToCard` and `mapApiQuizToInfo`.

## Validation Rules (Zod)

Defined in [lib/admin-quiz/schemas.ts](lib/admin-quiz/schemas.ts).

Editor validation (`quizEditorFormSchema`):

- `title`: required, trimmed
- `timeLimit`: positive integer or `null`
- at least 1 question
- each question has at least 2 answers
- `single_choice`: exactly 1 correct answer
- `multiple_choice`: at least 1 correct answer

API validation:

- list/details/save responses are validated before use
- details schema allows passthrough unknown fields, enabling forward-compatible backend changes
- numeric coercion is used for fields where backend may return string numbers

## UI Types For Admin Views

Defined in [app/types/admin.ts](app/types/admin.ts):

- `QuizCard` (panel cards)
- `QuizInfo` (detail list)
- `ResultRow` (result table rows)

Important note:

- These are presentation-layer types, not direct backend contracts.
- Mapping from backend types to UI view types is done in [app/admin/page.tsx](app/admin/page.tsx).

## Export Surface

Public barrel for admin-quiz module:

- [lib/admin-quiz/index.ts](lib/admin-quiz/index.ts)
- Re-exports `adapters`, `client`, `defaults`, `schemas`.

## Practical Integration Summary

End-to-end save flow:

1. User edits form (`QuizEditorFormValues`).
2. `toAdminQuizUpsertPayload` maps + validates payload.
3. `createAdminQuiz` or `updateAdminQuiz` sends JSON to backend.
4. Response validated as `AdminQuizSaveResponse`.
5. Admin page reloads quiz list and updates selected quiz.

End-to-end edit flow:

1. `getAdminQuiz(quizId)` fetches backend details.
2. Response validated as `AdminQuizApiDetails`.
3. `toQuizEditorFormValues` normalizes and pads draft data.
4. Form initialized with editor-safe validated data.
