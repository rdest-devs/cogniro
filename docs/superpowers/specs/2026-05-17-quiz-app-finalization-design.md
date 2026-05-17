# Quiz App Finalization — Design

**Date:** 2026-05-17
**Status:** Approved (pending writing-plans handoff)
**Scope:** Backend (FastAPI) + Frontend (Next.js static export). Polish UI.

---

## Context

Cogniro is a quiz application for the Faculty of Computer Science at AGH
University. The current codebase has:

- An admin panel ([app/admin/page.tsx](../../../frontend/app/admin/page.tsx))
  with CRUD over a single `quizzes.json` file, plus media asset uploads.
- A demo participant flow at `/quiz-demo/` backed by an in-code
  `MOCK_QUESTIONS` constant served from `POST /quiz/results`.
- Several 501 stub endpoints for `/quiz/{quiz_id}/join`,
  `/quiz/{quiz_id}/submit`, `/admin/quiz/{quiz_id}/leaderboard`,
  `/admin/quiz/{quiz_id}/nickname/{nickname}/block`, and `POST /admin/`.
- No KQF parser/serializer, no live quiz sessions, no result persistence, no
  background scheduler, no participant-facing routes, no QR generation, no
  per-quiz directory layout.

This spec finalizes the app by replacing the single-JSON storage with a
per-quiz directory layout keyed on the
[KQF format](../../quiz-format-docs.md), adds an in-memory live-session
mechanism with a short PIN, adds a participant `/play/?code=` route with
sessionStorage progress persistence, expands the admin editor + player to all
four KQF question types, and isolates the demo flows behind a `legacy/` prefix
for later removal.

---

## Decisions locked in (grep-friendly)

| Decision | Choice |
|---|---|
| Implementation approach | **Big-bang rewrite** (Approach A from the brainstorm). KQF is the on-disk source of truth. |
| Quiz ID | Stable UUID slug `quiz_<hex>`, used as the directory name forever, also embedded in result filenames. |
| Join code | 6-char PIN from Crockford-ish alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`). In-memory only. Regenerated each activation. Gone on server restart. |
| QR generation | Client-side in the admin UI via the `qrcode` npm package. Encodes the full join URL. |
| Score trust | Backend stores the frontend-calculated score as-is. No per-question audit. |
| Live moderation | Manual "Odśwież" only. **No polling. No SSE.** |
| Concurrent sessions per quiz | At most one. Admin must Stop before re-activating. |
| Participants who never `/submit` | Omitted from the persisted result file. |
| Blocked participants who already submitted | Also omitted from the persisted result file. |
| Migration | None. There is no production data today. |
| Polish UI | Hardcoded strings, `html lang="pl"`, no i18n infra. |
| New backend dep | `python-frontmatter` (KQF front-matter parsing). |
| New frontend dep | `qrcode` (client-side QR rendering in admin UI). |
| Question type spelling | KQF canonical: `singlechoice`, `multichoice`, `truefalse`, `slider`. The current `single_choice` / `multiple_choice` names go away. |

---

## Section 1 — On-disk layout and file formats

### Directory tree

All paths are under `backend/storage/`, which is gitignored.

```text
storage/
├── quizzes/
│   └── {quiz_id}/
│       ├── quiz.kqf        # canonical source of truth (KQF text)
│       ├── meta.json       # derived cache, rebuildable from quiz.kqf
│       └── media/
│           └── {filename}  # images/audio/video referenced by KQF
└── results/
    └── {YYYY-MM-DD}/
        └── {quiz_id}_{quiz_title_slug}_{HH-MM-SS}.json
```

- `quiz_id` is a UUID slug like `quiz_3f9a2c01ad6c4e0a87b2d5f4e1c0a9b3`.
- `quiz_title_slug` is ASCII-folded, lowercased, with non-alphanumerics
  replaced by `-`, collapsed and trimmed, capped at 60 characters. Polish
  diacritics (`ą`, `ż`, `ł`, …) fold to their ASCII equivalents so result
  filenames stay portable. Example: `Test rozproszony` → `test-rozproszony`.
- Filename collision rule: if two activations of the same quiz finish in the
  same second, the second one writes `..._{HH-MM-SS}-2.json`,
  `..._{HH-MM-SS}-3.json`, and so on. Vanishingly rare in classroom use; cheap
  to handle.

### `quiz.kqf` content

Standard KQF per [docs/quiz-format-docs.md](../../quiz-format-docs.md). Media
directives on disk use **relative** paths like `./media/foo.jpg`. The backend
rewrites those to absolute API URLs (`/media/{quiz_id}/foo.jpg`) when serving
the parsed quiz to the participant in
[`POST /play/{pin}/join`](#section-3--lifecycle-in-memory-state-and-http-api).
Keeping disk paths relative is what makes `.zip` export/import portable.

### `meta.json` (derived cache)

A small JSON file beside `quiz.kqf` that lets the admin listing endpoint avoid
parsing every KQF file on every request.

```json
{
  "id": "quiz_3f9a2c01ad6c4e0a87b2d5f4e1c0a9b3",
  "title": "Test rozproszony",
  "title_slug": "test-rozproszony",
  "created_at": "2026-05-17T18:00:00Z",
  "updated_at": "2026-05-17T18:14:00Z",
  "question_count": 12,
  "last_activated_at": null
}
```

- Rewritten atomically on every quiz save and on every quiz activation
  (`last_activated_at` only).
- `GET /admin/quiz/all` reads only `meta.json` per directory.
- If `meta.json` is missing or unreadable, the backend rebuilds it on the fly
  by parsing `quiz.kqf`. So it is a true cache — never authoritative.

### Result file shape

```json
{
  "quiz_id": "quiz_3f9a2c01ad6c4e0a87b2d5f4e1c0a9b3",
  "quiz_title": "Test rozproszony",
  "session_started_at": "2026-05-17T19:00:01Z",
  "session_stopped_at": "2026-05-17T19:23:44Z",
  "scores": [
    {
      "nickname": "Ala",
      "score": 4500,
      "submitted_at": "2026-05-17T19:18:02Z"
    }
  ]
}
```

- Self-contained: nothing inside `storage/results/` ever depends on the source
  quiz still existing under `storage/quizzes/`. `quiz_title` is denormalized
  into the file so the results browser does not need a back-reference.
- Only participants where `submitted_at is not None and not blocked` are
  written. Anyone who never submitted, or who was blocked at any point, is
  silently omitted (per
  [Decisions locked in](#decisions-locked-in-grep-friendly)).

### Atomic writes

All on-disk writes (`quiz.kqf`, `meta.json`, result files) reuse the existing
write-temp-then-`os.replace`-then-`fsync` pattern from
[backend/services/storage.py](../../../backend/services/storage.py)
(`write_quizzes_payload_atomic` and `_fsync_directory`). Media uploads stream
into a temporary file, then atomic rename into the final location. A
process-level `threading.RLock` serializes writes within a single uvicorn
worker (same constraint as today — documented as such, multi-worker requires
file locks or a real DB).

---

## Section 2 — Schemas (Pydantic + Zod) for all four KQF question types

### Backend: KQF parser/serializer + Pydantic models

One new module `backend/services/kqf.py` becomes the **only** code that reads
or writes `.kqf` text. Everything else works with Pydantic objects.

`backend/schemas/kqf.py`:

```python
class KqfFrontMatter(BaseModel):
    title: str
    description: str | None = None
    author: str | None = None
    version: str | None = None
    language: str | None = None
    tags: list[str] = Field(default_factory=list)

class KqfMedia(BaseModel):
    image: str | None = None    # './media/foo.jpg' on disk; rewritten on serve
    video: str | None = None
    audio: str | None = None
    hint: str | None = None

class KqfChoice(BaseModel):
    text: str
    is_correct: bool

class KqfSingleChoice(BaseModel):
    id: str
    type: Literal['singlechoice']
    time_s: int | None = None
    points: int | None = None
    text: str
    choices: list[KqfChoice]    # 2..6 items, exactly 1 is_correct
    media: KqfMedia = KqfMedia()

class KqfMultiChoice(BaseModel):
    id: str
    type: Literal['multichoice']
    time_s: int | None = None
    points: int | None = None
    text: str
    choices: list[KqfChoice]    # 2..8 items, >=1 is_correct
    media: KqfMedia = KqfMedia()

class KqfTrueFalse(BaseModel):
    id: str
    type: Literal['truefalse']
    time_s: int | None = None
    points: int | None = None
    text: str
    correct: bool               # the two answers True/False are implicit
    media: KqfMedia = KqfMedia()

class KqfSlider(BaseModel):
    id: str
    type: Literal['slider']
    time_s: int | None = None
    points: int | None = None
    text: str
    correct: float
    min: float
    max: float
    step: float = 1
    tolerance: float = 0
    unit: str | None = None
    media: KqfMedia = KqfMedia()

KqfQuestion = Annotated[
    KqfSingleChoice | KqfMultiChoice | KqfTrueFalse | KqfSlider,
    Field(discriminator='type'),
]

class KqfQuiz(BaseModel):
    front_matter: KqfFrontMatter
    questions: list[KqfQuestion]
```

`backend/services/kqf.py`:

```python
class KqfParseError(Exception):
    line: int
    detail: str

def parse_kqf(text: str) -> KqfQuiz: ...
def serialize_kqf(quiz: KqfQuiz) -> str: ...
def read_kqf_file(path: Path) -> KqfQuiz: ...
def write_kqf_file_atomic(path: Path, quiz: KqfQuiz) -> None: ...
```

Implementation: line-based per
[KQF spec §7](../../quiz-format-docs.md#7-parsing-rules), with
`python-frontmatter` for the YAML front-matter block. Strict mode: invalid
input raises `KqfParseError`, which the admin save endpoint turns into a 422
with the line number in the body.

Pydantic per-type rules (model_validators) mirror KQF §4:

- `singlechoice`: `2 <= len(choices) <= 6` and exactly one `is_correct=True`.
- `multichoice`: `2 <= len(choices) <= 8` and at least one `is_correct=True`.
- `truefalse`: no `choices` (boolean `correct` only).
- `slider`: `min < max`, `step > 0`, `tolerance >= 0`, `min <= correct <= max`.

### Adapter layer

`backend/services/admin_quiz.py` is rewritten to bridge editor-friendly JSON
DTOs (the admin API contract) and KQF objects:

```python
def kqf_to_admin_detail_response(quiz: KqfQuiz, quiz_id: str) -> AdminQuizDetailResponse: ...
def admin_upsert_payload_to_kqf(payload: AdminQuizUpsertPayload, *, prev: KqfQuiz | None = None) -> KqfQuiz: ...
```

Round-trip safety: editor JSON loaded from disk → edited in browser → POSTed
back → converted to KQF → serialized → diff-friendly text on disk. `id` slugs
(`Q1`, `Q2`, …) are preserved when present, otherwise generated as
`Q{index+1}`.

### Frontend: Zod schemas

`frontend/lib/kqf/schemas.ts` mirrors the Pydantic models with `z.object` and
`z.discriminatedUnion('type', […])`. The existing
[frontend/lib/admin-quiz/schemas.ts](../../../frontend/lib/admin-quiz/schemas.ts)
keeps its API-DTO shape but widens its type enum:

```typescript
export const questionTypeValues = [
  'singlechoice', 'multichoice', 'truefalse', 'slider'
] as const;
export type QuizQuestionType = (typeof questionTypeValues)[number];
```

### Editor form types

[frontend/app/types/admin-editor.ts](../../../frontend/app/types/admin-editor.ts)
gains a discriminated union over the four types:

```typescript
type QuizEditorQuestionForm =
  | { type: 'singlechoice'; id?: string; text: string; timeS?: number; points?: number; answers: { id?: string; text: string; isCorrect: boolean }[]; media?: KqfMedia }
  | { type: 'multichoice';  id?: string; text: string; timeS?: number; points?: number; answers: { id?: string; text: string; isCorrect: boolean }[]; media?: KqfMedia }
  | { type: 'truefalse';    id?: string; text: string; timeS?: number; points?: number; correct: boolean; media?: KqfMedia }
  | { type: 'slider';       id?: string; text: string; timeS?: number; points?: number; correct: number; min: number; max: number; step?: number; tolerance?: number; unit?: string; media?: KqfMedia };
```

### Type-name migration

The current code uses `single_choice` / `multiple_choice`. KQF uses
`singlechoice` / `multichoice`. This refactor standardizes everywhere on the
KQF spelling. The existing `normalizeQuestionType` adapter in
[frontend/lib/admin-quiz/adapters.ts](../../../frontend/lib/admin-quiz/adapters.ts)
is deleted along with its legacy aliases — there is no production data to
preserve.

---

## Section 3 — Lifecycle, in-memory state, and HTTP API

### Quiz states (admin's perspective)

A quiz has only two states from the admin: **idle** (no session) and
**running** (one session active). Nothing about "running" is persisted on
disk — except the `last_activated_at` audit timestamp in `meta.json`. The
in-memory session map IS the source of truth for "is this quiz currently
running."

Constraint: at most one running session per `quiz_id` at any time. Multiple
different quizzes can run concurrently.

### In-memory session state

A single module-level structure in `backend/services/sessions.py`:

```python
@dataclass
class Participant:
    nickname: str
    joined_at: datetime
    blocked: bool = False
    score: int | None = None
    submitted_at: datetime | None = None

@dataclass
class QuizSession:
    quiz_id: str
    quiz_title: str
    pin: str
    started_at: datetime
    participants: dict[str, Participant]    # keyed by case-folded nickname

SESSIONS_BY_QUIZ: dict[str, QuizSession] = {}
SESSIONS_BY_PIN: dict[str, QuizSession] = {}
SESSIONS_LOCK: threading.RLock = threading.RLock()
```

PIN generation: 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no
`I`/`O`/`0`/`1`); reject collisions with currently-active PINs and regenerate.
Vanishes on server restart.

All access goes through `with SESSIONS_LOCK:`. Single-process FastAPI is the
target deployment; multi-worker would require either pinning to one worker or
an out-of-process session store (deferred).

### HTTP API — admin endpoints

All require `Depends(require_admin)` (existing JWT in
[backend/security/admin_auth.py](../../../backend/security/admin_auth.py)).
New endpoints in **bold**.

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/quiz/all` | List quizzes (reads only `meta.json` per dir). |
| GET | `/admin/quiz/{quiz_id}` | Quiz detail (parses `quiz.kqf`, returns admin DTO). |
| POST | `/admin/quiz` | Create quiz: creates `storage/quizzes/{quiz_id}/`, writes `quiz.kqf` + `meta.json`. |
| PUT | `/admin/quiz/{quiz_id}` | Update quiz: rewrites `quiz.kqf` + `meta.json`; moves staged media in. |
| DELETE | `/admin/quiz/{quiz_id}` | Delete `storage/quizzes/{quiz_id}/` **only**. Never touches `storage/results/`. 409 if currently running. |
| **POST** | `/admin/quiz/{quiz_id}/activate` | Start a session. Returns `{ pin, join_url, started_at }`. Updates `meta.json.last_activated_at`. 409 if already running. |
| **POST** | `/admin/quiz/{quiz_id}/stop` | Stop the session. Flushes in-memory state to a result file (see Section 1). Drops the session from both indices. |
| **GET** | `/admin/quiz/{quiz_id}/session` | Returns the current in-memory snapshot: `pin`, `started_at`, list of participants (`nickname`, `blocked`, `has_submitted`, `score`). Used by the manual "Odśwież" button. 404 if not running. |
| **POST** | `/admin/quiz/{quiz_id}/session/block` | Body `{ nickname }`. Marks the participant `blocked=True`. Idempotent. 404 if session not running or nickname unknown. |
| POST | `/admin/assets` | Upload media to staging (kept as today; orphan cleanup runs synchronously after quiz save, existing pattern). |
| **GET** | `/admin/quiz/{quiz_id}/export` | Returns a `.zip` containing `quiz.kqf` + `media/`. `Content-Disposition: attachment; filename="{title_slug}.zip"`. |
| **POST** | `/admin/quiz/import` | Multipart upload. Validates the zip (single `quiz.kqf` + optional `media/`), parses it, generates a fresh `quiz_id`, writes the new quiz dir. Returns the new quiz's detail. |
| **GET** | `/admin/results` | Returns the list of date folders (newest first): `["2026-05-17", "2026-05-16", …]`. |
| **GET** | `/admin/results/{date}` | Returns metadata for files in that day: `[{ filename, quiz_id, quiz_title, session_started_at, session_stopped_at, score_count }, …]`. |
| **GET** | `/admin/results/{date}/{filename}` | Returns the full result file content. |
| **DELETE** | `/admin/results/{date}/{filename}` | Removes one result file. |
| **DELETE** | `/admin/results/{date}` | Removes the whole date folder. |

The two existing 501 stubs `/admin/quiz/{quiz_id}/leaderboard` and
`/admin/quiz/{quiz_id}/nickname/{nickname}/block` are **deleted** —
`/admin/quiz/{quiz_id}/session` and
`/admin/quiz/{quiz_id}/session/block` replace them. `POST /admin/`
(unimplemented stub) is also deleted.

### HTTP API — participant endpoints (no JWT, PIN-gated)

| Method | Path | Purpose |
|---|---|---|
| **POST** | `/play/{pin}/join` | Body `{ nickname }`. Validates nickname rules (stub returns true). Adds the participant. Returns the full KQF parsed to JSON, with media paths rewritten to absolute `/media/{quiz_id}/{filename}` URLs. 404 if PIN unknown. 409 if nickname already taken in this session. |
| **POST** | `/play/{pin}/submit` | Body `{ nickname, score }`. Validates and records (see rules below). |

The existing `POST /validate-nick` endpoint is **deleted** — its logic merges
into `/play/{pin}/join`. The existing 501 stubs `/quiz/{quiz_id}/join` and
`/quiz/{quiz_id}/submit` are **deleted** — `/play/{pin}/*` replaces them with
the correct PIN-keyed semantics.

The existing `POST /quiz/results` (the MOCK_QUESTIONS path) moves into the
legacy isolation (Section 5).

### HTTP API — media

| Method | Path | Purpose |
|---|---|---|
| GET | `/media/{quiz_id}/{filename:path}` | Streams `storage/quizzes/{quiz_id}/media/{filename}`. **Returns 403 if `quiz_id` is not in `SESSIONS_BY_QUIZ`** (i.e., not currently running). 404 if file missing or path traversal attempted. |
| GET | `/media/quiz-assets/{asset_path:path}` | Existing route, kept for the **editor** staging area. No active-session gate; staging is admin-context only. |

Two distinct media routes intentionally:

- `/media/quiz-assets/...` — editor-side staging assets, served while
  authoring (admin auth on the upload side; serving is open for `<img>` use).
- `/media/{quiz_id}/...` — runtime quiz assets, gated by active session.

### Score submission validation rules

Backend trusts the frontend-computed score. Server logic per `/submit`:

1. Look up `SESSIONS_BY_PIN[pin]`; if missing → `404 pin_not_active`.
2. Look up `session.participants[nickname_casefolded]`; if missing →
   `400 nickname_violation`.
3. If `participant.blocked` → `400 nickname_violation`.
4. If `participant.submitted_at is not None` → `409 already_submitted`.
5. Otherwise store `score` + `submitted_at = now`; return
   `{ "accepted": true }`.

The `nickname_violation` payload:

```json
{
  "error": "nickname_violation",
  "detail_pl": "Twój pseudonim narusza zasady i wynik nie zostanie zapisany."
}
```

### Flush-to-disk semantics (admin Stop)

Single atomic write of the result file:

1. Snapshot `session.participants` under `SESSIONS_LOCK`.
2. Filter to `submitted_at is not None and not blocked`.
3. Build the result-file payload (Section 1).
4. Ensure `storage/results/{YYYY-MM-DD}/` exists.
5. Atomic write to
   `{quiz_id}_{quiz_title_slug}_{HH-MM-SS}.json` (collision-suffix if needed).
6. Remove the session from both index dicts.

After flush, `GET /admin/quiz/{quiz_id}/session` returns 404 and media URLs
for that `quiz_id` start returning 403.

### Two-POST participant flow

The full participant lifecycle from the server's perspective is exactly two
POSTs (no polling, no SSE, no other server traffic during the quiz):

```text
participant scans QR → frontend opens /play/?code=ABC742
participant enters nickname →  POST /play/ABC742/join     (returns full KQF)
… plays the quiz entirely client-side, progress in sessionStorage …
participant finishes →         POST /play/ABC742/submit    (sends {nickname, score})
```

Media GETs happen during play (gated by active session). Otherwise, zero
server roundtrips between the two POSTs.

### 30-day purge background task

A single `asyncio.Task` started from the FastAPI lifespan in
[backend/main.py](../../../backend/main.py):

```python
async def _purge_old_results_loop():
    while True:
        try:
            purge_results_older_than(timedelta(days=RESULT_RETENTION_DAYS))
        except Exception:
            logger.exception("purge loop iteration failed")
        await asyncio.sleep(PURGE_INTERVAL_SECONDS)
```

- Pure stdlib, no APScheduler dependency.
- New env vars (in `backend/core/settings.py` + `.env.example`):
  `RESULT_RETENTION_DAYS` (default `30`), `PURGE_INTERVAL_SECONDS` (default
  `3600`).
- On startup, one immediate pass runs before the sleep, so stale data is
  cleaned promptly after a long downtime.
- Implementation in `backend/services/results.py::purge_results_older_than`:
  iterate `storage/results/`, parse each subdirectory name as `YYYY-MM-DD`,
  `shutil.rmtree` those older than `today() - retention`. Non-matching
  subdirectory names are skipped defensively.

### Quiz delete cascade (decoupled)

`DELETE /admin/quiz/{quiz_id}` performs exactly one filesystem operation:
`shutil.rmtree(storage/quizzes/{quiz_id})`. It never lists, reads, or writes
`storage/results/`. Result files keyed by the deleted `quiz_id` continue to
exist and stay listable through `/admin/results/*` exactly as before
(filename already carries `quiz_title`, no lookup against the deleted quiz is
needed).

---

## Section 4 — Frontend architecture

### Routing overview

Three top-level routes after this work (in `frontend/app/`):

| URL | File | Notes |
|---|---|---|
| `/admin/` (+ query params) | [app/admin/page.tsx](../../../frontend/app/admin/page.tsx) (existing) | SPA driven by `?quiz=`, `?new=1`, `?edit=1`, plus new `?view=running` and `?view=results&date=...&file=...`. |
| `/play/?code=ABC123` | **new** `app/play/page.tsx` | Single static page; reads `code` from query string, runs the participant flow. |
| `/` | [app/page.tsx](../../../frontend/app/page.tsx) (existing) | Keeps redirecting to `/admin`. |

`/play` uses a query parameter (not a dynamic segment) to stay friction-free
with `output: 'export'` and `trailingSlash: true`. The QR encodes
`https://<frontend-origin>/play/?code=ABC123`.

### `/play` — participant flow

Single page, `'use client'`. State machine:

```text
EnterCode → EnterNickname → Playing → FinishedSubmitting → Result
                                    ↘ NicknameViolation (terminal)
```

- **EnterCode** — only shown if no `?code` in URL. Manual fallback for "I have
  a code but no QR scanner."
- **EnterNickname** — reuses
  [app/components/quiz/shared/QuizStart.tsx](../../../frontend/app/components/quiz/shared/QuizStart.tsx).
  On submit: `POST /play/{code}/join`. On 200, store quiz JSON + start time in
  sessionStorage and advance. On 404, show "Quiz nie jest aktywny."
- **Playing** — reuses existing question widgets, widened for truefalse and
  slider (see "Editor + player extensions" below). Per-question answer state
  cached to sessionStorage on every change so refresh is lossless.
- **FinishedSubmitting** — client computes the final score (deterministic
  from cached quiz + answers), POSTs `/play/{code}/submit` with
  `{ nickname, score }`. Cached state cleared only on successful response
  (so transient errors can retry).
- **Result** — reuses
  [QuizResults](../../../frontend/app/components/quiz/results/QuizResults.tsx)
  and
  [AttemptReview](../../../frontend/app/components/quiz/results/AttemptReview.tsx).
  Review visibility honors the KQF quiz's `show_answers_after` setting.
- **NicknameViolation** — distinct UI showing the Polish message returned by
  the backend. Cached state cleared. No retry.

### Frontend persistence

- **`sessionStorage`** (not localStorage), keyed
  `cogniro:play:{code}:{nickname}:state`.
- Stored shape:
  `{ quiz: KqfQuiz, currentQuestionIndex: number, answers: Record<string, AnswerValue>, startedAt: ISOString, submitted: boolean }`.
- Cleared on: successful submit, nickname violation, or "Zacznij od nowa"
  button on the Result screen.
- Rehydration on mount: if `?code=` matches a cached session, restore to
  `Playing` at the saved index. The cache is namespaced by `code`, which is
  itself ephemeral (dies with the session on the server), so stale state
  naturally gets ignored once the admin restarts.

Choice rationale: sessionStorage is per-tab, so closing the tab or finishing
the quiz clears state. localStorage would risk leaking old quiz state across
unrelated sessions on shared devices.

### `/admin` — new views

Two new SPA sub-views inside the existing `/admin` page, driven by query
parameters (consistent with the current `?quiz=`, `?new=1`, `?edit=1`
pattern):

| Query | View | Purpose |
|---|---|---|
| `?quiz={id}&view=running` | `RunningQuizView` (new) | The live moderation screen for an active quiz. |
| `?view=results` | `ResultsBrowserView` (new) | Top-level history dashboard: list of date folders. |
| `?view=results&date=YYYY-MM-DD` | `ResultsDayView` (new) | Files in that day. |
| `?view=results&date=...&file=...` | `ResultDetailView` (new) | Single result's full scoreboard. |

The existing transitions in
[AdminDashboard.tsx](../../../frontend/app/admin/AdminDashboard.tsx)'s
`adminView` memo just get more branches.

### `RunningQuizView` — admin live moderation

Layout (Polish):

```text
[QR code, 280px]     PIN: A B C 7 4 2
                     https://app.example.com/play/?code=ABC742
                     Aktywny od: 19:00

[ Odśwież ]   [ Zakończ quiz ]

Uczestnicy (12)
┌─────────────┬──────────┬─────────┬──────────┐
│ Pseudonim   │ Stan     │ Wynik   │ Akcje    │
├─────────────┼──────────┼─────────┼──────────┤
│ Ala         │ Wysłano  │ 4500    │ —        │
│ Bartek      │ W trakcie│ —       │ [Blokuj] │
│ DupaJasia   │ Zablok.  │ —       │ —        │
└─────────────┴──────────┴─────────┴──────────┘
```

- QR rendered client-side via the `qrcode` npm package (we'll add it). Pure
  browser, works with static export. Lazy-imported in `RunningQuizView` so it
  doesn't bloat the rest of the admin bundle.
- "Odśwież" → `GET /admin/quiz/{id}/session` and replaces the participant
  list.
- "Blokuj" → `POST /admin/quiz/{id}/session/block` with `{ nickname }`. On
  success, optimistically marks the row as `Zablok.`.
- "Zakończ quiz" → `POST /admin/quiz/{id}/stop`. On success, navigates to the
  freshly-written result file: `?view=results&date=...&file=...`.

### `ResultsBrowserView` / `ResultsDayView` / `ResultDetailView`

- Browser: simple list of date strings with per-day delete buttons (confirm
  dialog).
- Day view: table of files showing `quiz_title`, `session_started_at`,
  `session_stopped_at`, count of scores, with per-file delete buttons.
- Detail view: top-ranked scoreboard with positions; "Pobierz JSON" button to
  download the raw file.

### Activation flow on `QuizDetail`

The existing
[QuizDetail.tsx](../../../frontend/app/components/admin/dashboard/QuizDetail.tsx)
gains a primary button **"Uruchom quiz"** that calls
`POST /admin/quiz/{id}/activate`. On success it navigates to
`?quiz={id}&view=running`. The existing disabled "Wyniki" / "Usuń" buttons
are wired up:

- **Wyniki** → `?view=results` (filtered to this quiz_id client-side; search
  files whose name starts with `{quiz_id}_`).
- **Usuń** → confirm dialog + `DELETE /admin/quiz/{id}`. Rejected with a
  toast if the quiz is running.

### Editor + player extensions for truefalse + slider

Affected files:

- [frontend/app/types/admin-editor.ts](../../../frontend/app/types/admin-editor.ts)
  — widen `questionTypeValues` and split `QuizEditorQuestionForm` into a
  discriminated union of four branches.
- [frontend/lib/admin-quiz/schemas.ts](../../../frontend/lib/admin-quiz/schemas.ts)
  — `quizEditorQuestionSchema` becomes a
  `z.discriminatedUnion('type', [...])` with per-type validation.
- [frontend/app/components/admin/editor/QuestionListItem.tsx](../../../frontend/app/components/admin/editor/QuestionListItem.tsx)
  — type dropdown gains "Prawda/Fałsz" and "Suwak"; the answers area renders
  differently per branch:
  - **truefalse**: a single radio pair (Prawda / Fałsz), no list editor.
  - **slider**: form fields `correct`, `min`, `max`, `step`, `tolerance`,
    `unit` with numeric validation.
- `frontend/app/components/quiz/questions/` — the existing
  [SliderQuestion.tsx](../../../frontend/app/components/quiz/questions/SliderQuestion.tsx)
  is wired into the real player (today it only lives in the demo path). A new
  `TrueFalseQuestion.tsx` component is added. The player dispatch in
  `/play` (and the new `RunningQuizView`-spawned flows) becomes a small
  switch on `type`.

### QR generation dependency

- New dep: **`qrcode`** (npm). Rendered as inline `<svg>` inside
  `RunningQuizView`. ~10 kB gzip impact on the admin bundle only via lazy
  import.

### Polish strings

Hardcoded Polish as today (`html lang="pl"` in
[app/layout.tsx](../../../frontend/app/layout.tsx)). No i18n infra. New
strings live next to the components that use them; we follow the existing
pattern.

### Documentation deliverables

As part of this implementation work (not part of this spec file), two docs
get refreshed:

- **`docs/api-and-frontend-contract.md`** (renamed from the former admin-panel doc) —
  covers admin API (CRUD + activate/stop/session/block + assets +
  import/export + results browser), participant API
  (`/play/{pin}/join` + `/submit`), media route, schemas (KQF Pydantic + Zod),
  and end-to-end flows. See [docs/api-and-frontend-contract.md](../../api-and-frontend-contract.md).
- **`docs/storage-and-lifecycle.md`** (new) — covers on-disk layout, in-memory
  session model, activation/stop, 30-day purge, decoupled deletion, legacy
  isolation.
- [docs/quiz-format-docs.md](../../quiz-format-docs.md) stays as the KQF
  reference (single source of truth for the format).

---

## Section 5 — Legacy isolation, decoupled deletion, cleanup

### Legacy isolation (single file per surface, clearly labelled)

**Backend** — surfaces to isolate or delete:

| Today | Becomes |
|---|---|
| [backend/routes/user.py](../../../backend/routes/user.py) (`POST /quiz/results` using `MOCK_QUESTIONS`) | `backend/legacy/quiz_demo_router.py` mounted at `/legacy/quiz-demo/results`. Tagged `legacy` in OpenAPI. Module header: `# DEPRECATED — remove after the new /play flow is verified end-to-end.` |
| [backend/services/quiz_results.py](../../../backend/services/quiz_results.py) (the `MOCK_QUESTIONS` constant + scoring logic) | `backend/legacy/quiz_demo_service.py`. Same module header. |
| [backend/routes/stubs.py](../../../backend/routes/stubs.py), the 501 stubs `/quiz/{quiz_id}/join`, `/quiz/{quiz_id}/submit`, `/admin/quiz/{quiz_id}/leaderboard`, `/admin/quiz/{quiz_id}/nickname/{nickname}/block`, `POST /admin/`, `POST /validate-nick` | **Deleted.** Their semantics are now provided by `/play/{pin}/join`, `/play/{pin}/submit`, `/admin/quiz/{id}/session`, `/admin/quiz/{id}/session/block`. |

Router registration in [backend/main.py](../../../backend/main.py) after the
refactor:

```python
app.include_router(admin_quiz_router, prefix="/admin")
app.include_router(admin_auth_router,  prefix="/admin")
app.include_router(media_router)
app.include_router(play_router)              # /play/{pin}/...
app.include_router(legacy_quiz_demo_router)  # /legacy/quiz-demo/... (deprecated)
```

`backend/legacy/` gets its own `__init__.py` and a short `README.md` saying
"Anything here is slated for removal once `/play` is in production."

**Frontend** — same pattern, mirror directory:

| Today | Becomes |
|---|---|
| [frontend/app/demo/page.tsx](../../../frontend/app/demo/page.tsx) (component gallery) | Kept at `/demo/` for now (visual showcase only). File header comment marks it deprecated. |
| [frontend/app/quiz-demo/page.tsx](../../../frontend/app/quiz-demo/page.tsx) (full mock flow) | Moves under `frontend/app/legacy/quiz-demo/page.tsx` (URL `/legacy/quiz-demo/`). Its single backend call changes from `quiz/results` to `legacy/quiz-demo/results`. File header marks it deprecated. |
| [frontend/app/data/demo.ts](../../../frontend/app/data/demo.ts) | Moves to `frontend/app/legacy/data/demo.ts`. |
| Any link to `/quiz-demo/` from the existing `/demo/` nav | Updated to `/legacy/quiz-demo/`. |

Result: a single directory `frontend/app/legacy/` (mirror of
`backend/legacy/`) holds everything earmarked for deletion. A future PR can
`rm -rf` both.

### Decoupled deletion semantics (recap)

The cascade rule, stated once for the spec:

```text
DELETE /admin/quiz/{quiz_id}
  ├── shutil.rmtree(storage/quizzes/{quiz_id})       ← ONLY operation
  ├── never reads, lists, or writes storage/results/
  └── refused with 409 if SESSIONS_BY_QUIZ[quiz_id] exists
```

Result files keyed by a now-deleted `quiz_id` keep working in
`/admin/results/*` because each file is self-contained (`quiz_title` is in
the JSON; the filename carries `quiz_id` + slug; nothing in the results
browser ever calls `/admin/quiz/{quiz_id}` to resolve metadata).

### No migration

There is no production data today (confirmed empty `storage/`,
no `quizzes.json` on disk). The old single-file storage layer is **removed
outright**:

- `read_quizzes_payload`, `write_quizzes_payload_atomic`,
  `default_quizzes_payload` in
  [backend/services/storage.py](../../../backend/services/storage.py) are
  deleted.
- `StoragePaths` is simplified: drop `quizzes_file`; `initialize_storage()`
  only ensures `storage/quizzes/` and `storage/results/` exist.
- `QUIZZES_FILENAME` in `backend/core/settings.py` is deleted.
- `backend/tests/test_storage_service.py` is rewritten to cover the new
  per-quiz directory storage.

### Cleanup checklist (files removed by this refactor)

- `backend/routes/nick.py` (logic absorbed by `/play/{pin}/join`).
- `backend/routes/stubs.py` (all 501 routes superseded).
- `backend/schemas/nick.py`.
- `backend/services/quiz_results.py` (whole module moves to
  `backend/legacy/quiz_demo_service.py`).
- `frontend/app/quiz-demo/` (moves under `legacy/`).
- `frontend/app/data/` (moves under `legacy/`).
- `frontend/lib/admin-quiz/adapters.ts::normalizeQuestionType` and any other
  legacy-spelling shim (replaced with direct KQF spellings).

### `.gitignore` additions

```text
backend/storage/
backend/data/                          # legacy /var/lib fallback path
```

### Dependency additions

| Package | Where | Why |
|---|---|---|
| `python-frontmatter` | [backend/pyproject.toml](../../../backend/pyproject.toml) | Parse the KQF `---` YAML block reliably. |
| `qrcode` (npm) | [frontend/package.json](../../../frontend/package.json) | Client-side QR rendering in `RunningQuizView`. |

No other new deps. Stdlib `asyncio.Task` covers the purge loop (no APScheduler).

---

## Out of scope (explicitly deferred)

- Multi-worker FastAPI deployment: in-memory sessions and the `threading.Lock`
  assume one worker. Documented; deferred.
- WebSocket / SSE participant pushes (e.g., live "show next question" from
  admin): not needed for the spec'd UX. Participant flow is entirely
  client-side between the two POSTs.
- Real nickname validation rules (the stub always returns true). The hook
  point is `/play/{pin}/join`; the rules themselves are out of scope.
- Per-quiz scheduled activation, persistent scoreboards across server
  restarts, participant accounts/identity — all out of scope.

---

## Acceptance criteria for the implementation phase

A future implementation plan will be considered done when:

1. `storage/` layout matches Section 1; no `quizzes.json` anywhere in the
   tree.
2. KQF Pydantic + Zod schemas pass round-trip tests for all four question
   types (parse → serialize → parse equals identity).
3. All admin and participant endpoints in Section 3 exist, are typed, and
   have tests covering happy path + the documented error codes
   (`nickname_violation`, `already_submitted`, `pin_not_active`, 409 on
   re-activation, 409 on delete-while-running).
4. Admin editor authors and saves all four question types end-to-end (create,
   read, edit, save round-trips through KQF on disk).
5. Participant `/play/?code=` flow completes end-to-end with sessionStorage
   surviving a mid-quiz refresh.
6. Quiz delete leaves `storage/results/` untouched (covered by an integration
   test).
7. 30-day purge removes a synthetically backdated date folder (covered by a
   unit test using a small `RESULT_RETENTION_DAYS` override).
8. Media URLs return 403 once the admin Stops the corresponding quiz
   (integration test).
9. `backend/legacy/` and `frontend/app/legacy/` contain exactly the migrated
   demo flow and nothing else; `/legacy/quiz-demo/` works end-to-end against
   `/legacy/quiz-demo/results`.
10. `docs/api-and-frontend-contract.md` and `docs/storage-and-lifecycle.md`
    exist and cover the new surface.
