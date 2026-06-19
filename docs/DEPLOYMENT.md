# Cogniro - Deployment Guide

This guide explains how to deploy and run Cogniro from scratch. It is written to be followed
step by step and does not assume prior knowledge of the project. If you follow the steps in
order you will not need to read the source code.

For background on how the system works (architecture, security, the persistence model), see
[TECHNICAL-DOCUMENTATION.md](TECHNICAL-DOCUMENTATION.md). You do not need it to deploy, but it
is useful context.

There are two ways to run the system, and this guide covers both fully:

- **Option A: with Docker** (recommended, fewer moving parts). Jump to section 6.
- **Option B: without Docker** (bare metal / VM, install runtimes directly). Jump to
  section 7.

Read sections 1 to 5 first regardless of which option you choose, because the prerequisites,
the secrets, and the environment variables are the same for both.

---

## 1. What you are deploying

Cogniro has two parts:

1. **The backend**: a Python (FastAPI) HTTP API. It listens on port **8000** by default. It
   stores all data as files in one directory on disk. There is no database to install.
2. **The frontend**: a React website built with Next.js. After it is built it is just static files
   (HTML, CSS, JavaScript, images). It listens on port **3000** in the simple setup, or it is
   served by your web server. It needs no runtime once built.

Participants and the administrator use a web browser. The browser loads the frontend, and the
frontend calls the backend over HTTP.

```
  Browser  ->  Frontend (static files)  ->  Backend API (port 8000)  ->  Data directory on disk
```

You will typically put both behind one HTTPS reverse proxy (for example Nginx) so that
everything is served from your domain over HTTPS. Section 8 shows how.

---

## 2. Prerequisites

### 2.1 For Option A (Docker)

- A Linux host (a VM or server) with:
  - Docker Engine (recent version).
  - Docker Compose v2 (the `docker compose` command).
- Outbound internet access during the build (to download base images and packages).

That is all. The runtimes (Python, Node) are inside the images.

### 2.2 For Option B (without Docker)

On the host that runs the **backend**:

- Python **3.14** (this exact minor version is required).
- `uv`, the Python package manager from Astral (it creates the virtual environment and
  installs dependencies). Install it from https://docs.astral.sh/uv/ or with
  `curl -LsSf https://astral.sh/uv/install.sh | sh`.

On the machine that **builds** the frontend (can be the same host, or a CI runner, or your
laptop):

- Node.js **22**.
- `pnpm` **10.33.0**. The easiest way is `corepack enable && corepack prepare pnpm@10.33.0 --activate`.

On the host that **serves** the frontend in production:

- A web server that can serve static files (for example Nginx, Apache, Caddy, or a CDN). No
  Node.js is required to serve the built site. If you only want a quick start without a web
  server, you can serve the static files with the `serve` package (via `pnpm dlx`) instead
  (section 7.3).

---

## 3. Get the code

Clone the repository onto the host (or build machine):

```bash
git clone <your-repo-url> cogniro
cd cogniro
```

The two parts live in `backend/` and `frontend/`. Documentation (including this file) is in
`docs/`.

---

## 4. Create the required secrets

The backend needs two secrets before it will serve admin login in production:

1. `ADMIN_PASSWORD_HASH` - a bcrypt hash of the admin password (never the plaintext).
2. `JWT_SECRET` - a long random string used to sign login tokens.

### 4.1 Generate the admin password hash

The repository ships a helper script. Run it from the `backend` directory. It will prompt you
for the password and print the hash.

With Docker available (no local Python needed):

```bash
docker run --rm -it -v "$PWD/backend:/app" -w /app python:3.14-slim \
  sh -c "pip install --quiet bcrypt && python scripts/hash_admin_password.py"
```

Or, on a host that has Python and uv (Option B):

```bash
cd backend
uv run python scripts/hash_admin_password.py
```

Copy the printed hash. It looks like `$2b$12$....`. You will paste it into
`ADMIN_PASSWORD_HASH`. Always keep it **single-quoted** in env files and compose files so the
shell does not try to expand the `$` characters.

### 4.2 Generate the JWT secret

Any long random value works. For example:

```bash
openssl rand -base64 48
```

Copy the output into `JWT_SECRET`.

Keep both secrets out of version control. Do not commit a real `.env` file (the repository's
`.gitignore` already excludes `.env`).

---

## 5. Environment variables

This section lists what you must set. The backend reads its configuration from environment
variables; a full annotated template is in `backend/.env.example`. The frontend reads a few
`NEXT_PUBLIC_*` variables that are baked into the static build at **build time**.

### 5.1 Minimum backend variables for production

| Variable | Set it to |
| --- | --- |
| `ADMIN_PASSWORD_HASH` | The bcrypt hash from step 4.1 (single-quoted). |
| `JWT_SECRET` | The random value from step 4.2. |
| `ENVIRONMENT` | `production` (makes the app refuse to start if a secret is missing). |
| `CORS_ORIGINS` | The exact public origin of your frontend, for example `https://quiz.example.com`. Comma-separate multiple. |
| `FRONTEND_ORIGIN` | The same public frontend origin (used to build participant join links). No trailing slash. |
| `ADMIN_REFRESH_COOKIE_SECURE` | `true` (any HTTPS deployment). |
| `COGNIRO_DATA_DIR` | The directory where data is stored, for example `/var/lib/cogniro`. This is what you back up. |

If the frontend is served from a **different site** than the API (for example
`quiz.example.com` for the UI and `api.example.com` for the API), also set
`ADMIN_REFRESH_COOKIE_SAMESITE=none`. If they share the same site (recommended, via one
reverse proxy), leave it at the `lax` default.

### 5.2 Optional backend variables

These have sensible defaults; override only if needed. See
[TECHNICAL-DOCUMENTATION.md](TECHNICAL-DOCUMENTATION.md) section 8 for the full table.

- `JWT_EXPIRE_MINUTES` (default 15), `ADMIN_REFRESH_EXPIRE_DAYS` (default 7)
- `RESULT_RETENTION_DAYS` (default 30), `PURGE_INTERVAL_SECONDS` (default 3600)
- `MEDIA_PUBLIC_PREFIX` (default `/media/quiz-assets`)
- `MAX_QUIZ_IMPORT_*` size limits
- `PLAY_RATE_LIMIT_*` (rate limiting; if you run behind a reverse proxy, set
  `PLAY_RATE_LIMIT_TRUST_X_FORWARDED_FOR=true` so per-IP limits use the real client IP)

### 5.3 Frontend build-time variables

| Variable | Set it to |
| --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | The public URL the browser uses to reach the backend, for example `https://quiz.example.com` (if proxied under one domain) or `https://api.example.com`. |
| `NEXT_PUBLIC_MEDIA_PUBLIC_PREFIX` | Only if you changed the backend `MEDIA_PUBLIC_PREFIX`; the two must match. |

Important: `NEXT_PUBLIC_BACKEND_URL` is compiled into the static files. If you change it, you
must rebuild the frontend.

---

## 6. Option A: Run with Docker

There are two scenarios here: a quick local development run, and a production run.

### 6.1 Quick local run with docker compose (development only)

The repository includes `docker-compose.yml`. It is configured for **development** (hot
reload, source code mounted into the containers, no production secrets). It is the fastest way
to see the app running locally, but it is **not** a production setup.

From the repository root:

```bash
docker compose up --build
```

This starts:

- the backend at http://localhost:8000 (with auto-reload), and
- the frontend at http://localhost:3000 (with hot reload).

Open http://localhost:3000 in a browser. The admin panel is at http://localhost:3000/admin.

Note: in this development compose file no `ADMIN_PASSWORD_HASH` or `JWT_SECRET` is set and
`ENVIRONMENT` is the default `development`, so the app starts but admin login will not work
until you provide secrets. For real use, follow the production steps below.

### 6.2 Production with Docker: build the images

Both `backend/Dockerfile` and `frontend/Dockerfile` are multi-stage. The production stage in
each is named `runner`. Build those.

Backend image:

```bash
docker build -f backend/Dockerfile --target runner -t cogniro-backend:latest ./backend
```

The backend build takes no environment variables and no build arguments. All backend
configuration (secrets, CORS, data directory, and so on) is read at **runtime**, so it is
supplied when you start the container, not when you build the image. See section 6.3.

Frontend image: the frontend is the opposite case. `NEXT_PUBLIC_BACKEND_URL` is baked into
the static files at **build time**, so it must be passed as a build argument here; it cannot
be changed later without rebuilding. Build from the repository root (the build context is the
whole repo).

```bash
docker build -f frontend/Dockerfile --target runner \
  --build-arg NEXT_PUBLIC_BACKEND_URL=https://quiz.example.com \
  -t cogniro-frontend:latest .
```

Replace `https://quiz.example.com` with the URL the browser will use to reach the backend.

The backend `runner` image runs as a non-root user, creates `/var/lib/cogniro`, sets
`COGNIRO_DATA_DIR=/var/lib/cogniro`, and starts Uvicorn on port 8000 with a single worker (do
not add `--workers`). The frontend `runner` image serves the static `out/` directory with the
`serve` tool on port 3000.

### 6.3 Production with Docker: run the containers

Create a file `backend.env` (do not commit it) with your real values. The name is arbitrary
because Docker just reads it and injects the values into the container. This is not the same
as the `backend/.env` used in the non-Docker setup (section 7.1): with Docker you do not need
a `.env` inside the image at all.

```
ADMIN_PASSWORD_HASH='$2b$12$your-real-hash-here'
JWT_SECRET=your-real-random-secret
ENVIRONMENT=production
CORS_ORIGINS=https://quiz.example.com
FRONTEND_ORIGIN=https://quiz.example.com
ADMIN_REFRESH_COOKIE_SECURE=true
COGNIRO_DATA_DIR=/var/lib/cogniro
```

Create a persistent directory on the host for the data and run the backend with the env file
and a mounted volume so data survives container restarts and rebuilds:

```bash
mkdir -p /srv/cogniro-data

docker run -d --name cogniro-backend \
  --env-file backend.env \
  -v /srv/cogniro-data:/var/lib/cogniro \
  -p 8000:8000 \
  --restart unless-stopped \
  cogniro-backend:latest
```

Run the frontend:

```bash
docker run -d --name cogniro-frontend \
  -p 3000:3000 \
  --restart unless-stopped \
  cogniro-frontend:latest
```

At this point the backend answers on port 8000 and the frontend on port 3000. In production
you put both behind a reverse proxy with TLS (section 8). The volume mount
`-v /srv/cogniro-data:/var/lib/cogniro` is the single most important line: it is where all
quizzes and results are stored. Back it up (section 9).

### 6.4 A note on workers

Do not change the backend command to use multiple Uvicorn workers. The application keeps live
sessions and locks in process memory and is designed to run as a single process. Running
multiple workers will cause race conditions and split sessions. See
[TECHNICAL-DOCUMENTATION.md](TECHNICAL-DOCUMENTATION.md) section 6.5. To handle more load, use
a bigger host, not more workers.

---

## 7. Option B: Run without Docker

Here you install the runtimes directly on the host. You run the backend as a long-lived
service, build the frontend once into static files, and serve those files with a web server.

### 7.1 Backend: install and run

On the backend host:

```bash
# 1. Go to the backend directory
cd cogniro/backend

# 2. Install dependencies into a virtual environment (uv reads pyproject.toml + uv.lock)
uv sync --frozen --no-dev
```

**Step 3: create the `backend/.env` file.** This is how you configure the backend in the
non-Docker setup. The backend loads it automatically on startup (`main.py` calls
`load_dotenv()`), so as long as the file sits in the `backend/` directory and you start the
server from there, every value in it becomes an environment variable. You do not need to
export anything by hand. Create `backend/.env` (do not commit it) with at least:

```
ADMIN_PASSWORD_HASH='$2b$12$your-real-hash'
JWT_SECRET=your-real-random-secret
ENVIRONMENT=production
CORS_ORIGINS=https://quiz.example.com
FRONTEND_ORIGIN=https://quiz.example.com
ADMIN_REFRESH_COOKIE_SECURE=true
COGNIRO_DATA_DIR=/var/lib/cogniro
```

See section 5 for the full list of variables. `backend/.env.example` is an annotated template
you can copy.

**Step 4: create the data directory.** It must exist and be writable by the user that runs
the backend. The path is up to you: `COGNIRO_DATA_DIR` can point anywhere that user can write
(for example `/var/lib/cogniro`, `/srv/cogniro`, `/home/cogniro/data`). Keep the value in
`backend/.env` and the path you create here the same. `/var/lib/cogniro` is only an example.

```bash
sudo mkdir -p /var/lib/cogniro
sudo chown "$USER" /var/lib/cogniro
```

**Step 5: run the API.** Run it from the `backend/` directory so `backend/.env` is picked up
(single worker, listening on all interfaces, port 8000):

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

That command runs in the foreground. For production, run that same command as a long-lived
managed process with whatever process manager you already use, so it restarts on failure and
on boot. Keep it running from the `backend/` directory (so `backend/.env` is still loaded) and
never add `--workers N`: the backend must run as a single process (section 6.4 and the
technical doc).

### 7.2 Frontend: build the static site

On the build machine (Node 22 and pnpm 10.33.0 installed):

```bash
# 1. From the repository root, install dependencies (the workspace includes the frontend)
pnpm install --frozen-lockfile
```

**Step 2: create the `frontend/.env` file.** Just like the backend, the frontend is
configured with a `.env` file. Next.js automatically loads it at build time, so you do not
pass variables on the command line. Create `frontend/.env` (do not commit it) with the
backend URL the browser will use:

```
NEXT_PUBLIC_BACKEND_URL=https://quiz.example.com
```

`frontend/.env.example` is an annotated template you can copy. This value is compiled into
the static files, so set it correctly for the target environment before building; changing it
later means rebuilding.

**Step 3: build.**

```bash
cd frontend
pnpm build
```

The build produces the static site in `frontend/out/`. That directory contains everything
needed to serve the site: `index.html`, the `play/`, `admin/`, and `admin/presenter/`
folders, the hashed assets under `_next/`, and optimized images under
`nextImageExportOptimizer/`.

Copy the contents of `frontend/out/` to your web server's document root, for example:

```bash
sudo mkdir -p /var/www/cogniro
sudo cp -r frontend/out/* /var/www/cogniro/
```

If you ever need to serve the site under a sub-path (for example `https://example.com/quiz/`)
rather than at the domain root, you must add a `basePath` to `frontend/next.config.ts` and
rebuild. Serving at the domain root needs no change.

### 7.3 Frontend: simplest possible serving (optional, no web server)

If you just want to serve the built files without configuring Nginx, you can use the `serve`
package on the host. Run it with `pnpm dlx` (no global install needed):

```bash
pnpm dlx serve@14 -s /var/www/cogniro -l 3000
```

This listens on port 3000. For production, prefer a real web server with TLS (section 8).

---

## 8. Reverse proxy and HTTPS (recommended for both options)

In production you should serve everything over HTTPS. The configuration of the reverse proxy
and the TLS certificate is the responsibility of whoever runs the infrastructure, so this
guide does not ship a proxy config. What follows is what the proxy needs to do for this
application; translate it into your proxy of choice.

The cleanest setup serves the static frontend and the backend API from one domain over HTTPS:

- Terminate TLS at the proxy.
- Serve the contents of `frontend/out/` as static files, with a single-page-style fallback so
  unknown paths resolve to the matching `index.html` (the build uses `trailingSlash`, so each
  route is emitted as `route/index.html`).
- Forward the backend's API paths to the backend process (port 8000). The backend's route
  roots are `/admin`, `/play`, `/media`, and `/health`. If you change `MEDIA_PUBLIC_PREFIX`
  away from the default `/media/quiz-assets`, forward that prefix as well.
- Forward the standard proxy headers, including `X-Forwarded-For` (needed for the rate-limit
  client IP) and `X-Forwarded-Proto`.
- Optionally serve the hashed build assets under `/_next/` with a long, immutable cache.

With this same-domain layout the frontend and API are on the **same site**, so the admin
cookie works with the default `SameSite=lax`. Set the frontend `NEXT_PUBLIC_BACKEND_URL` and
the backend `CORS_ORIGINS` and `FRONTEND_ORIGIN` to that one public origin (for example
`https://quiz.example.com`), set `ADMIN_REFRESH_COOKIE_SECURE=true`, and because the API is
behind a proxy set `PLAY_RATE_LIMIT_TRUST_X_FORWARDED_FOR=true` so rate limiting uses the real
client IP.

If instead you serve the API on a separate domain (for example `api.example.com`), set
`CORS_ORIGINS` and `FRONTEND_ORIGIN` to the frontend's domain, build the frontend with
`NEXT_PUBLIC_BACKEND_URL=https://api.example.com`, and set
`ADMIN_REFRESH_COOKIE_SAMESITE=none` (which forces the cookie to be Secure).

Use any standard tool for the TLS certificate (for example Certbot / Let's Encrypt).

---

## 9. Data, persistence, and backups

All durable data lives under the backend's data directory (`COGNIRO_DATA_DIR`, for example
`/var/lib/cogniro` in Docker or `/srv/cogniro-data` on the host). Inside it:

- `storage/quizzes/` - quiz definitions and their media.
- `storage/results/` - one JSON file per finished session, organized by date.
- `storage/uploads/quiz-assets/` - temporary editor staging (auto-cleaned after 24 hours).
- `storage/admin/password_hash` - the admin password hash, if it was changed at runtime.

There is no database to dump. To back up the whole system, back up this one directory. A
simple approach is a scheduled copy or snapshot:

```bash
tar czf cogniro-backup-$(date +%F).tar.gz -C /srv/cogniro-data .
```

Notes:

- Old results are automatically deleted after `RESULT_RETENTION_DAYS` (default 30). If you
  need to keep results longer, raise that value or back up before the purge runs.
- Restoring is just unpacking the directory back into place while the backend is stopped.

---

## 10. Verify the deployment

After starting both parts, confirm they work:

1. **Backend health**: `curl https://quiz.example.com/health` should return
   `{"status":"ok"}`. (Or `curl http://127.0.0.1:8000/health` directly on the host.)
2. **Frontend loads**: open `https://quiz.example.com/` in a browser. It should redirect to
   the participant screen at `/play`.
3. **Admin login works**: open `https://quiz.example.com/admin`, log in with the password you
   hashed in step 4.1. If login fails with a server error, the secrets are not set correctly
   (check `ADMIN_PASSWORD_HASH` and `JWT_SECRET`); if it returns "invalid password", the hash
   does not match the password you typed.
4. **End to end**: create a quiz, activate it, open the join link or scan the QR on the
   presenter screen on a second device, join as a participant, submit, and confirm the score
   appears on the leaderboard.

---

## 11. Operations and maintenance

- **Restarts end live sessions.** A backend restart clears all running sessions and loses any
  in-progress (not yet stopped) scores. Restart and deploy when no live session is running.
- **Logs.** The backend logs to standard output. With Docker, view them with
  `docker logs -f cogniro-backend`; without Docker, read them wherever your process manager
  collects stdout. The background purge loop and any auth misconfiguration are logged here.
- **Changing the admin password.** The admin can change it from the admin panel; the new hash
  is written to `storage/admin/password_hash` and survives restarts. All existing login
  sessions are invalidated immediately.
- **Updating to a new version.** Pull the new code, then: for Docker rebuild the images and
  recreate the containers (keep the same data volume); for bare metal run `uv sync --frozen
  --no-dev` and restart the backend service, and rebuild the frontend (`pnpm build`) and
  redeploy `frontend/out/`. The data directory is untouched by updates.

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Backend refuses to start with an error about missing env vars | `ENVIRONMENT` is `production` and `ADMIN_PASSWORD_HASH` or `JWT_SECRET` is not set | Set both secrets (section 4). |
| Admin login returns a 503 | `JWT_SECRET` not configured | Set `JWT_SECRET` and restart. |
| Admin login returns "invalid password" | The hash does not match the password typed | Regenerate the hash for the correct password (step 4.1). |
| Browser shows CORS errors in the console | `CORS_ORIGINS` does not include the frontend origin | Set `CORS_ORIGINS` to the exact public frontend origin and restart. |
| Admin stays logged out after refresh / cookie not stored | Cookie blocked over HTTP, or cross-site without correct flags | Use HTTPS, set `ADMIN_REFRESH_COOKIE_SECURE=true`; for separate-site setups set `ADMIN_REFRESH_COOKIE_SAMESITE=none`. |
| Frontend calls the wrong backend URL | `NEXT_PUBLIC_BACKEND_URL` was wrong at build time | Rebuild the frontend with the correct value (it is baked in at build). |
| Quiz images do not load during a game | `MEDIA_PUBLIC_PREFIX` mismatch, or media accessed outside an active session | Ensure frontend and backend prefixes match; media is only served while a session is active. |
| All participants share one IP and hit the rate limit | Behind a proxy without forwarded-IP trust | Set `PLAY_RATE_LIMIT_TRUST_X_FORWARDED_FOR=true` (only behind a trusted proxy), or raise `PLAY_RATE_LIMIT_MAX_REQUESTS`. |
| Data disappeared after a container rebuild | No volume mounted for the data directory | Always run the backend with the data volume mounted (section 6.3). |

---

## 13. Production checklist

Before going live, confirm:

- [ ] `ADMIN_PASSWORD_HASH` and `JWT_SECRET` are set to real values.
- [ ] `ENVIRONMENT=production` is set.
- [ ] `CORS_ORIGINS` and `FRONTEND_ORIGIN` are set to your public frontend origin.
- [ ] `ADMIN_REFRESH_COOKIE_SECURE=true` (and `SameSite=none` if frontend and API are on
      different sites).
- [ ] The backend runs as a **single** Uvicorn process (no `--workers`).
- [ ] The data directory is on persistent storage and is backed up.
- [ ] The frontend was built with the correct `NEXT_PUBLIC_BACKEND_URL`.
- [ ] HTTPS is terminated by the reverse proxy, and `PLAY_RATE_LIMIT_TRUST_X_FORWARDED_FOR=true`
      if behind a proxy.
- [ ] `GET /health` returns `{"status":"ok"}` and an end-to-end test game works.
