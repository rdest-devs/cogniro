"""Admin auth routes (login, logout)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from schemas.admin_auth import (
    AdminLoginRequest,
    AdminLogoutResponse,
    AdminTokenResponse,
)
from security.admin_auth import (
    create_access_token,
    require_admin,
    revoke_token_jti,
    verify_password,
)

router = APIRouter(tags=["admin-auth"])


@router.post("/auth/login", response_model=AdminTokenResponse)
async def admin_auth_login(body: AdminLoginRequest) -> AdminTokenResponse:
    if not verify_password(body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_password",
        )
    token, expires_in = create_access_token()
    return AdminTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
    )


@router.post("/auth/logout", response_model=AdminLogoutResponse)
async def admin_auth_logout(
    claims: Annotated[dict, Depends(require_admin)],
) -> AdminLogoutResponse:
    jti = claims.get("jti")
    if isinstance(jti, str):
        revoke_token_jti(jti)
    return AdminLogoutResponse(ok=True)
