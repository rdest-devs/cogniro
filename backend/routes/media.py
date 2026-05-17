from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from core.settings import MEDIA_PUBLIC_PREFIX
from services import sessions
from services.media_assets import serve_asset
from services.quiz_files import safe_quiz_media_file_path
from services.storage import get_storage, quiz_dir_for

router = APIRouter(tags=["media"])


@router.get(f"{MEDIA_PUBLIC_PREFIX}/{{asset_path:path}}")
async def serve_quiz_asset(request: Request, asset_path: str) -> FileResponse:
    return serve_asset(request.app, asset_path)


@router.get("/media/{quiz_id}/{filename:path}")
async def serve_quiz_media(
    request: Request, quiz_id: str, filename: str
) -> FileResponse:
    if not sessions.is_quiz_running(quiz_id):
        raise HTTPException(status_code=403, detail="quiz_not_active")
    paths = get_storage(request.app)
    qd = quiz_dir_for(paths, quiz_id)
    resolved = safe_quiz_media_file_path(qd, filename)
    if resolved is None:
        raise HTTPException(status_code=404, detail="not_found")
    return FileResponse(resolved)
