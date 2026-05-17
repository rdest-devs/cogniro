"""Admin quiz routes (CRUD over KQF storage)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from schemas.admin_quiz import (
    AdminQuizDetailResponse,
    AdminQuizListItemResponse,
    AdminQuizSaveResponse,
    AdminQuizUpsertPayload,
    QuizAssetUploadResponse,
)
from security.admin_auth import require_admin
from services.admin_quiz import (
    activate_quiz,
    block_session_nickname,
    create_quiz,
    delete_quiz,
    get_quiz,
    get_session_snapshot,
    list_quizzes,
    stop_quiz,
    update_quiz,
)
from services.media_assets import upload_asset

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
