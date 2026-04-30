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
_jwt_expire_minutes: int = 60
_revoked_jtis: set[str] = set()

security = HTTPBearer(auto_error=False)


def reload_admin_auth_config() -> None:
    """Load ADMIN_PASSWORD (hashed in memory), JWT_SECRET, and expiry from the environment."""
    global _password_hash, _jwt_secret, _jwt_expire_minutes

    raw_pw = (os.getenv("ADMIN_PASSWORD") or "").strip()
    if raw_pw:
        _password_hash = bcrypt.hashpw(
            raw_pw.encode("utf-8"),
            bcrypt.gensalt(),
        )
    else:
        _password_hash = None

    _jwt_secret = (os.getenv("JWT_SECRET") or "").strip() or None

    raw_minutes = os.getenv("JWT_EXPIRE_MINUTES", "60")
    try:
        _jwt_expire_minutes = int(raw_minutes)
    except ValueError:
        _jwt_expire_minutes = 60
    if _jwt_expire_minutes < 1:
        _jwt_expire_minutes = 60


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
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": exp,
    }
    token = jwt.encode(payload, _jwt_secret, algorithm="HS256")
    expires_in = int(timedelta(minutes=_jwt_expire_minutes).total_seconds())
    return token, expires_in


def decode_admin_token(token: str) -> dict:
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
    jti = payload.get("jti")
    if not jti or not isinstance(jti, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token",
        )
    if jti in _revoked_jtis:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="token_revoked",
        )
    return payload


def revoke_token_jti(jti: str) -> None:
    _revoked_jtis.add(jti)


async def require_admin(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(security),
    ],
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing_token",
        )
    return decode_admin_token(credentials.credentials)


def clear_revoked_tokens_for_tests() -> None:
    """Test-only: reset revocation set between tests."""
    _revoked_jtis.clear()
