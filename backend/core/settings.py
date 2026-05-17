from __future__ import annotations

import os

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
UPLOAD_CHUNK_SIZE = 64 * 1024
ALLOWED_UPLOAD_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
DEFAULT_DATA_DIR = "/var/lib/cogniro"
DEFAULT_MEDIA_PUBLIC_PREFIX = "/media/quiz-assets"


def normalize_media_public_prefix(prefix: str | None) -> str:
    raw = (prefix or DEFAULT_MEDIA_PUBLIC_PREFIX).strip()
    normalized = raw if raw.startswith("/") else f"/{raw}"
    return normalized.rstrip("/") or DEFAULT_MEDIA_PUBLIC_PREFIX


MEDIA_PUBLIC_PREFIX = normalize_media_public_prefix(os.getenv("MEDIA_PUBLIC_PREFIX"))


def _env_int(key: str, default: int) -> int:
    raw = os.getenv(key)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


RESULT_RETENTION_DAYS = _env_int("RESULT_RETENTION_DAYS", 30)
PURGE_INTERVAL_SECONDS = _env_int("PURGE_INTERVAL_SECONDS", 3600)

# --- Admin quiz ZIP import (POST /admin/quiz/import) ---
# Upload body hard limit (defense against huge multipart bodies).
MAX_QUIZ_IMPORT_ZIP_BYTES = _env_int("MAX_QUIZ_IMPORT_ZIP_BYTES", 100 * 1024 * 1024)
# Max size of quiz.kqf when read from the archive (text; keep generous).
MAX_QUIZ_IMPORT_KQF_BYTES = _env_int("MAX_QUIZ_IMPORT_KQF_BYTES", 2 * 1024 * 1024)
# Per extracted media member (uncompressed bytes written to disk).
MAX_QUIZ_IMPORT_MEMBER_BYTES = _env_int(
    "MAX_QUIZ_IMPORT_MEMBER_BYTES", 100 * 1024 * 1024
)
# Total uncompressed bytes extracted in one import (KQF + all media).
MAX_QUIZ_IMPORT_UNCOMPRESSED_TOTAL_BYTES = _env_int(
    "MAX_QUIZ_IMPORT_UNCOMPRESSED_TOTAL_BYTES", 300 * 1024 * 1024
)


def env_bool(key: str, default: bool) -> bool:
    raw = os.getenv(key)
    if raw is None:
        return default

    value = raw.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    return default


PLAY_RATE_LIMIT_TRUST_X_FORWARDED_FOR = env_bool(
    "PLAY_RATE_LIMIT_TRUST_X_FORWARDED_FOR", False
)
PLAY_RATE_LIMIT_ENABLED = env_bool("PLAY_RATE_LIMIT_ENABLED", True)
PLAY_RATE_LIMIT_WINDOW_SEC = _env_int("PLAY_RATE_LIMIT_WINDOW_SEC", 60)
PLAY_RATE_LIMIT_MAX_REQUESTS = _env_int("PLAY_RATE_LIMIT_MAX_REQUESTS", 120)
