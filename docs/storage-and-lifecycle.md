# Storage and lifecycle

This document describes where quiz and session data live, how live sessions work, and how retention and legacy code paths fit together.

## On-disk layout

The backend resolves paths in [backend/services/storage.py](../backend/services/storage.py):

- **`COGNIRO_STORAGE_DIR`** (optional) — absolute path to the `storage` directory itself (after init it contains `quizzes/`, `results/`, and `uploads/quiz-assets/`). When set, **`COGNIRO_DATA_DIR` is not used** for quiz or result files.
- **`COGNIRO_DATA_DIR`** (optional) — when `COGNIRO_STORAGE_DIR` is not set, root directory that contains `storage/`. If this is unset too, the default root is the **`backend/` package directory** (next to `core/`, `services/`), so data lives at `backend/storage/…` in dev.
- If the default directory is not writable, the process falls back to a temp path under the system temp directory (`…/cogniro`).

The production Docker image sets `COGNIRO_DATA_DIR=/var/lib/cogniro` so a volume can mount there without extra `.env`.

Under that directory:

- **`storage/quizzes/{quiz_id}/`** — one folder per quiz. Contains:
  - `quiz.kqf` — canonical quiz definition (Markdown + front matter + question blocks).
  - `meta.json` — derived metadata (title, slug, timestamps, question count). If missing or corrupt, it is rebuilt from `quiz.kqf` via [backend/services/quiz_files.py](../backend/services/quiz_files.py).
  - `media/` — binary assets referenced from KQF media fields.
- **`storage/results/{YYYY-MM-DD}/`** — JSON result snapshots written when a session is stopped. Filenames are composed from quiz id/title and stop time; see [backend/services/slug.py](../backend/services/slug.py) and [backend/services/results.py](../backend/services/results.py).
- **`storage/uploads/quiz-assets/`** — editor staging for `POST /admin/assets` (public prefix from `MEDIA_PUBLIC_PREFIX`). Files stay here until referenced from a quiz; saving the quiz copies assets into that quiz’s `media/` tree. **`GET /admin/quiz/{id}/export`** zips the whole quiz directory as-is (no extra rewriting).

KQF on disk is the **source of truth**; `meta.json` is a cache for listing and UI.

**Upgrade note:** editor staging used to live at `{data_dir}/uploads/quiz-assets/`. It now lives at `{data_dir}/storage/uploads/quiz-assets/`. Move any in-flight staged `asset_*` folders into the new path (or re-upload) before relying on unsaved editor previews.

## In-memory sessions

Live runs are tracked only in memory: PIN → session and quiz id → session indices in [backend/services/sessions.py](../backend/services/sessions.py). Restarting the process clears all active sessions.

PINs are short strings used in `/play/?code=` join URLs built when the admin activates a quiz ([backend/services/admin_quiz.py](../backend/services/admin_quiz.py)).

## Activate → join → submit → stop

1. **Activate** — `POST /admin/quiz/{id}/activate` starts a session, returns `pin` and `join_url`.
2. **Join** — `POST /play/{pin}/join` registers a participant nickname.
3. **Submit** — `POST /play/{pin}/submit` records a score for a joined nickname.

Both play endpoints share a **per-IP sliding-window rate limit** ([backend/services/play_rate_limit.py](../backend/services/play_rate_limit.py)); defaults and `PLAY_RATE_LIMIT_*` env vars are documented in [backend/.env.example](../backend/.env.example) and [api-and-frontend-contract.md](api-and-frontend-contract.md).

4. **Stop** — `POST /admin/quiz/{id}/stop` ends the session, writes a result JSON under `storage/results/{date}/`, and clears the in-memory session.

## Flush-to-disk semantics

Result files are written **only on stop**, not on each submit. Participant scores in the admin “running” view reflect in-memory state until stop.

## 30-day purge loop

[backend/main.py](../backend/main.py) starts a background `asyncio` task in the app lifespan. On each iteration it:

1. Calls [purge_results_older_than](../backend/services/results.py) with `timedelta(days=RESULT_RETENTION_DAYS)` (default **30**, env `RESULT_RETENTION_DAYS`).
2. Calls [purge_stale_editor_staging](../backend/services/media_assets.py), which removes **`storage/uploads/quiz-assets/asset_*`** directories older than **`ORPHAN_ASSET_RETENTION_SECONDS`** (default **24 hours**, constant in `media_assets.py`). This is **editor-only staging**; after a quiz save, media lives under that quiz’s `media/` folder, so long-lived staging entries are safe to drop by age.

Then it sleeps `PURGE_INTERVAL_SECONDS` (default **3600**, env `PURGE_INTERVAL_SECONDS`) before the next run. Failures are logged; they do not crash the app.

## Quiz media files

`GET /media/{quiz_id}/{filename}` serves quiz-owned files only **during an active session** for that quiz (same directory as the editor’s `./media/…` assets; admins load previews via `GET /admin/quiz/{quiz_id}/media/…` with a Bearer token). See [backend/routes/media.py](../backend/routes/media.py) and [backend/routes/admin_quiz.py](../backend/routes/admin_quiz.py).

## Decoupled deletion

Deleting a quiz removes its directory under `storage/quizzes/` but does **not** delete historical result JSON files under `storage/results/` (results are keyed by date/filename, not a foreign key).

## Legacy isolation

Deprecated demo scoring and routes live under [backend/legacy/](../backend/legacy/) (`POST /legacy/quiz-demo/results`) and [frontend/app/legacy/](../frontend/app/legacy/). They exist for backward compatibility with the old static demo and should not be extended; remove once `/play` is verified end-to-end.
