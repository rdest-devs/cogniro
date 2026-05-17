"""Admin quiz routes (CRUD over KQF storage)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Request, UploadFile
from fastapi.concurrency import run_in_threadpool

from schemas.admin_quiz import (
    AdminQuizDetailResponse,
    AdminQuizListItemResponse,
    AdminQuizSaveResponse,
    AdminQuizUpsertPayload,
    QuizAssetUploadResponse,
)
from security.admin_auth import require_admin
from services.admin_quiz import (
    create_quiz,
    delete_quiz,
    get_quiz,
    list_quizzes,
    update_quiz,
)
from services.media_assets import upload_asset

router = APIRouter(
    tags=["admin-quiz"],
    dependencies=[Depends(require_admin)],
)


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
