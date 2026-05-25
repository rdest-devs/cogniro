"""DEPRECATED — POST /legacy/quiz-demo/results; remove with the /quiz-demo demo flow."""

from __future__ import annotations

from fastapi import APIRouter

from legacy.quiz_demo_service import calculate_quiz_results
from schemas.user import QuizResultsRequest, QuizResultsResponse

router = APIRouter(prefix="/legacy/quiz-demo", tags=["legacy"])


@router.post("/results", response_model=QuizResultsResponse)
async def legacy_quiz_demo_results(
    body: QuizResultsRequest,
) -> QuizResultsResponse:
    return calculate_quiz_results(body)
