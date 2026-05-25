# API and frontend contract

Single reference for HTTP endpoints, media URLs, shared schemas, and how the Next.js app expects to call them. Polish copy stays hardcoded in UI (`html lang="pl"` on layouts).

## Shared configuration

- **Backend base URL** — [frontend/lib/backend-url.ts](../frontend/lib/backend-url.ts): `NEXT_PUBLIC_BACKEND_URL` or `http://localhost:8000`. Paths are joined with `joinApiUrl(base, path)` (leading slashes normalized).
- **CORS** — backend `CORS_ORIGINS` (comma-separated); dev defaults include `http://localhost:3000` and `http://127.0.0.1:3000`.
- **Editor media public path** — `NEXT_PUBLIC_MEDIA_PUBLIC_PREFIX` + [frontend/lib/media-url.ts](../frontend/lib/media-url.ts) for resolving staged asset URLs from `POST /admin/assets`.
- **Obrazy zapisane w quizie (`./media/…` w KQF)** — w edytorze adres `GET /admin/quiz/{quiz_id}/media/…` (Bearer); klient ładuje obraz przez `fetch` + blob, najpierw `thumb.webp`, potem `image.webp` ([frontend/lib/media-url.ts](../frontend/lib/media-url.ts), `resolveEditorQuestionPlayImageUrls`, `AdminProgressiveBearerImage`). Publicznie podczas gry: `GET /media/{quiz_id}/…` tylko gdy **sesja tego quizu jest aktywna** (`403 quiz_not_active` w przeciwnym razie).

## Admin authentication

| Method | Path | Notes |
|--------|------|------|
| POST | `/admin/auth/login` | JSON `{ "password": string }` → `{ access_token, expires_in }`; sets HttpOnly refresh cookie. |
| POST | `/admin/auth/refresh` | Cookie-based; returns new `access_token`. |
| POST | `/admin/auth/logout` | Revokes refresh session. |

Client: [frontend/lib/admin-auth/client.ts](../frontend/lib/admin-auth/client.ts). Access token is kept **in memory only** (not `localStorage`). Mutating requests send `Authorization: Bearer <access_token>` when set.

## Admin quiz CRUD and sessions

All routes below require admin auth unless noted. Router prefix: **`/admin`**.

| Method | Path | Response / notes |
|--------|------|------------------|
| GET | `/admin/quiz/all` | List items: `id`, `title`, `status`, `created_at`, `last_activated_at`, `question_count`. |
| POST | `/admin/quiz` | Create from editor payload → `{ id }`. |
| GET | `/admin/quiz/{quiz_id}` | Full quiz DTO for editor (KQF-backed). |
| PUT | `/admin/quiz/{quiz_id}` | Update → `{ id }`. |
| DELETE | `/admin/quiz/{quiz_id}` | `204`; `409` if session running. |
| POST | `/admin/quiz/{quiz_id}/activate` | `{ pin, join_url, started_at }`. Ustawia `meta.json.last_activated_at` przy **pierwszym** uruchomieniu. Powtórny POST przy już aktywnej sesji zwraca **200** z tym samym `pin` / `join_url` (idempotentnie). |
| POST | `/admin/quiz/{quiz_id}/stop` | `{ date, filename }` for written result file (JSON zawiera m.in. `max_score` — suma `points` z KQF). |
| GET | `/admin/quiz/{quiz_id}/session` | Snapshot: `pin`, `started_at`, **`max_score`** (suma punktów z KQF), `participants[]` (`nickname`, `joined_at`, `blocked`, `has_submitted`, `score`). |
| POST | `/admin/quiz/{quiz_id}/session/block` | JSON `{ nickname }` → `{ blocked: true }`. |
| GET | `/admin/quiz/{quiz_id}/media/{filename:path}` | Plik z `storage/quizzes/{quiz_id}/media/` dla podglądu w edytorze (bez aktywnej sesji). Jeśli nie ma go w katalogu quizu, backend próbuje go odczytać z `storage/uploads/quiz-assets/` (staging) — pozwala to wyświetlać świeżo wgrane zasoby przed pierwszym zapisem quizu. |
| GET | `/admin/quiz/{quiz_id}/export` | `application/zip` attachment: mirror of `storage/quizzes/{quiz_id}/` — every file under that directory (e.g. `quiz.kqf`, `meta.json`, `media/**`, any extras). |
| POST | `/admin/quiz/import` | `multipart/form-data` file field `file` (zip) → `{ id, skipped: string[] }`. Must contain `quiz.kqf` at archive root; all other entries are written under the new quiz directory (path traversal rejected). **Limits:** upload ≤ `MAX_QUIZ_IMPORT_ZIP_BYTES` (default 100 MiB); `quiz.kqf` uncompressed ≤ `MAX_QUIZ_IMPORT_KQF_BYTES` (default 2 MiB); each non-`quiz.kqf` member ≤ `MAX_QUIZ_IMPORT_MEMBER_BYTES` (default 100 MiB); total uncompressed extracted ≤ `MAX_QUIZ_IMPORT_UNCOMPRESSED_TOTAL_BYTES` (default 300 MiB). Members exceeding the per-file cap are dropped and listed in `skipped` (the editor shows broken-media placeholders to re-upload). Oversized upload or total uncompressed → `413` and the partial quiz directory is rolled back. See `backend/.env.example`. After import, `meta.json` is validated or rebuilt so `id` matches the new folder. |

Client helpers: [frontend/lib/admin-quiz/client.ts](../frontend/lib/admin-quiz/client.ts), [frontend/lib/sessions/client.ts](../frontend/lib/sessions/client.ts), [frontend/lib/import-export/client.ts](../frontend/lib/import-export/client.ts).

## Admin assets (editor staging)

| Method | Path | Notes |
|--------|------|------|
| POST | `/admin/assets` | Multipart upload; returns public-relative path under `MEDIA_PUBLIC_PREFIX`. |
| GET | `/admin/assets/{asset_id}/{filename}` | Serve a staged asset (e.g. `image.webp`, `thumb.webp`) under `storage/uploads/quiz-assets/{asset_id}/`. Used by the editor to preview just-uploaded media before the quiz is saved. Requires admin auth. `404` for unknown asset / traversal. |

## Admin results browser

Prefix: **`/admin/results`**.

| Method | Path | Notes |
|--------|------|------|
| GET | `/admin/results` | `string[]` ISO dates (newest first). |
| GET | `/admin/results/{date}` | File metadata list for that day. |
| GET | `/admin/results/{date}/{filename}` | Pełny JSON archiwum: `quiz_id`, `quiz_title`, `session_*`, **`max_score`**, `scores[]`. Dla starszych plików bez `max_score` backend uzupełnia pole z aktualnego `quiz.kqf` (jeśli quiz nadal istnieje). |
| DELETE | `/admin/results/{date}/{filename}` | Remove one file. |
| DELETE | `/admin/results/{date}` | Remove entire day directory. |

Client: [frontend/lib/results/client.ts](../frontend/lib/results/client.ts).

## Participant play API

| Method | Path | Body | Notes |
|--------|------|------|------|
| POST | `/play/{pin}/join` | `{ nickname }` | Registers participant; `409` if nickname taken (case-folded). |
| POST | `/play/{pin}/submit` | `{ nickname, score }` | `400` with `{"detail": {"error": "nickname_violation", "detail_pl": "..."}}` if blocked / unknown nickname. Powtórny submit tego samego uczestnika (np. podwójne wywołanie z UI) zwraca **`200`** `{"accepted": true}` — pierwszy zapisany wynik pozostaje bez zmiany. |

**Rate limiting (per client IP):** Both endpoints share one sliding window per IP (default **120** requests per **60** seconds). Over limit → **`429`** with body `{"detail":"rate_limited"}` and **`Retry-After`** (seconds). Configure `PLAY_RATE_LIMIT_*` in `backend/.env.example`. Behind a trusted reverse proxy, set **`PLAY_RATE_LIMIT_TRUST_X_FORWARDED_FOR=true`** so the first `X-Forwarded-For` hop is used as the client IP (do not enable if clients can send that header directly to the API).

Client: [frontend/lib/play/client.ts](../frontend/lib/play/client.ts). Frontend flow: [frontend/app/play/page.tsx](../frontend/app/play/page.tsx), [frontend/app/play/storage.ts](../frontend/app/play/storage.ts) (`sessionStorage` key `cogniro:play:{code}:{nickname}:state`).

## Media

| Method | Path | Notes |
|--------|------|------|
| GET | `/media/{quiz_id}/{filename:path}` | Serves files under `storage/quizzes/{quiz_id}/media/` (traversal-safe → `404`). **Only while that quiz’s play session is active**; otherwise `403` (`quiz_not_active`). |
| GET | `{MEDIA_PUBLIC_PREFIX}/{asset_path}` | Default prefix `/media/quiz-assets`; staged uploads from the editor. |

## Legacy (deprecated)

| Method | Path | Notes |
|--------|------|------|
| POST | `/legacy/quiz-demo/results` | Old mock scoring for the static quiz demo. |

Frontend demo: [frontend/app/legacy/quiz-demo/page.tsx](../frontend/app/legacy/quiz-demo/page.tsx). Backend: [backend/legacy/quiz_demo_router.py](../backend/legacy/quiz_demo_router.py).

## Schemas (KQF and editor)

- **Python** — [backend/schemas/kqf.py](../backend/schemas/kqf.py), parser/serializer [backend/services/kqf.py](../backend/services/kqf.py), admin DTOs [backend/schemas/admin_quiz.py](../backend/schemas/admin_quiz.py).
- **TypeScript** — [frontend/lib/kqf/schemas.ts](../frontend/lib/kqf/schemas.ts), editor form [frontend/lib/admin-quiz/schemas.ts](../frontend/lib/admin-quiz/schemas.ts), discriminated question types [frontend/app/types/admin-editor.ts](../frontend/app/types/admin-editor.ts), adapters [frontend/lib/admin-quiz/adapters.ts](../frontend/lib/admin-quiz/adapters.ts).

## Admin UI entrypoints

- Shell: [frontend/app/admin/page.tsx](../frontend/app/admin/page.tsx).
- Dashboard views: [frontend/app/admin/AdminDashboard.tsx](../frontend/app/admin/AdminDashboard.tsx) (`?quiz=`, `?view=running|results`, `?new=1`, `?edit=1`, results `date` / `file` / `quizFilter` query params).

## Related docs

- [docs/storage-and-lifecycle.md](storage-and-lifecycle.md) — directories, sessions, purge, deletion.
- [docs/quiz-format-docs.md](quiz-format-docs.md) — KQF file format.
