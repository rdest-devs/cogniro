"""Admin auth routes (login, logout)."""

from fastapi import APIRouter

from routes.stubs import unimplemented

router = APIRouter(tags=["admin-auth"])


@router.post("/auth/login")
async def admin_auth_login() -> None:
    unimplemented()


@router.post("/auth/logout")
async def admin_auth_logout() -> None:
    unimplemented()
