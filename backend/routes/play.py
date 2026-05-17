"""Participant play API (PIN-based join + score submit)."""

from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from schemas.kqf import KqfQuiz
from services import sessions
from services.play_rate_limit import enforce_play_rate_limit
from services.quiz_files import kqf_with_absolute_media, read_quiz_kqf
from services.storage import get_storage, quiz_dir_for

router = APIRouter(prefix="/play", tags=["play"])


class JoinBody(BaseModel):
    nickname: str = Field(min_length=1, max_length=40)


class SubmitBody(BaseModel):
    nickname: str = Field(min_length=1, max_length=40)
    score: int = Field(ge=0)


def _origin_from(request: Request) -> str:
    """Base URL for rewriting relative quiz media paths on join.

    Uses ``MEDIA_ABSOLUTE_ORIGIN`` when set (e.g. public API URL behind a proxy);
    otherwise ``{scheme}://{netloc}`` from the incoming request.
    """
    explicit = os.getenv("MEDIA_ABSOLUTE_ORIGIN")
    if explicit:
        return explicit.rstrip("/")
    return f"{request.url.scheme}://{request.url.netloc}"


@router.post("/{pin}/join", response_model=KqfQuiz)
async def play_join(pin: str, body: JoinBody, request: Request) -> KqfQuiz:
    enforce_play_rate_limit(request)
    session = sessions.lookup_by_pin(pin)
    if session is None:
        raise HTTPException(status_code=404, detail="pin_not_active")
    try:
        await run_in_threadpool(
            sessions.register_participant, pin=pin, nickname=body.nickname
        )
    except sessions.NicknameTakenError:
        raise HTTPException(status_code=409, detail="nickname_taken") from None

    paths = get_storage(request.app)
    quiz = await run_in_threadpool(read_quiz_kqf, quiz_dir_for(paths, session.quiz_id))
    return kqf_with_absolute_media(quiz, session.quiz_id, _origin_from(request))


@router.post("/{pin}/submit")
async def play_submit(pin: str, body: SubmitBody, request: Request) -> dict:
    """Accept a final score for a joined participant.

    On nickname violation (unknown nickname or blocked), responds with **400** and
    JSON body ``{"detail": {"error": "nickname_violation", "detail_pl": "..."}}``
    (FastAPI ``HTTPException`` wraps the dict under ``detail``).
    """
    enforce_play_rate_limit(request)
    try:
        await run_in_threadpool(
            sessions.record_submission,
            pin=pin,
            nickname=body.nickname,
            score=body.score,
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
    except sessions.AlreadySubmittedError:
        raise HTTPException(status_code=409, detail="already_submitted") from None
    return {"accepted": True}
