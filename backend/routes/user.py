from __future__ import annotations

from fastapi import APIRouter

from routes.stubs import unimplemented
from schemas.user import QuizResultsRequest, QuizResultsResponse
from services.quiz_results import calculate_quiz_results

router = APIRouter(tags=["user"])


@router.post("/results", response_model=QuizResultsResponse)
async def quiz_results(payload: QuizResultsRequest) -> QuizResultsResponse:
    return calculate_quiz_results(payload)


@router.post("/{quiz_id}/join")
async def quiz_join(quiz_id: str) -> None:
    unimplemented()


@router.post("/{quiz_id}/submit")
async def quiz_submit(quiz_id: str) -> None:
    unimplemented()
