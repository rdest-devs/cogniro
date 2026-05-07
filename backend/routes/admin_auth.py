"""Admin auth routes (login, logout)."""

import asyncio

from fastapi import APIRouter, HTTPException, Request, Response, status

from schemas.admin_auth import (
    AdminLoginRequest,
    AdminLogoutResponse,
    AdminTokenResponse,
)
from security.admin_auth import (
    REFRESH_COOKIE_NAME,
    clear_refresh_cookie,
    create_access_token,
    create_refresh_token,
    decode_admin_token,
    revoke_token_jti,
    set_refresh_cookie,
    verify_password,
)

router = APIRouter(tags=["admin-auth"])


@router.post("/auth/login", response_model=AdminTokenResponse)
async def admin_auth_login(
    body: AdminLoginRequest,
    response: Response,
) -> AdminTokenResponse:
    if not await asyncio.to_thread(verify_password, body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_password",
        )
    token, expires_in = create_access_token()
    refresh_token, refresh_max_age = create_refresh_token()
    response.set_cookie(**set_refresh_cookie(refresh_token, refresh_max_age))
    return AdminTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
    )


@router.post("/auth/refresh", response_model=AdminTokenResponse)
async def admin_auth_refresh(
    request: Request,
    response: Response,
) -> AdminTokenResponse:
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing_refresh_token",
        )

    refresh_claims = decode_admin_token(refresh_token, expected_type="refresh")
    revoke_token_jti(refresh_claims["jti"], refresh_claims.get("exp"))
    access_token, access_expires_in = create_access_token()
    rotated_refresh_token, refresh_max_age = create_refresh_token()
    response.set_cookie(**set_refresh_cookie(rotated_refresh_token, refresh_max_age))
    return AdminTokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=access_expires_in,
    )


@router.post("/auth/logout", response_model=AdminLogoutResponse)
async def admin_auth_logout(
    request: Request,
    response: Response,
) -> AdminLogoutResponse:
    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() == "bearer" and token:
        try:
            claims = decode_admin_token(token, expected_type="access")
        except HTTPException:
            pass
        else:
            revoke_token_jti(claims["jti"], claims.get("exp"))

    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token:
        try:
            refresh_claims = decode_admin_token(refresh_token, expected_type="refresh")
        except HTTPException:
            pass
        else:
            revoke_token_jti(refresh_claims["jti"], refresh_claims.get("exp"))

    response.delete_cookie(**clear_refresh_cookie())
    return AdminLogoutResponse(ok=True)
