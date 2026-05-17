# Storage and lifecycle

This document describes where quiz and session data live, how live sessions work, and how retention and legacy code paths fit together.

## On-disk layout

The backend resolves a data directory via `COGNIRO_DATA_DIR` or, when unset, tries `/var/lib/cogniro` and falls back to a temp path if that location is not writable. See [backend/services/storage.py](../backend/services/storage.py).

Under that directory:

- **`storage/quizzes/{quiz_id}/`** — one folder per quiz. Contains:
  - `quiz.kqf` — canonical quiz definition (Markdown + front matter + question blocks).
  - `meta.json` — derived metadata (title, slug, timestamps, question count). If missing or corrupt, it is rebuilt from `quiz.kqf` via [backend/services/quiz_files.py](../backend/services/quiz_files.py).
  - `media/` — binary assets referenced from KQF media fields.
- **`storage/results/{YYYY-MM-DD}/`** — JSON result snapshots written when a session is stopped. Filenames are composed from quiz id/title and stop time; see [backend/services/slug.py](../backend/services/slug.py) and [backend/services/results.py](../backend/services/results.py).
- **`uploads/quiz-assets/`** — editor staging for `POST /admin/assets` (public prefix from `MEDIA_PUBLIC_PREFIX`).

KQF on disk is the **source of truth**; `meta.json` is a cache for listing and UI.

## In-memory sessions

Live runs are tracked only in memory: PIN → session and quiz id → session indices in [backend/services/sessions.py](../backend/services/sessions.py). Restarting the process clears all active sessions.

PINs are short strings used in `/play/?code=` join URLs built when the admin activates a quiz ([backend/services/admin_quiz.py](../backend/services/admin_quiz.py)).

## Activate → join → submit → stop

1. **Activate** — `POST /admin/quiz/{id}/activate` starts a session, returns `pin` and `join_url`.
2. **Join** — `POST /play/{pin}/join` registers a participant nickname.
3. **Submit** — `POST /play/{pin}/submit` records a score for a joined nickname.
4. **Stop** — `POST /admin/quiz/{id}/stop` ends the session, writes a result JSON under `storage/results/{date}/`, and clears the in-memory session.

## Flush-to-disk semantics

Result files are written **only on stop**, not on each submit. Participant scores in the admin “running” view reflect in-memory state until stop.

## 30-day purge loop

[backend/main.py](../backend/main.py) starts a background `asyncio` task in the app lifespan. It calls [purge_results_older_than](../backend/services/results.py) with `timedelta(days=RESULT_RETENTION_DAYS)` (default **30**, env `RESULT_RETENTION_DAYS`), then sleeps `PURGE_INTERVAL_SECONDS` (default **3600**, env `PURGE_INTERVAL_SECONDS`) between runs. Failures are logged; they do not crash the app.

## Media gating

`GET /media/{quiz_id}/{filename}` serves files from `storage/quizzes/{quiz_id}/media/` only while that quiz’s session is active. See [backend/routes/media.py](../backend/routes/media.py).

## Decoupled deletion

Deleting a quiz removes its directory under `storage/quizzes/` but does **not** delete historical result JSON files under `storage/results/` (results are keyed by date/filename, not a foreign key).

## Legacy isolation

Deprecated demo scoring and routes live under [backend/legacy/](../backend/legacy/) (`POST /legacy/quiz-demo/results`) and [frontend/app/legacy/](../frontend/app/legacy/). They exist for backward compatibility with the old static demo and should not be extended; remove once `/play` is verified end-to-end.
