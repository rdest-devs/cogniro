"""Nickname validation."""

from fastapi import APIRouter

from routes.stubs import unimplemented

router = APIRouter(tags=["nick"])


@router.post("/validate-nick")
async def validate_nick() -> None:
    unimplemented()
