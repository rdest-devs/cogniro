"""Admin quiz routes (CRUD, leaderboard, block nickname)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Request, UploadFile

from routes.stubs import unimplemented
from schemas.admin_quiz import AdminQuizUpsertPayload, QuizAssetUploadResponse
from security.admin_auth import require_admin
from services.admin_quiz import create_quiz, get_quiz, list_quizzes, update_quiz
from services.media_assets import upload_asset

router = APIRouter(
    tags=["admin-quiz"],
    dependencies=[Depends(require_admin)],
)


@router.post("/")
async def admin_root() -> None:
    unimplemented()


@router.post("/quiz")
async def admin_quiz_create(
    request: Request,
    payload: AdminQuizUpsertPayload,
) -> dict[str, str]:
    return create_quiz(request.app, payload)


@router.get("/quiz/all")
async def admin_quiz_list_all(request: Request) -> list[dict]:
    return list_quizzes(request.app)


@router.get("/quiz/{quiz_id}")
async def admin_quiz_get(request: Request, quiz_id: str) -> dict:
    return get_quiz(request.app, quiz_id)


@router.get("/quiz/{quiz_id}/leaderboard")
async def admin_quiz_leaderboard(quiz_id: str) -> None:
    unimplemented()


@router.patch("/quiz/{quiz_id}/nickname/{nickname}/block")
async def admin_quiz_block_nickname(quiz_id: str, nickname: str) -> None:
    unimplemented()


@router.put("/quiz/{quiz_id}")
async def admin_quiz_update(
    request: Request,
    quiz_id: str,
    payload: AdminQuizUpsertPayload,
) -> dict[str, str]:
    return update_quiz(request.app, quiz_id, payload)


@router.delete("/quiz/{quiz_id}")
async def admin_quiz_delete(quiz_id: str) -> None:
    unimplemented()


@router.post("/assets", response_model=QuizAssetUploadResponse)
async def admin_asset_upload(
    request: Request,
    file: UploadFile = File(...),
) -> QuizAssetUploadResponse:
    return await upload_asset(request.app, file)
