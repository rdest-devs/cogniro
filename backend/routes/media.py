from __future__ import annotations

from pathlib import Path, PurePosixPath

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from core.settings import MEDIA_PUBLIC_PREFIX
from services import sessions
from services.media_assets import serve_asset
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
        raise HTTPException(status_code=403, detail="quiz_not_running")
    rel = PurePosixPath(filename)
    if rel.is_absolute() or any(p in {"..", "."} for p in rel.parts):
        raise HTTPException(status_code=404, detail="not_found")
    paths = get_storage(request.app)
    base = (quiz_dir_for(paths, quiz_id) / "media").resolve()
    target = (base / Path(*rel.parts)).resolve()
    try:
        target.relative_to(base)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="not_found") from exc
    if not target.is_file():
        raise HTTPException(status_code=404, detail="not_found")
    for parent in [target, *target.parents]:
        if parent == base:
            break
        if parent.is_symlink():
            raise HTTPException(status_code=404, detail="not_found")
    return FileResponse(target)
