# Network Configuration Guide

How to configure the environment variables that control networking, CORS, cookie behaviour, and the public host used for quiz media.

## Variables


| Variable                        | File            | Purpose                                                                                                                                       |
| ------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `CORS_ORIGINS`                  | `backend/.env`  | Comma-separated list of browser origins allowed to call the API. Omit to use the default (`localhost:3000` + `127.0.0.1:3000`).               |
| `FRONTEND_ORIGIN`               | `backend/.env`  | Origin used to build the `/play/?code=PIN` QR link when a quiz is activated. Must be reachable by participants.                               |
| `MEDIA_ABSOLUTE_ORIGIN`         | `backend/.env`  | Optional override for the host prepended to `/media/{quiz_id}/…` URLs returned by `POST /play/{pin}/join`. Set when participants reach the API through a different host than the request `Host` header (e.g. backend reached via `localhost` in dev but media URLs must be loadable from a tunnel). No trailing slash; omit to use the request's own `{scheme}://{host}`. |
| `ADMIN_REFRESH_COOKIE_SECURE`   | `backend/.env`  | Set `true` when the site is served over HTTPS. Marks the refresh cookie as `Secure`.                                                          |
| `ADMIN_REFRESH_COOKIE_SAMESITE` | `backend/.env`  | Set `none` only when the frontend and backend are on **different domains**. `none` requires `Secure=true`.                                    |
| `NEXT_PUBLIC_BACKEND_URL`       | `frontend/.env` | Where the browser sends API requests. Baked into the JS bundle at `next dev` / `next build` start — restart the dev server after changing it. |
| `NEXT_PUBLIC_ALLOWED_DEV_ORIGIN` | `frontend/.env` | Explicit override for `allowedDevOrigins` when frontend and backend are on **different hostnames** (e.g. two cloudflared tunnels). Only affects `pnpm dev`. |


---

## Scenario 1 — Pure localhost (default)

Everything on one machine, accessed only from that machine. No changes needed — omitting `CORS_ORIGINS` uses the localhost defaults.

```ini
# backend/.env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_ORIGIN=http://localhost:3000
ADMIN_REFRESH_COOKIE_SECURE=false
# ADMIN_REFRESH_COOKIE_SAMESITE=        ← omit, lax default is fine

# frontend/.env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## Scenario 2 — Laptop on LAN, phone scans QR (same Wi-Fi)

You run both servers on your laptop. Participants are on the same Wi-Fi and open the QR code on their phones. Replace `192.168.1.42` with your actual LAN IP (`ipconfig getifaddr en0` on macOS).

The phone's browser sends `Origin: http://192.168.1.42:3000`, so that origin must be in `CORS_ORIGINS`. `FRONTEND_ORIGIN` must be the LAN IP so the QR code contains a URL phones can reach. Both origins are plain HTTP so `Secure=false` and default `SameSite=lax`.

```ini
# backend/.env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.42:3000
FRONTEND_ORIGIN=http://192.168.1.42:3000
ADMIN_REFRESH_COOKIE_SECURE=false
# ADMIN_REFRESH_COOKIE_SAMESITE=        ← omit, lax default is fine

# frontend/.env
NEXT_PUBLIC_BACKEND_URL=http://192.168.1.42:8000
```

`next.config.ts` automatically reads `NEXT_PUBLIC_BACKEND_URL` and adds its hostname to `allowedDevOrigins`, which lets the phone load `/_next/*` HMR resources from the dev server. No extra config needed. For `pnpm start` (`serve out`) this is irrelevant — static files have no HMR.

---

## Scenario 3 — Two cloudflared quick tunnels (no account needed)

`cloudflared tunnel --url` creates a temporary HTTPS tunnel with no account or config file. Run it twice — once per service — each gives a different random URL.

```bash
cloudflared tunnel --url http://localhost:3000   # prints FRONTEND-URL
cloudflared tunnel --url http://localhost:8000   # prints BACKEND-URL
```

Because the frontend and backend are on **different domains**, the auth cookie must be `SameSite=None; Secure=true`.

Copy the two printed URLs and set them in your `.env` files before running the servers.

```ini
# backend/.env
CORS_ORIGINS=http://localhost:3000,https://FRONTEND-URL.trycloudflare.com
FRONTEND_ORIGIN=https://FRONTEND-URL.trycloudflare.com
ADMIN_REFRESH_COOKIE_SECURE=true
ADMIN_REFRESH_COOKIE_SAMESITE=none

# frontend/.env
NEXT_PUBLIC_BACKEND_URL=https://BACKEND-URL.trycloudflare.com
# Needed for pnpm dev — frontend and backend are on different hostnames so the
# backend URL alone is not enough to derive the allowed dev origin.
NEXT_PUBLIC_ALLOWED_DEV_ORIGIN=https://FRONTEND-URL.trycloudflare.com
```

> URLs are random and change every restart — you need to update both `.env` files each session. For stable hostnames, use a named tunnel with a Cloudflare domain (free account required).

---

## SameSite / Secure quick reference


| Setup                                 | `SECURE` | `SAMESITE` |
| ------------------------------------- | -------- | ---------- |
| localhost only                        | `false`  | *(omit)*   |
| LAN IP, plain HTTP                    | `false`  | *(omit)*   |
| Different domains, HTTPS              | `true`   | `none`     |
| Two cloudflared tunnels (different domains) | `true`   | `none`     |


