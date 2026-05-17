from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse

from core.settings import MEDIA_PUBLIC_PREFIX
from services.media_assets import serve_asset

router = APIRouter(tags=["media"])


@router.get(f"{MEDIA_PUBLIC_PREFIX}/{{asset_path:path}}")
async def serve_quiz_asset(request: Request, asset_path: str) -> FileResponse:
    return serve_asset(request.app, asset_path)
