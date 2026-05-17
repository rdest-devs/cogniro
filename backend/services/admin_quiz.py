from __future__ import annotations

import shutil
from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, HTTPException

from schemas.admin_quiz import (
    AdminQuizDetailResponse,
    AdminQuizListItemResponse,
    AdminQuizUpsertPayload,
)
from services.admin_quiz_adapters import (
    kqf_to_admin_detail_payload,
    upsert_payload_to_kqf,
)
from services.quiz_files import (
    QuizMeta,
    read_meta_or_rebuild,
    read_quiz_kqf,
    write_quiz_dir,
)
from services.sessions import is_quiz_running
from services.storage import (
    QUIZ_WRITE_LOCK,
    generate_quiz_id,
    get_storage,
    quiz_dir_for,
)


def _now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def list_quizzes(app: FastAPI) -> list[AdminQuizListItemResponse]:
    paths = get_storage(app)
    if not paths.quizzes_dir.is_dir():
        return []
    items: list[AdminQuizListItemResponse] = []
    for quiz_dir in sorted(paths.quizzes_dir.iterdir()):
        if not quiz_dir.is_dir():
            continue
        meta = read_meta_or_rebuild(quiz_dir, quiz_dir.name)
        status: Literal["idle", "running"] = (
            "running" if is_quiz_running(quiz_dir.name) else "idle"
        )
        items.append(_meta_to_list_item(meta, status=status))
    return items


def _meta_to_list_item(
    meta: QuizMeta, *, status: Literal["idle", "running"]
) -> AdminQuizListItemResponse:
    return AdminQuizListItemResponse(
        id=meta.id,
        title=meta.title,
        status=status,  # type: ignore[arg-type]
        created_at=meta.created_at,
        last_activated_at=meta.last_activated_at,
        question_count=meta.question_count,
    )


def get_quiz(app: FastAPI, quiz_id: str) -> AdminQuizDetailResponse:
    paths = get_storage(app)
    qd = quiz_dir_for(paths, quiz_id)
    if not qd.is_dir():
        raise HTTPException(status_code=404, detail="Nie znaleziono quizu.")
    quiz = read_quiz_kqf(qd)
    meta = read_meta_or_rebuild(qd, quiz_id)
    status: Literal["idle", "running"] = (
        "running" if is_quiz_running(quiz_id) else "idle"
    )
    return kqf_to_admin_detail_payload(
        quiz,
        quiz_id=quiz_id,
        status=status,
        created_at=meta.created_at,
        updated_at=meta.updated_at,
        last_activated_at=meta.last_activated_at,
    )


def create_quiz(app: FastAPI, payload: AdminQuizUpsertPayload) -> dict[str, str]:
    paths = get_storage(app)
    quiz = upsert_payload_to_kqf(payload, existing=None)
    quiz_id = generate_quiz_id()
    qd = quiz_dir_for(paths, quiz_id)
    with QUIZ_WRITE_LOCK:
        write_quiz_dir(qd, quiz, created_at=_now_iso())
    return {"id": quiz_id}


def update_quiz(
    app: FastAPI, quiz_id: str, payload: AdminQuizUpsertPayload
) -> dict[str, str]:
    paths = get_storage(app)
    qd = quiz_dir_for(paths, quiz_id)
    if not qd.is_dir():
        raise HTTPException(status_code=404, detail="Nie znaleziono quizu.")
    with QUIZ_WRITE_LOCK:
        existing = read_quiz_kqf(qd)
        meta = read_meta_or_rebuild(qd, quiz_id)
        quiz = upsert_payload_to_kqf(payload, existing=existing)
        write_quiz_dir(
            qd,
            quiz,
            created_at=meta.created_at,
            updated_at=_now_iso(),
            last_activated_at=meta.last_activated_at,
        )
    return {"id": quiz_id}


def delete_quiz(app: FastAPI, quiz_id: str) -> None:
    paths = get_storage(app)
    if is_quiz_running(quiz_id):
        raise HTTPException(
            status_code=409, detail="Nie można usunąć quizu w trakcie sesji."
        )
    qd = quiz_dir_for(paths, quiz_id)
    if not qd.is_dir():
        raise HTTPException(status_code=404, detail="Nie znaleziono quizu.")
    with QUIZ_WRITE_LOCK:
        shutil.rmtree(qd)
