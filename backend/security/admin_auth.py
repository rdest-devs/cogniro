"""Admin password verification, JWT issuance, and token revocation."""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_password_hash: bytes | None = None
_jwt_secret: str | None = None
# Keep admin tokens short-lived because logout revocation is process-local.
_JWT_EXPIRE_MINUTES_DEFAULT = 15
_JWT_EXPIRE_MINUTES_MAX = 60
_jwt_expire_minutes: int = 15
_REFRESH_EXPIRE_DAYS_DEFAULT = 7
_REFRESH_EXPIRE_DAYS_MAX = 30
_refresh_expire_days: int = 7
_REVOCATION_FALLBACK_TTL_SECONDS = int(
    timedelta(days=_REFRESH_EXPIRE_DAYS_MAX).total_seconds()
)
# When true, refresh token is only sent over HTTPS (set in production).
_refresh_cookie_secure: bool = False
# lax | strict | none — use none for separate-site frontends (requires Secure; enforced below).
_refresh_cookie_samesite: str = "lax"
_ALLOWED_REFRESH_COOKIE_SAMESITE = frozenset({"lax", "strict", "none"})
# Single-server revocation cache; cleared on restart and not shared across workers.
_revoked_jtis: dict[str, int] = {}
REFRESH_COOKIE_NAME = "admin_refresh_token"
_REFRESH_COOKIE_PATH = "/admin/auth"

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


def _is_dev_environment() -> bool:
    """True when `ENVIRONMENT` or `ENV` names a non-production-like stage (default: dev)."""
    raw = (
        (os.getenv("ENVIRONMENT") or os.getenv("ENV") or "development").strip().lower()
    )
    return raw in {"development", "dev", "local", "test"}


def reload_admin_auth_config() -> None:
    """Load admin auth configuration values from environment variables.

    Behavior summary:
    - Reads `ADMIN_PASSWORD_HASH`, a precomputed bcrypt hash.
    - Reads `JWT_SECRET` for signing and verifying admin tokens.
    - Reads `JWT_EXPIRE_MINUTES` for short-lived access tokens.
    - Reads `ADMIN_REFRESH_EXPIRE_DAYS` for refresh-token cookie lifetime.
    - Reads `ADMIN_REFRESH_COOKIE_SECURE` for the refresh cookie `Secure` flag.
    - Reads `ADMIN_REFRESH_COOKIE_SAMESITE` (`lax`, `strict`, or `none`) for cross-site
      cookie behavior. `none` implies `Secure` and enables cross-origin POSTs when the
      frontend and API are on different sites (e.g. app.example.com vs api.example.com).

    Logs a warning when `ADMIN_PASSWORD_HASH` or `JWT_SECRET` is unset. In a
    non-development environment (see `ENVIRONMENT` / `ENV`), startup fails fast
    instead so misconfigured deploys do not silently serve broken admin auth.
    """
    global _password_hash, _jwt_secret, _jwt_expire_minutes
    global _refresh_expire_days, _refresh_cookie_secure, _refresh_cookie_samesite

    raw_password_hash = os.getenv("ADMIN_PASSWORD_HASH")
    _password_hash = raw_password_hash.encode("utf-8") if raw_password_hash else None

    raw_jwt_secret = os.getenv("JWT_SECRET")
    _jwt_secret = raw_jwt_secret if raw_jwt_secret else None

    raw_minutes = os.getenv("JWT_EXPIRE_MINUTES", "15")
    try:
        _jwt_expire_minutes = int(raw_minutes)
    except ValueError:
        _jwt_expire_minutes = _JWT_EXPIRE_MINUTES_DEFAULT
    if _jwt_expire_minutes < 1:
        _jwt_expire_minutes = _JWT_EXPIRE_MINUTES_DEFAULT
    if _jwt_expire_minutes > _JWT_EXPIRE_MINUTES_MAX:
        _jwt_expire_minutes = _JWT_EXPIRE_MINUTES_MAX

    raw_refresh_days = os.getenv("ADMIN_REFRESH_EXPIRE_DAYS", "7")
    try:
        _refresh_expire_days = int(raw_refresh_days)
    except ValueError:
        _refresh_expire_days = _REFRESH_EXPIRE_DAYS_DEFAULT
    if _refresh_expire_days < 1:
        _refresh_expire_days = _REFRESH_EXPIRE_DAYS_DEFAULT
    if _refresh_expire_days > _REFRESH_EXPIRE_DAYS_MAX:
        _refresh_expire_days = _REFRESH_EXPIRE_DAYS_MAX

    raw_secure = (os.getenv("ADMIN_REFRESH_COOKIE_SECURE") or "").strip().lower()
    _refresh_cookie_secure = raw_secure in {"1", "true", "yes", "on"}

    raw_samesite = (os.getenv("ADMIN_REFRESH_COOKIE_SAMESITE") or "").strip().lower()
    if not raw_samesite:
        _refresh_cookie_samesite = "lax"
    elif raw_samesite in _ALLOWED_REFRESH_COOKIE_SAMESITE:
        _refresh_cookie_samesite = raw_samesite
    else:
        logger.warning(
            "Invalid ADMIN_REFRESH_COOKIE_SAMESITE=%r; allowed: lax, strict, none. "
            "Using lax.",
            os.getenv("ADMIN_REFRESH_COOKIE_SAMESITE"),
        )
        _refresh_cookie_samesite = "lax"

    if _refresh_cookie_samesite == "none" and not _refresh_cookie_secure:
        logger.warning(
            "SameSite=None requires Secure; enabling ADMIN_REFRESH_COOKIE_SECURE "
            "for the admin refresh cookie."
        )
        _refresh_cookie_secure = True

    missing: list[str] = []
    if _password_hash is None:
        missing.append("ADMIN_PASSWORD_HASH")
    if _jwt_secret is None:
        missing.append("JWT_SECRET")
    if missing:
        joined = ", ".join(missing)
        logger.warning(
            "Admin auth misconfigured: missing %s. "
            "Login will return 401 invalid_password or 503 jwt_not_configured until set.",
            joined,
        )
        if not _is_dev_environment():
            msg = (
                f"Refusing to start: missing required admin auth env vars ({joined}). "
                "Set them or use ENVIRONMENT=development for local-only runs."
            )
            raise RuntimeError(msg)


def verify_password(plain: str) -> bool:
    if _password_hash is None:
        return False
    try:
        return bcrypt.checkpw(
            plain.encode("utf-8"),
            _password_hash,
        )
    except ValueError:
        return False


def create_access_token() -> tuple[str, int]:
    """Issue a short-lived admin access token used on protected admin API routes."""
    if not _jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="jwt_not_configured",
        )
    jti = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=_jwt_expire_minutes)
    payload = {
        "sub": "admin",
        "typ": "access",
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": exp,
    }
    token = jwt.encode(payload, _jwt_secret, algorithm="HS256")
    expires_in = int(timedelta(minutes=_jwt_expire_minutes).total_seconds())
    return token, expires_in


def create_refresh_token() -> tuple[str, int]:
    """Issue a refresh token used to renew access tokens without re-entering password."""
    if not _jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="jwt_not_configured",
        )
    jti = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=_refresh_expire_days)
    payload = {
        "sub": "admin",
        "typ": "refresh",
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": exp,
    }
    token = jwt.encode(payload, _jwt_secret, algorithm="HS256")
    expires_in = int(timedelta(days=_refresh_expire_days).total_seconds())
    return token, expires_in


def decode_admin_token(token: str, *, expected_type: str = "access") -> dict:
    """Decode and validate an admin JWT.

    `expected_type` must match the token `typ` claim:
    - `access` tokens are accepted for protected admin routes.
    - `refresh` tokens are accepted for refresh endpoint logic.
    Both token types are checked against in-memory revocation via `jti`.
    """
    if not _jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="jwt_not_configured",
        )
    try:
        payload = jwt.decode(
            token,
            _jwt_secret,
            algorithms=["HS256"],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="token_expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token",
        )

    if payload.get("sub") != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_subject",
        )
    token_type = payload.get("typ")
    if token_type != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token_type",
        )
    jti = payload.get("jti")
    if not jti or not isinstance(jti, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token",
        )
    if _is_token_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="token_revoked",
        )
    return payload


def _jwt_exp_as_timestamp(exp: Any) -> int | None:
    if isinstance(exp, datetime):
        return int(exp.timestamp())
    if isinstance(exp, int):
        return exp
    return None


def _prune_revoked_jtis() -> None:
    now = int(datetime.now(timezone.utc).timestamp())
    expired_jtis = [
        revoked_jti
        for revoked_jti, expires_at in _revoked_jtis.items()
        if expires_at <= now
    ]
    for revoked_jti in expired_jtis:
        del _revoked_jtis[revoked_jti]


def _is_token_revoked(jti: str) -> bool:
    _prune_revoked_jtis()
    return jti in _revoked_jtis


def revoke_token_jti(jti: str, exp: Any) -> None:
    """Mark a token `jti` as revoked until the token's original expiry."""
    _prune_revoked_jtis()
    expires_at = _jwt_exp_as_timestamp(exp)
    if expires_at is None:
        logger.warning(
            "Invalid token exp while revoking jti %s: %r. Using fallback expiry.",
            jti,
            exp,
        )
        expires_at = int(
            (
                datetime.now(timezone.utc)
                + timedelta(seconds=_REVOCATION_FALLBACK_TTL_SECONDS)
            ).timestamp()
        )
    _revoked_jtis[jti] = expires_at


def set_refresh_cookie(token: str, max_age_seconds: int) -> dict[str, object]:
    """Return refresh-cookie parameters used by login/refresh endpoints."""
    return {
        "key": REFRESH_COOKIE_NAME,
        "value": token,
        "max_age": max_age_seconds,
        "httponly": True,
        "samesite": _refresh_cookie_samesite,
        "secure": _refresh_cookie_secure,
        "path": _REFRESH_COOKIE_PATH,
    }


def clear_refresh_cookie() -> dict[str, object]:
    """Return refresh-cookie parameters used to clear the cookie on logout."""
    return {
        "key": REFRESH_COOKIE_NAME,
        "path": _REFRESH_COOKIE_PATH,
        "httponly": True,
        "samesite": _refresh_cookie_samesite,
        "secure": _refresh_cookie_secure,
    }


async def require_admin(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(security),
    ],
) -> dict:
    """Require a valid admin bearer access token for protected endpoints."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing_token",
        )
    return decode_admin_token(credentials.credentials, expected_type="access")


def clear_revoked_tokens_for_tests() -> None:
    """Test-only: reset revocation set between tests."""
    _revoked_jtis.clear()
