"""Participant play API (PIN-based join + score submit)."""

from __future__ import annotations

import os
from typing import Annotated

from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, StringConstraints

from schemas.kqf import KqfQuestion, KqfQuiz
from services import sessions
from services.admin_quiz import check_availability
from services.kqf import KqfParseError
from services.play_rate_limit import enforce_play_rate_limit
from services.profanity import is_nickname_allowed
from services.quiz_files import (
    kqf_with_absolute_media,
    max_points_from_quiz_dir,
    read_meta_or_rebuild,
    read_quiz_kqf,
)
from services.storage import get_storage, quiz_dir_for

router = APIRouter(prefix="/play", tags=["play"])

Nickname = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=128)
]


class JoinBody(BaseModel):
    nickname: Nickname


class SubmitBody(BaseModel):
    nickname: Nickname
    score: int = Field(ge=0)


def _apply_session_shuffle(quiz: KqfQuiz, pin: str) -> KqfQuiz:
    """Reorder quiz questions according to the session shuffle (thread-pool only)."""
    shuffled_ids = sessions.get_or_create_session_shuffle(
        pin, [q.id for q in quiz.questions]
    )
    order = {qid: i for i, qid in enumerate(shuffled_ids)}
    sorted_questions: list[KqfQuestion] = sorted(
        quiz.questions, key=lambda q: order.get(q.id, 999)
    )
    return quiz.model_copy(update={"questions": sorted_questions})


def _origin_from(request: Request) -> str:
    """Base URL for rewriting relative quiz media paths on join.

    Uses ``MEDIA_ABSOLUTE_ORIGIN`` when set (e.g. public API URL behind a proxy);
    otherwise ``{scheme}://{netloc}`` from the incoming request.
    """
    explicit = os.getenv("MEDIA_ABSOLUTE_ORIGIN")
    if explicit:
        return explicit.rstrip("/")
    return f"{request.url.scheme}://{request.url.netloc}"


async def _resolve_pin_availability(pin: str, request: Request) -> sessions.QuizSession:
    """Raise HTTPException if pin inactive or quiz unavailable. Return live session."""
    session = sessions.lookup_by_pin(pin)
    if session is None:
        raise HTTPException(status_code=404, detail="pin_not_active")
    paths = get_storage(request.app)
    try:
        meta = await run_in_threadpool(
            read_meta_or_rebuild, quiz_dir_for(paths, session.quiz_id), session.quiz_id
        )
    except (OSError, KqfParseError):
        raise HTTPException(status_code=404, detail="pin_not_active") from None
    available, reason = check_availability(meta)
    if not available:
        if reason == "not_yet":
            raise HTTPException(
                status_code=423,
                detail={"code": "not_yet", "opens_at": meta.schedule_start},
            )
        if reason == "expired":
            raise HTTPException(status_code=410, detail="expired")
        raise HTTPException(status_code=403, detail="manually_closed")
    return session


@router.get("/{pin}/check")
async def play_check(pin: str, request: Request) -> dict[str, str]:
    """Check PIN availability without registering a participant."""
    enforce_play_rate_limit(request)
    await _resolve_pin_availability(pin, request)
    return {"status": "available"}


@router.post("/{pin}/join", response_model=KqfQuiz)
async def play_join(pin: str, body: JoinBody, request: Request) -> KqfQuiz:
    enforce_play_rate_limit(request)
    session = await _resolve_pin_availability(pin, request)
    if not is_nickname_allowed(body.nickname):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "nickname_profanity",
                "detail_pl": (
                    "Ten pseudonim zawiera niedozwolone słowa. Wybierz inny."
                ),
            },
        )
    try:
        await run_in_threadpool(
            sessions.register_participant, pin=pin, nickname=body.nickname
        )
    except sessions.NicknameTakenError:
        raise HTTPException(status_code=409, detail="nickname_taken") from None
    except LookupError:
        raise HTTPException(status_code=404, detail="pin_not_active") from None

    paths = get_storage(request.app)
    quiz = await run_in_threadpool(read_quiz_kqf, quiz_dir_for(paths, session.quiz_id))

    fm = quiz.front_matter
    if fm.shuffle_questions and fm.shuffle_mode == "session":
        try:
            quiz = await run_in_threadpool(_apply_session_shuffle, quiz, pin)
        except LookupError:
            raise HTTPException(status_code=404, detail="pin_not_active") from None

    return kqf_with_absolute_media(quiz, session.quiz_id, _origin_from(request))


@router.post("/{pin}/submit")
async def play_submit(pin: str, body: SubmitBody, request: Request) -> dict:
    """Accept a final score for a joined participant.

    On nickname violation (unknown nickname or blocked), responds with **400** and
    JSON body ``{"detail": {"error": "nickname_violation", "detail_pl": "..."}}``
    (FastAPI ``HTTPException`` wraps the dict under ``detail``).

    The client-supplied score is clamped to the quiz's max points server-side so
    a tampered client cannot inflate results.
    """
    enforce_play_rate_limit(request)
    session = sessions.lookup_by_pin(pin)
    if session is None:
        raise HTTPException(status_code=404, detail="pin_not_active")
    paths = get_storage(request.app)
    qd = quiz_dir_for(paths, session.quiz_id)
    max_score = await run_in_threadpool(max_points_from_quiz_dir, qd)
    score = min(body.score, max_score) if max_score > 0 else body.score
    try:
        await run_in_threadpool(
            sessions.record_submission,
            pin=pin,
            nickname=body.nickname,
            score=score,
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="pin_not_active") from None
    except sessions.NicknameViolationError:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "nickname_violation",
                "detail_pl": (
                    "Twój pseudonim narusza zasady i wynik nie zostanie zapisany."
                ),
            },
        ) from None
    return {"accepted": True}
