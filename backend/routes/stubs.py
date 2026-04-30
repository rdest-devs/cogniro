"""Shared helpers for placeholder routes."""

from fastapi import HTTPException


def unimplemented() -> None:
    raise HTTPException(status_code=501, detail="unimplemented")
