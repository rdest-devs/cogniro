"""Admin password verification, JWT issuance, and token revocation."""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_password_hash: bytes | None = None
_jwt_secret: str | None = None
# Keep admin tokens short-lived because logout revocation is process-local.
_jwt_expire_minutes: int = 15
_refresh_expire_days: int = 7
# Single-server revocation cache; cleared on restart and not shared across workers.
_revoked_jtis: set[str] = set()
REFRESH_COOKIE_NAME = "admin_refresh_token"
_REFRESH_COOKIE_PATH = "/admin/auth"

security = HTTPBearer(auto_error=False)


def reload_admin_auth_config() -> None:
    """Load admin auth configuration values from environment variables.

    Behavior summary:
    - Reads `ADMIN_PASSWORD` and hashes it in memory.
    - Reads `JWT_SECRET` for signing and verifying admin tokens.
    - Reads `JWT_EXPIRE_MINUTES` for short-lived access tokens.
    - Reads `ADMIN_REFRESH_EXPIRE_DAYS` for refresh-token cookie lifetime.
    """
    global _password_hash, _jwt_secret, _jwt_expire_minutes, _refresh_expire_days

    raw_pw = (os.getenv("ADMIN_PASSWORD") or "").strip()
    if raw_pw:
        _password_hash = bcrypt.hashpw(
            raw_pw.encode("utf-8"),
            bcrypt.gensalt(),
        )
    else:
        _password_hash = None

    _jwt_secret = (os.getenv("JWT_SECRET") or "").strip() or None

    raw_minutes = os.getenv("JWT_EXPIRE_MINUTES", "15")
    try:
        _jwt_expire_minutes = int(raw_minutes)
    except ValueError:
        _jwt_expire_minutes = 15
    if _jwt_expire_minutes < 1:
        _jwt_expire_minutes = 15

    raw_refresh_days = os.getenv("ADMIN_REFRESH_EXPIRE_DAYS", "7")
    try:
        _refresh_expire_days = int(raw_refresh_days)
    except ValueError:
        _refresh_expire_days = 7
    if _refresh_expire_days < 1:
        _refresh_expire_days = 7


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
    - `access` tokens are accepted for protected admin routes and checked
      against in-memory revocation via `jti`.
    - `refresh` tokens are accepted for refresh endpoint logic.
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
    if expected_type == "access" and jti in _revoked_jtis:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="token_revoked",
        )
    return payload


def revoke_token_jti(jti: str) -> None:
    """Mark an access-token `jti` as revoked for this process lifetime."""
    _revoked_jtis.add(jti)


def set_refresh_cookie(token: str, max_age_seconds: int) -> dict[str, object]:
    """Return refresh-cookie parameters used by login/refresh endpoints."""
    return {
        "key": REFRESH_COOKIE_NAME,
        "value": token,
        "max_age": max_age_seconds,
        "httponly": True,
        "samesite": "lax",
        "secure": False,
        "path": _REFRESH_COOKIE_PATH,
    }


def clear_refresh_cookie() -> dict[str, object]:
    """Return refresh-cookie parameters used to clear the cookie on logout."""
    return {
        "key": REFRESH_COOKIE_NAME,
        "path": _REFRESH_COOKIE_PATH,
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
