"""Admin quiz routes (CRUD over KQF storage)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field

from core import settings
from schemas.admin_quiz import (
    AdminQuizDetailResponse,
    AdminQuizListItemResponse,
    AdminQuizSaveResponse,
    AdminQuizUpsertPayload,
    QuizAssetUploadResponse,
)
from security.admin_auth import require_admin
from services.quiz_files import safe_quiz_media_file_path
from services.storage import get_storage, quiz_dir_for
from services.admin_quiz import (
    activate_quiz,
    block_session_nickname,
    create_quiz,
    delete_quiz,
    export_quiz_zip,
    get_quiz,
    get_session_snapshot,
    import_quiz_zip,
    list_quizzes,
    stop_quiz,
    update_quiz,
)
from services.media_assets import upload_asset


async def _read_upload_capped(file: UploadFile, max_bytes: int) -> bytes:
    """Read multipart upload in chunks; abort if total exceeds max_bytes."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(settings.UPLOAD_CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            mb = max_bytes // (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"Archiwum przekracza maksymalny rozmiar ({mb} MB).",
            )
        chunks.append(chunk)
    return b"".join(chunks)


router = APIRouter(
    tags=["admin-quiz"],
    dependencies=[Depends(require_admin)],
)


class ActivateResponse(BaseModel):
    pin: str
    join_url: str
    started_at: str


class BlockBody(BaseModel):
    nickname: str = Field(min_length=1)


@router.post("/quiz", response_model=AdminQuizSaveResponse)
async def admin_quiz_create(
    request: Request,
    payload: AdminQuizUpsertPayload,
) -> AdminQuizSaveResponse:
    result = await run_in_threadpool(create_quiz, request.app, payload)
    return AdminQuizSaveResponse(id=result["id"])


@router.get("/quiz/all", response_model=list[AdminQuizListItemResponse])
async def admin_quiz_list_all(
    request: Request,
) -> list[AdminQuizListItemResponse]:
    return await run_in_threadpool(list_quizzes, request.app)


@router.get("/quiz/{quiz_id}/media/{filename:path}")
async def admin_quiz_media(
    request: Request, quiz_id: str, filename: str
) -> FileResponse:
    """Serve quiz-owned media for the editor; does not require an active play session."""
    paths = get_storage(request.app)
    qd = quiz_dir_for(paths, quiz_id)
    resolved = safe_quiz_media_file_path(qd, filename)
    if resolved is None:
        raise HTTPException(status_code=404, detail="not_found")
    return FileResponse(resolved)


@router.get("/quiz/{quiz_id}", response_model=AdminQuizDetailResponse)
async def admin_quiz_get(request: Request, quiz_id: str) -> AdminQuizDetailResponse:
    return await run_in_threadpool(get_quiz, request.app, quiz_id)


@router.put("/quiz/{quiz_id}", response_model=AdminQuizSaveResponse)
async def admin_quiz_update(
    request: Request,
    quiz_id: str,
    payload: AdminQuizUpsertPayload,
) -> AdminQuizSaveResponse:
    result = await run_in_threadpool(update_quiz, request.app, quiz_id, payload)
    return AdminQuizSaveResponse(id=result["id"])


@router.delete("/quiz/{quiz_id}", status_code=204)
async def admin_quiz_delete(request: Request, quiz_id: str) -> None:
    await run_in_threadpool(delete_quiz, request.app, quiz_id)


@router.post("/assets", response_model=QuizAssetUploadResponse)
async def admin_asset_upload(
    request: Request,
    file: UploadFile = File(...),
) -> QuizAssetUploadResponse:
    return await upload_asset(request.app, file)


@router.post("/quiz/{quiz_id}/activate", response_model=ActivateResponse)
async def admin_quiz_activate(request: Request, quiz_id: str) -> ActivateResponse:
    data = await run_in_threadpool(activate_quiz, request.app, quiz_id)
    return ActivateResponse(**data)


@router.post("/quiz/{quiz_id}/stop")
async def admin_quiz_stop(request: Request, quiz_id: str) -> dict[str, str]:
    return await run_in_threadpool(stop_quiz, request.app, quiz_id)


@router.get("/quiz/{quiz_id}/session")
async def admin_quiz_session(quiz_id: str) -> dict:
    return await run_in_threadpool(get_session_snapshot, quiz_id)


@router.post("/quiz/{quiz_id}/session/block")
async def admin_quiz_session_block(quiz_id: str, body: BlockBody) -> dict[str, bool]:
    await run_in_threadpool(block_session_nickname, quiz_id, body.nickname)
    return {"blocked": True}


@router.get("/quiz/{quiz_id}/export")
async def admin_quiz_export(request: Request, quiz_id: str) -> Response:
    data, filename = await run_in_threadpool(export_quiz_zip, request.app, quiz_id)
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/quiz/import", response_model=AdminQuizSaveResponse)
async def admin_quiz_import(
    request: Request, file: UploadFile = File(...)
) -> AdminQuizSaveResponse:
    raw = await _read_upload_capped(file, settings.MAX_QUIZ_IMPORT_ZIP_BYTES)
    result = await run_in_threadpool(import_quiz_zip, request.app, raw)
    return AdminQuizSaveResponse(id=result["id"])
