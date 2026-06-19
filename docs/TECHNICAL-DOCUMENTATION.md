# Cogniro - Technical Documentation

This document is the technical reference for the Cogniro platform. It describes the
architecture, the technology stack, the security and authentication model, and the
persistence and concurrency model in detail.

For the step-by-step setup and run instructions, see the companion document
[DEPLOYMENT.md](DEPLOYMENT.md).

Other existing reference documents you may want alongside this one:

- [api-and-frontend-contract.md](api-and-frontend-contract.md) - the HTTP contract between frontend and backend.
- [storage-and-lifecycle.md](storage-and-lifecycle.md) - on-disk layout, session lifecycle, retention purge.
- [quiz-format-docs.md](quiz-format-docs.md) - the KQF quiz file format.
- [network-configuration.md](network-configuration.md) - CORS and network setup notes.

---

## 1. What the system is

Cogniro is a live quiz / knowledge-competition platform. It
has two kinds of users:

- A single **administrator**, who creates and edits quizzes, starts and stops live
  sessions, and reviews past results.
- Many anonymous **participants**, who join a running session either by entering a short PIN
  code or by scanning a QR code (the QR encodes the join link, so scanning it opens the play
  screen with the PIN already filled in), then pick
  a nickname, answer the questions in their browser, and submit a final score that appears
  on a live leaderboard.

The product is intentionally small in scope. Several different quizzes can be live at the
same time, each with its own session and PIN; the only restriction is that a single quiz
cannot be started more than once concurrently (one active session per quiz). Each session is
hosted for a single audience (a classroom, a meeting, a conference talk) and participants
count in the tens to low hundreds, not millions. This scale is the reason the architecture
can stay simple, which is explained in detail in section 6.

---

## 2. High-level architecture

The system is two independent deployable units plus the participants' browsers.

```
                 +-------------------------------+
                 |        Participant /           |
                 |        Admin browser           |
                 +---------------+----------------+
                                 | HTTPS
                 +---------------+----------------+
                 |   Static frontend (React +     |
                 |   Next.js static export,       |
                 |   plain files) on Nginx/CDN    |
                 +---------------+----------------+
                                 | HTTPS (JSON REST)
                 +---------------+----------------+
                 |   Backend API (FastAPI on      |
                 |   Uvicorn, single process)     |
                 +---------------+----------------+
                                 | local filesystem
                 +---------------+----------------+
                 |   Data directory on disk:      |
                 |   quizzes, results, media      |
                 |   (JSON / KQF / image files)   |
                 +-------------------------------+
```

Key points:

- The **frontend is fully static**. After it is built, it is just HTML, CSS, JavaScript and
  image files. It needs no Node.js runtime in production and can be served by any web
  server or CDN.
- The **backend is a single Python process**. It holds all live-session state in memory and
  persists durable data (quizzes, results, uploaded media) as files on a local disk.
- There is **no database** and **no separate cache / message broker**. The only stateful
  resource the backend depends on is a writable directory on disk.
- Communication is **plain HTTP REST with JSON**. There are no WebSockets and no polling.
  Requests are made in response to user actions and at specific moments in the quiz flow.
  The countdown timers in the participant UI are computed locally in the browser and do not
  call the backend.

---

## 3. Technology stack

### 3.1 Backend

| Concern | Choice | Version (minimum) |
| --- | --- | --- |
| Language | Python | 3.14 (pinned in `backend/.python-version` and `pyproject.toml`) |
| Web framework | FastAPI | >= 0.135.3 |
| ASGI server | Uvicorn (with `standard` extras: uvloop, httptools) | >= 0.38.0 |
| Data validation | Pydantic | >= 2.12.5 |
| Password hashing | bcrypt | >= 5.0.0 |
| JSON Web Tokens | PyJWT | >= 2.12.1 |
| Image processing | Pillow | >= 12.2.0 |
| Quiz file parsing | python-frontmatter | >= 1.1.0 |
| Multipart uploads | python-multipart | >= 0.0.27 |
| Profanity filtering | glin-profanity | >= 3.4.0 |
| Env file loading | python-dotenv | >= 1.0.0 |
| Package / venv manager | uv (Astral) | latest |
| Lint / format | Ruff | >= 0.15.9 (dev only) |
| Tests | pytest, httpx | dev only |

The exact pinned versions live in `backend/pyproject.toml` and `backend/uv.lock`.

### 3.2 Frontend

| Concern | Choice | Version |
| --- | --- | --- |
| UI library | React | 19.2.3 |
| Framework | Next.js (React framework, App Router) | 16.1.6 |
| Language | TypeScript | 5.9.3 |
| Styling | Tailwind CSS | 4.2.1 |
| Forms / validation | react-hook-form + Zod | 7.65.0 / 4.1.12 |
| Icons | lucide-react | 0.577.0 |
| Static image optimization | next-image-export-optimizer | 1.20.1 |
| QR codes | qrcode | 1.5.4 |
| Date handling | date-fns, react-day-picker | 4.4.0 / 10.0.1 |
| Package manager | pnpm | 10.33.0 (pinned in root `package.json`) |
| Node.js runtime (build only) | Node | 22 (the version used by Docker and CI) |

Node is only needed to **build** the frontend; it is not needed to **serve** it.

### 3.3 Repository layout

This is a pnpm + uv monorepo.

```
cogniro/
  backend/            FastAPI application (Python, managed with uv)
    main.py           App composition, CORS, lifespan, background purge loop
    core/settings.py  Environment-driven settings and limits
    security/         Admin auth: bcrypt verify, JWT issue/decode, revocation
    routes/           HTTP routers (admin_auth, admin_quiz, admin_results, play, media)
    services/         Business logic (storage, sessions, results, kqf, media, etc.)
    schemas/          Pydantic request/response models
    scripts/          Helper scripts (e.g. hash_admin_password.py)
    tests/            pytest suite
    Dockerfile        Multi-stage image (dev / prod-deps / runner)
    .env.example      Template for backend environment variables
    .python-version   Python 3.14
  frontend/           Next.js app (TypeScript, managed with pnpm)
    app/              App Router pages (/, /play, /admin, /admin/presenter)
    lib/              API clients, backend URL + media URL resolution, auth client
    components/       UI components
    next.config.ts    Static export configuration
    Dockerfile        Multi-stage image (dev / build / runner)
    .env.example      Template for frontend environment variables
  docs/               This documentation
  docker-compose.yml  Local development orchestration (dev targets)
  package.json        Root workspace scripts (validate, test, fix) and git hooks
  pnpm-workspace.yaml Workspace definition
```

---

## 4. Backend in detail

### 4.1 Application composition

The application is assembled in `backend/main.py`:

1. `load_dotenv()` loads a local `.env` file if one is present. This works in any
   environment; values already set in the real environment take precedence over the file, so
   you can use a `.env` file or inject variables directly (or both).
2. A FastAPI app is created with a **lifespan** context manager. On startup the lifespan:
   - initializes the storage directories,
   - loads admin auth configuration from environment variables (and fails fast in
     production if required secrets are missing, see section 5),
   - loads a persisted admin password override if one exists on disk,
   - starts a single background `asyncio` task that runs two cleanup jobs once at startup
     and then on a fixed interval: one deletes result files past their retention age, the
     other deletes abandoned editor image uploads. Both are described in detail in
     section 9.
3. CORS middleware is added (see section 5.6).
4. Five routers are mounted, plus a `GET /health` endpoint that returns `{"status": "ok"}`.

The app is served by Uvicorn. In production it must run as a **single worker** process. The
reason is explained in section 6.5.

### 4.2 Routers and endpoints

The full request/response contract is documented in
[api-and-frontend-contract.md](api-and-frontend-contract.md). The summary below lists every
route grouped by router.

**Admin authentication** (`routes/admin_auth.py`, mounted under `/admin`):

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/admin/auth/login` | Verify the admin password, return an access token and set the refresh cookie. Returns 401 `invalid_password` on a bad password. |
| POST | `/admin/auth/refresh` | Issue a new access token from the refresh cookie, and rotate the refresh token (the old one is revoked, a new one is set). |
| POST | `/admin/auth/logout` | Revoke the current access and refresh tokens and clear the refresh cookie. |
| POST | `/admin/auth/change-password` | Verify the current password, set a new one, invalidate all previously issued tokens, and reissue a session for the current device. |

**Admin quiz management** (`routes/admin_quiz.py`, mounted under `/admin`, all require a valid admin access token):

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/admin/quiz` | Create a quiz. |
| GET | `/admin/quiz/all` | List all quizzes. |
| GET | `/admin/quiz/{id}` | Get one quiz for editing. |
| PUT | `/admin/quiz/{id}` | Update a quiz. |
| DELETE | `/admin/quiz/{id}` | Delete a quiz. |
| POST | `/admin/quiz/{id}/activate` | Start a live session, return PIN and join URL. |
| POST | `/admin/quiz/{id}/stop` | Stop the session and write the result file. |
| GET | `/admin/quiz/{id}/session` | Snapshot of the running session (participants, scores). |
| POST | `/admin/quiz/{id}/session/block` | Block a participant from the leaderboard. |
| PATCH | `/admin/quiz/{id}/availability` | Schedule or manually open/close a quiz. |
| POST | `/admin/assets` | Upload an image (max 5 MiB); re-encoded to WebP image + thumbnail, returned as a content-addressed `asset_{uuid}`. |
| GET | `/admin/assets/{asset_id}/{file}` | Serve a staged editor asset for preview before the quiz is saved. |
| GET | `/admin/quiz/{id}/media/{file}` | Serve quiz-owned media for the editor. Does not require an active session (unlike the public `/media` route). |
| GET | `/admin/quiz/{id}/export` | Download the quiz directory as a ZIP archive. |
| POST | `/admin/quiz/import` | Import a quiz from a ZIP archive. |

All routes in this router require a valid admin access token (the router declares
`dependencies=[Depends(require_admin)]`).

**Admin results** (`routes/admin_results.py`, require admin token):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/results` | List dates that have results. |
| GET | `/admin/results/{date}` | List result files for a date. |
| GET | `/admin/results/{date}/{file}` | Read one result file. |
| DELETE | `/admin/results/{date}/{file}` | Delete one result file. |
| DELETE | `/admin/results/{date}` | Delete all results for a date. |

**Participant play** (`routes/play.py`, public, rate limited):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/play/{pin}/check` | Check whether a PIN is valid / joinable. |
| POST | `/play/{pin}/join` | Join with a nickname. |
| POST | `/play/{pin}/submit` | Submit the final score (clamped server-side, see 6.4). |
| GET | `/play/{pin}/leaderboard` | Get the ranked leaderboard. |

Availability gating: `check`, `join`, and `leaderboard` first resolve the PIN to a live
session and then check the quiz's availability window (`services/admin_quiz.check_availability`).
A quiz can be force-opened or force-closed (`manual_status`) or scheduled with a start/end
window. The play endpoints translate the outcome into distinct HTTP codes so the participant
UI can show the right message: 404 `pin_not_active`, 423 `not_yet` (with the `opens_at`
time), 410 `expired`, and 403 `manually_closed`. A taken nickname returns 409; a profane
nickname or a submit from an unknown/blocked nickname returns 400.

**Media** (`routes/media.py`, public but gated):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/media/{quiz_id}/{file}` | Serve quiz media, but only while that quiz has an active session. |

---

## 5. Security and authentication

### 5.1 Authentication model: a single administrator

There is exactly one privileged user, the administrator. There is no user database, no
sign-up, and no per-user accounts. The admin proves identity with a single password.
Participants are never authenticated; they are anonymous and identified only by the
nickname they choose inside a session.

The implementation is in `backend/security/admin_auth.py`.

### 5.2 Password storage

The admin password is never stored in plaintext and the application never sees it written
anywhere in clear form.

- The password is stored as a **bcrypt hash** (cost factor 12). bcrypt is a deliberately
  slow, salted hashing algorithm designed to resist brute-force and rainbow-table attacks.
- The hash comes from one of two places, checked in this order:
  1. A hash persisted on disk at `storage/admin/password_hash` (written when the admin
     changes the password at runtime). This file is created with `0600` permissions
     (owner read/write only) where the operating system supports it.
  2. The `ADMIN_PASSWORD_HASH` environment variable, used as the initial value.
- Login verifies the submitted password against the active hash with `bcrypt.checkpw`. A
  bad password returns HTTP 401, and a malformed stored hash is treated as a failed match
  rather than an error. The verification runs in a worker thread (`asyncio.to_thread`)
  because bcrypt is intentionally slow and would otherwise block the event loop.
- bcrypt only uses the first 72 bytes of a password. The login schema accepts 1 to 512
  characters; the change-password flow additionally rejects a new password longer than 72
  bytes with a clear `password_too_long` error instead of letting bcrypt truncate silently.

To generate the initial hash, run `uv run python scripts/hash_admin_password.py` in the
backend directory. See [DEPLOYMENT.md](DEPLOYMENT.md) for the exact steps.

### 5.3 Tokens: short-lived access plus refresh

After a successful login the backend issues two JSON Web Tokens (HS256, signed with
`JWT_SECRET`):

- **Access token**: short-lived (default 15 minutes, configurable 1 to 60 minutes via
  `JWT_EXPIRE_MINUTES`). It is sent by the frontend in the `Authorization: Bearer ...`
  header on every protected admin request. It is held only in memory in the browser tab
  and is intentionally not persisted (see section 7.3).
- **Refresh token**: longer-lived (default 7 days, configurable 1 to 30 days via
  `ADMIN_REFRESH_EXPIRE_DAYS`). It is delivered as an **HttpOnly cookie** scoped to the
  path `/admin/auth`, so it cannot be read by JavaScript and is only sent to the auth
  endpoints. When the access token expires, the frontend silently calls
  `/admin/auth/refresh` to obtain a new one.

Refresh tokens are **rotated**: each call to `/admin/auth/refresh` revokes the refresh
token it was given (by its `jti`, see 5.4) and issues a brand new refresh token in the
response cookie, alongside the new access token. A stolen refresh token therefore has a
limited useful life, and a replayed (already-used) refresh token is rejected.

Each token carries: a subject (`admin`), a type (`access` or `refresh`), a unique id
(`jti`), the issue time, the expiry, and a **password fingerprint** (`pwd`).

### 5.4 Token revocation and password-change invalidation

Two mechanisms invalidate tokens before their natural expiry:

- **Explicit revocation (logout)**: the token `jti` is added to an in-memory revocation
  set with a time-to-live equal to the token's own expiry. Any later request presenting a
  revoked `jti` is rejected. The set is pruned of expired entries on each access.
- **Password change invalidates everything**: every token embeds a short SHA-256
  fingerprint of the password hash that was active when it was issued. When the admin
  changes the password, the active hash changes, so its fingerprint changes, and every
  previously issued token (access and refresh) instantly fails the fingerprint check and is
  rejected. This is how a password change forces a global logout without any shared session
  store. The change-password endpoint requires the correct current password and a matching
  confirmation, and to avoid logging out the device that just made the change, it issues a
  fresh access and refresh token in the same response.

Important operational consequence: the revocation set lives in process memory only. It is
cleared on restart and is not shared between processes. This is one of the reasons the
backend must run as a single worker (section 6.5). After a restart, an already-issued token
that was explicitly logged out could in principle be replayed until its short natural
expiry; keeping the access token lifetime short (the 15-minute default) bounds this window.

### 5.5 Cookie flags

The refresh cookie is configured for safe cross-site behaviour:

- `HttpOnly` is always set.
- `Secure` is controlled by `ADMIN_REFRESH_COOKIE_SECURE` (set it to `true` in any
  HTTPS deployment so the cookie is never sent over plain HTTP).
- `SameSite` is controlled by `ADMIN_REFRESH_COOKIE_SAMESITE` (`lax`, `strict`, or `none`).
  If you host the admin UI on a different site than the API (for example
  `app.example.com` calling `api.example.com`), set this to `none`. The backend then forces
  `Secure=true` automatically, because browsers require it for `SameSite=None`.

### 5.6 CORS

Cross-Origin Resource Sharing is configured in `main.py`. Allowed origins come from the
`CORS_ORIGINS` environment variable (comma-separated). When it is unset the defaults are
`http://localhost:3000` and `http://127.0.0.1:3000` for local development. Credentials are
allowed (required so the refresh cookie works), and all methods and headers are permitted.
In production you must set `CORS_ORIGINS` to the exact public origin(s) of your frontend.

### 5.7 Fail-fast on missing secrets

On startup, if `ADMIN_PASSWORD_HASH` or `JWT_SECRET` is missing, the behaviour depends on
the environment:

- In a development-like environment (`ENVIRONMENT` or `ENV` set to `development`, `dev`,
  `local`, or `test`, which is also the default when neither is set) the app logs a warning
  and keeps running, but admin login will fail until the values are set.
- In any other environment the app **refuses to start** with a clear error. This prevents a
  misconfigured production deploy from silently serving broken authentication.

For production you should set `ENVIRONMENT=production` (or any value not in the dev list) so
this guard is active. See [DEPLOYMENT.md](DEPLOYMENT.md).

### 5.8 Input validation and abuse protection

- **Pydantic models** validate every request body. Nicknames are stripped and bounded (1
  to 128 characters), submitted scores must be non-negative integers (`Field(ge=0)`), the
  login password is 1 to 512 characters, and a new password is 8 to 512 characters (with the
  extra 72-byte bcrypt cap from section 5.2).
- **Profanity filtering**: participant nicknames are checked with `glin-profanity` on join
  and rejected with HTTP 400 if they violate the filter.
- **Image upload pipeline** (`services/media_assets.py`): the client-declared content type
  must be `image/jpeg`, `image/png`, or `image/webp`, and the body is read in 64 KiB chunks
  aborting at 5 MiB. The real format check happens after Pillow opens the file (only JPEG,
  PNG, WebP are accepted), the pixel count is capped at 20 million to stop decompression
  bombs, EXIF orientation is normalized, and the image is re-encoded to WebP (a main variant
  capped at 720 px wide plus a 256 px thumbnail). Output is content-addressed as
  `asset_{uuid}` and served with an immutable long-cache header. The asset server only
  serves `.webp` files and rejects any symlink in the path.
- **ZIP import** (`services/admin_quiz.py`): the archive must contain a `quiz.kqf`, which is
  parsed and validated before anything is written. Extraction enforces a maximum archive
  size, a maximum `quiz.kqf` size, a maximum per-member uncompressed size, and a maximum
  total uncompressed size (defending against zip bombs); every member path is checked for
  traversal and absolute paths and rejected if unsafe. A single oversized media member is
  dropped and reported in a `skipped` list (the editor shows a broken-media placeholder),
  while any harder failure rolls back the whole quiz directory. All limits are configurable
  (section 8).
- **Path traversal protection**: every endpoint that maps a request value to a file path
  rejects `..`, path separators, and other unsafe input, so a request can never read or
  write files outside the intended directory. Result-file reads validate the date format and
  reject any filename containing `/` or `..`.
- **Per-IP rate limiting** on the public play endpoints (section 6.6).
- **Media gating**: `GET /media/{quiz_id}/{file}` only serves files while that quiz has an
  active live session. When no session is active it returns 403, so quiz content is not
  publicly browsable outside of a running game.

---

## 6. Data persistence and the storage model

This section explains the persistence model in detail: what is stored where, and how the
code guarantees correctness under concurrency (no lost updates, no dirty reads, no torn
writes, no time-of-check-to-time-of-use races).

### 6.1 The storage model

Durable state is kept as plain files on disk, and hot live-session state is kept in process
memory. The shape of the workload makes this model straightforward to reason about:

- **Durable data has effectively one writer.** Quiz definitions are written only by the
  single administrator, editing one quiz at a time. Participants never write durable files
  during a game; their scores live in memory and are written to disk exactly once, when the
  session is stopped.
- **The data set is small.** A handful of quiz definitions and one small JSON file per
  finished session. There are no joins, reporting queries, or analytical workloads.
- **Write volume is low.** A live session produces one in-memory update per participant
  action and exactly one durable file at the end.

The correctness properties for this model (atomic durable writes, serialized writers, and
race-free live-session state) are provided by explicit, auditable code, described in the rest
of this section.

### 6.2 What is stored, and where

The on-disk layout is documented in full in
[storage-and-lifecycle.md](storage-and-lifecycle.md). In summary, under the data directory:

- `storage/quizzes/{quiz_id}/`
  - `quiz.kqf` - the canonical quiz definition (Markdown plus front matter). This is the
    single source of truth for a quiz.
  - `meta.json` - a derived cache (title, slug, timestamps, question count) used for fast
    listing. If it is missing or corrupt it is rebuilt from `quiz.kqf`.
  - `media/` - images belonging to the quiz.
- `storage/results/{YYYY-MM-DD}/{slug}_{timestamp}_{seq}.json` - one immutable JSON snapshot
  per finished session.
- `storage/uploads/quiz-assets/` - temporary staging for images uploaded in the editor
  before the quiz is saved.
- `storage/admin/password_hash` - the persisted admin password hash, if changed at runtime.

The location of the data directory is controlled by `COGNIRO_DATA_DIR` (or the more specific
`COGNIRO_STORAGE_DIR`). In the production Docker image it defaults to `/var/lib/cogniro`. See
section 8 and the deployment guide.

### 6.3 In-memory live-session state

While a quiz is running, the session (its PIN, its participants, their scores, the shuffled
question order) lives only in memory, in `backend/services/sessions.py`. This is the hot,
frequently-mutated state. It is deliberately not written to disk on every change. When the
admin stops the session, the final scores are written once, atomically, to a single result
file. Because this state is in-memory, **a server restart ends all active sessions** (across
every running quiz) and the in-progress (not yet stopped) scores are lost. This is an
accepted trade-off for the expected scale.

### 6.4 How every ACID-type concern is handled

The properties usually associated with a database transaction (atomicity, isolation,
durability, no lost updates, no torn reads) are all provided here by a small set of explicit
techniques.

**Atomic, durable writes (no torn or partial files).**

Every durable file is written with a write-to-temp-then-rename pattern in
`services/storage.py` (`write_text_atomic`):

1. The full content is written to a temporary file in the same directory.
2. The file buffer is flushed and `os.fsync` is called so the bytes reach the disk.
3. `os.replace` atomically renames the temp file over the destination. On a POSIX
   filesystem `rename` is atomic, so a reader either sees the complete old file or the
   complete new file, never a half-written mix.
4. The containing directory is itself fsynced so the rename survives a crash.

This guarantees that a quiz file, a `meta.json` (written via `write_meta_json_atomic`), a
result file, or the persisted password hash is never observed in a partially-written state,
even if the process is killed mid-write.

**Serialized writes (no lost updates, single writer).**

Quiz writes are serialized by a process-wide reentrant lock, `QUIZ_WRITE_LOCK`
(`threading.RLock`) in `services/storage.py`. Every code path that mutates a quiz directory
holds this lock for the whole read-modify-write: creating a quiz, updating one (which reads
the existing KQF, merges the payload, writes `quiz.kqf` and `meta.json`, and removes media
files that are no longer referenced), patching availability, recording an activation
timestamp, clearing the manual status on stop, importing, and deleting. Because the lock
spans the read and the write, two overlapping saves cannot interleave and clobber each other,
and combined with the atomic rename above the on-disk quiz is always internally consistent.

**Time-of-check-to-time-of-use (TOCTOU) safety in live sessions.**

All live-session reads and mutations go through a single lock, `_LOCK` (`threading.RLock`) in
`services/sessions.py`. The critical point is that each operation performs its check and its
action **inside the same lock acquisition**, so there is no window between checking a
condition and acting on it. Examples:

- `start_session` checks "is this quiz already running?" and, if not, generates a unique PIN
  and registers the session, all while holding the lock. Two near-simultaneous activate
  requests cannot both create a session for the same quiz, and cannot be assigned the same
  PIN. If one request loses the race, `start_session` raises and the activate handler simply
  looks up and returns the session the winner created (`activate_quiz` in
  `services/admin_quiz.py`), so the loser still gets a correct, consistent response instead
  of an error. Activation is therefore idempotent.
- `delete_quiz` refuses with HTTP 409 if a session for that quiz is running, so a quiz cannot
  be deleted out from under a live game.
- `register_participant` checks "is this nickname already taken in this session?" and adds
  the participant in the same locked block. Two players cannot both claim the same nickname
  because the check and the insert are atomic with respect to each other.
- `record_submission` looks up the participant and records the score under the lock, so a
  block action and a submit cannot race into an inconsistent state.

Because the check and the use are never separated, the classic TOCTOU race simply cannot
happen.

**Idempotent submission (no double-counting).**

`record_submission` records a score only if the participant has not already submitted. A
duplicate submit (for example caused by a client retry, or React's development-mode double
effect) returns the existing participant unchanged rather than overwriting or erroring. The
operation is therefore idempotent.

**A justified lock-free fast path.**

One hot read path, `get_or_create_session_shuffle`, has a deliberate lock-free fast path for
performance. It is safe because of two facts: reading an attribute and building a list are
atomic under the Python Global Interpreter Lock, and the shuffled-order field is only ever
**replaced** as a whole, never mutated in place. So a reader always sees either the old
complete list or the new complete list. If the fast-path check is ambiguous (first join, or
the quiz was edited mid-session) it falls back to the locked slow path. This is the one place
where concurrency reasoning is subtle, and it is documented inline in the code.

**Server-authoritative scoring (never trust the client).**

On submit, the client-supplied score is clamped server-side to the quiz's maximum possible
points (`routes/play.py`: `score = min(body.score, max_score)`). A tampered client cannot
report an impossible score.

**Single-IP rate-limit state.**

The play-endpoint rate limiter keeps per-IP counters in memory, guarded by a dedicated
`threading.Lock`, with bounded memory (it tracks at most 10000 distinct IPs and evicts the
least-recently-used under flooding). See section 6.6.

### 6.5 The one hard constraint: run a single worker

All of the locks above are **in-process** locks. They serialize work within one Python
process. They do **not** coordinate across multiple OS processes. Therefore the backend must
be run with a **single Uvicorn worker**.

If you ran Uvicorn with `--workers N` (N greater than 1) you would have N independent
processes, each with its own locks, its own in-memory sessions, and its own revocation set.
That would reintroduce exactly the race conditions the design avoids (two workers could both
"win" a PIN, sessions would be split across workers, logout would only affect one worker).

For the application to function correctly it must therefore run with a **single Uvicorn
worker**. Never run multiple workers.

### 6.6 Rate limiting

The two public write endpoints, `POST /play/{pin}/join` and `POST /play/{pin}/submit`, share
a per-IP sliding-window rate limiter (`services/play_rate_limit.py`). Defaults: enabled, a
60-second window, and 120 requests per window per IP. When the limit is exceeded the endpoint
returns HTTP 429 with a `Retry-After` header. If the backend runs behind a trusted reverse
proxy, set `PLAY_RATE_LIMIT_TRUST_X_FORWARDED_FOR=true` so the real client IP from
`X-Forwarded-For` is used instead of the proxy's IP. All values are configurable (section 8).

---

## 7. Frontend in detail

### 7.1 Static export

The frontend is a **React** application built with Next.js (the React framework), using the
App Router and configured with `output: 'export'`
(`frontend/next.config.ts`). Building it produces a directory of static files
(`frontend/out/`) with no server-side rendering and no Node.js runtime requirement. With
`trailingSlash: true`, each route is emitted as `route/index.html`, which works on any plain
file server. A custom image loader plus `next-image-export-optimizer` processes images in
`public/images/` at build time into `out/nextImageExportOptimizer/` (responsive WebP variants
at quality 75 and tiny blurred placeholders). The dev-only `allowedDevOrigins` list is
derived from `NEXT_PUBLIC_ALLOWED_DEV_ORIGIN` or `NEXT_PUBLIC_BACKEND_URL` so hot reload works
when the dev server is reached on a non-localhost hostname; it has no effect on the
production static build.

### 7.2 Routes

| Route | Purpose | Auth |
| --- | --- | --- |
| `/` | Redirects to `/play`. | none |
| `/play` | Participant flow: enter the PIN (or arrive via a scanned QR with `?code=PIN` prefilled), choose nickname, answer, submit, leaderboard. | none |
| `/admin` | Admin login and dashboard (quiz CRUD, sessions, results, settings). | admin token |
| `/admin/presenter` | Projector screen showing the join QR code and PIN for participants. The QR is also shown in the admin running-session view, which can additionally generate a printable QR board. | none |

### 7.3 How the frontend talks to the backend

- The backend base URL comes from the build-time variable `NEXT_PUBLIC_BACKEND_URL`
  (`lib/backend-url.ts`), defaulting to `http://localhost:8000`. Because it is a
  `NEXT_PUBLIC_*` variable, its value is baked into the static build, so it must be set
  **before** building for a given environment. The helper that builds request URLs strips a
  trailing `/api` segment if present, so either form of base URL works.
- Quiz media URLs are resolved against `NEXT_PUBLIC_MEDIA_PUBLIC_PREFIX` (`lib/media-url.ts`),
  which must match the backend's `MEDIA_PUBLIC_PREFIX`.
- The admin access token is stored **in memory only** (a module variable in
  `lib/admin-auth/client.ts`); it is never written to localStorage, sessionStorage, or a
  JavaScript-readable cookie. On a page reload it is gone, and the app silently re-acquires
  one via the refresh cookie. This reduces the blast radius of any cross-site-scripting issue.
- All admin requests attach `Authorization: Bearer {token}` and use `credentials: 'include'`
  so the refresh cookie is sent to the auth endpoints. On a 401 the client refreshes once and
  retries.
- There is **no realtime transport and no polling**: no WebSockets, no server-sent events,
  and no background interval that refetches state. The frontend calls the backend in response
  to user actions and at specific points in the quiz flow (for example checking a PIN,
  joining, and submitting). The admin session view and leaderboard are loaded on demand
  rather than continuously refreshed. Timers shown to participants (the overall quiz timer
  and per-question timers) are computed locally from timestamps in the browser. The one
  scheduled re-check is narrow: when a participant opens a quiz that is scheduled but not yet
  open, the join screen re-checks availability once around the scheduled start time so it can
  unlock without a manual reload.

---

## 8. Configuration reference

All backend configuration is read from environment variables. The full, copy-ready
descriptions (with example values) are in `backend/.env.example`, and the deployment steps
are in [DEPLOYMENT.md](DEPLOYMENT.md). This is the consolidated reference.

### 8.1 Backend environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD_HASH` | Yes (prod) | none | bcrypt hash of the admin password. Single-quote it so the shell does not expand `$`. |
| `JWT_SECRET` | Yes (prod) | none | Secret used to sign admin JWTs. Use at least 32 random bytes. |
| `ENVIRONMENT` / `ENV` | Recommended | `development` | Set to `production` so the app fails fast when secrets are missing. |
| `JWT_EXPIRE_MINUTES` | No | 15 | Access-token lifetime in minutes (1 to 60). |
| `ADMIN_REFRESH_EXPIRE_DAYS` | No | 7 | Refresh-token lifetime in days (1 to 30). |
| `ADMIN_REFRESH_COOKIE_SECURE` | No | false | Set `true` for HTTPS so the refresh cookie is HTTPS-only. |
| `ADMIN_REFRESH_COOKIE_SAMESITE` | No | lax | `lax`, `strict`, or `none`. `none` is for separate-site frontend/API and forces Secure. |
| `CORS_ORIGINS` | Yes (prod) | localhost:3000, 127.0.0.1:3000 | Comma-separated allowed browser origins. Set to your public frontend origin. |
| `FRONTEND_ORIGIN` | Recommended | http://localhost:3000 | Frontend origin used to build `/play/?code=PIN` join links. No trailing slash. |
| `COGNIRO_DATA_DIR` | Recommended | backend package dir (`/var/lib/cogniro` in Docker) | Root directory that contains `storage/`. The volume to back up. |
| `COGNIRO_STORAGE_DIR` | No | none | Points directly at the `storage/` directory. Overrides `COGNIRO_DATA_DIR` for quiz/result paths. |
| `MEDIA_PUBLIC_PREFIX` | No | /media/quiz-assets | Public path prefix for quiz media. Must match the frontend value. |
| `MEDIA_ABSOLUTE_ORIGIN` | No | none | Override the absolute origin for media URLs when the API is reached via localhost but clients load media from a public host. |
| `RESULT_RETENTION_DAYS` | No | 30 | Delete result folders older than this many days. |
| `PURGE_INTERVAL_SECONDS` | No | 3600 | How often the background purge loop runs (minimum 60). |
| `MAX_QUIZ_IMPORT_ZIP_BYTES` | No | 100 MiB | Max ZIP upload size for quiz import. |
| `MAX_QUIZ_IMPORT_KQF_BYTES` | No | 2 MiB | Max uncompressed size of `quiz.kqf` inside an import. |
| `MAX_QUIZ_IMPORT_MEMBER_BYTES` | No | 100 MiB | Max uncompressed size of any single media member. |
| `MAX_QUIZ_IMPORT_UNCOMPRESSED_TOTAL_BYTES` | No | 300 MiB | Max total uncompressed bytes per import. |
| `PLAY_RATE_LIMIT_ENABLED` | No | true | Enable per-IP rate limiting on play endpoints. |
| `PLAY_RATE_LIMIT_WINDOW_SEC` | No | 60 | Rate-limit window in seconds. |
| `PLAY_RATE_LIMIT_MAX_REQUESTS` | No | 120 | Max requests per IP per window. |
| `PLAY_RATE_LIMIT_TRUST_X_FORWARDED_FOR` | No | false | Trust the first `X-Forwarded-For` hop. Enable only behind a trusted proxy. |

### 8.2 Frontend environment variables

These are baked into the static build at build time. Set them before running the build.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | Yes | http://localhost:8000 | Base URL of the backend API. |
| `NEXT_PUBLIC_MEDIA_PUBLIC_PREFIX` | No | /media/quiz-assets | Public path prefix for quiz media. Must match backend `MEDIA_PUBLIC_PREFIX`. |
| `NEXT_PUBLIC_ALLOWED_DEV_ORIGIN` | No | none | Dev-only. Allows hot-reload when the frontend dev server is reached on a non-localhost hostname (for example a tunnel). |

---

## 9. Background tasks

A single `asyncio` task is started in the app lifespan (`main.py`, the `_purge_loop`
coroutine). It runs both jobs below once immediately at startup, then sleeps for
`PURGE_INTERVAL_SECONDS` (default 3600, that is one hour, minimum 60) and repeats, for as
long as the process is alive. The task is cancelled cleanly on shutdown. There is no external
scheduler, cron, or task queue, so these jobs only run while the backend process is running.

**Job 1: result retention purge** (`services/results.py`, `purge_results_older_than`).
Results are stored one folder per day under `storage/results/{YYYY-MM-DD}/`. This job
computes a cutoff date of `today - RESULT_RETENTION_DAYS` (default 30 days) and permanently
deletes every dated result folder whose date is older than the cutoff (the whole folder is
removed with its result files inside). Folders whose name is not a valid date are skipped. The
effect is that finished-session results are retained for roughly the retention window and then
removed automatically, so the disk does not grow without bound. If you need to keep results
longer, raise `RESULT_RETENTION_DAYS` or copy them out before they age out.

**Job 2: stale editor-upload purge** (`services/media_assets.py`, `purge_stale_editor_staging`).
When the admin uploads an image in the quiz editor, it is staged under
`storage/uploads/quiz-assets/asset_{uuid}/` before the quiz is saved. Once the quiz is saved,
its media is copied into that quiz's own `media/` folder, so the staged copy is no longer
needed. This job deletes any `asset_*` staging directory whose last-modified time is older
than 24 hours (`ORPHAN_ASSET_RETENTION_SECONDS`). The 24-hour delay means an upload that is
still being worked on is never removed mid-edit; only genuinely abandoned staging (an upload
that was never attached to a saved quiz) is cleaned up. Saved quiz media is never touched by
this job.

Both jobs run the blocking filesystem work in a worker thread (`asyncio.to_thread`) so they
never block the request-handling event loop, and any error in either job is logged and
swallowed so a cleanup failure can never crash the application or stop the loop.

---

## 10. Testing and CI

- The backend has a pytest suite under `backend/tests/` (auth, sessions, play, rate limiting,
  storage, results, import/export, KQF parsing, media gating, and more).
- The frontend has unit tests run with `tsx --test`.
- Continuous integration (`.github/workflows/ci.yml`) runs on every pull request and on push
  to `main`. It has three jobs:
  - **Frontend**: install, validate (ESLint + Prettier + TypeScript), test, build.
  - **Backend**: install with uv, Ruff lint, Ruff format check, pytest.
  - **Docker**: build the production `runner` image for both backend and frontend.
- Git hooks (Husky) enforce lint-staged on commit, conventional commit messages, and the full
  `validate` suite on push.

---

## 11. Known limitations

These are intrinsic to the design and are listed so there are no surprises in operation:

- **Single process only.** The application must run with exactly one Uvicorn worker
  (section 6.5). Never run multiple workers.
- **Live sessions are not durable.** A backend restart ends all running sessions and loses
  in-progress (not yet stopped) scores. Plan restarts for when no session is live.
- **Token revocation is in-memory.** A logout does not survive a restart and is not shared
  across processes. Short access-token lifetimes bound the risk.
- **The data directory is the system of record.** Everything durable (quizzes, results,
  uploaded media, the persisted password hash) lives under one directory. Back it up
  (section in the deployment guide). Losing it loses all quizzes and historical results.
- **Frontend backend URL is baked in at build time.** Changing `NEXT_PUBLIC_BACKEND_URL`
  requires a rebuild of the frontend.

---

## 12. Where to go next

- To set the system up and run it, read [DEPLOYMENT.md](DEPLOYMENT.md).
- For the exact request/response shapes, read
  [api-and-frontend-contract.md](api-and-frontend-contract.md).
- For the data lifecycle and retention details, read
  [storage-and-lifecycle.md](storage-and-lifecycle.md).
- For the quiz file format, read [quiz-format-docs.md](quiz-format-docs.md).
