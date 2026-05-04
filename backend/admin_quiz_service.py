from __future__ import annotations

from fastapi import FastAPI, HTTPException

from models import AdminQuizUpsertPayload
from storage_service import (
    QUIZ_WRITE_LOCK,
    find_quiz_index,
    get_storage,
    read_quizzes_payload,
    to_stored_quiz,
    write_quizzes_payload_atomic,
)


def list_quizzes(app: FastAPI) -> list[dict]:
    storage = get_storage(app)
    payload = read_quizzes_payload(storage)
    quizzes = payload["quizzes"]

    return [
        {
            "id": str(quiz.get("id", "")),
            "title": str(quiz.get("title", "")),
            "status": str(quiz.get("status", "active")),
            "created_at": str(quiz.get("created_at", "")),
            "participants_count": int(quiz.get("participants_count", 0)),
        }
        for quiz in quizzes
    ]


def get_quiz(app: FastAPI, quiz_id: str) -> dict:
    storage = get_storage(app)
    payload = read_quizzes_payload(storage)
    quizzes = payload["quizzes"]
    index = find_quiz_index(quizzes, quiz_id)

    if index == -1:
        raise HTTPException(status_code=404, detail="Nie znaleziono quizu.")

    return quizzes[index]


def create_quiz(app: FastAPI, payload: AdminQuizUpsertPayload) -> dict[str, str]:
    storage = get_storage(app)

    with QUIZ_WRITE_LOCK:
        stored_payload = read_quizzes_payload(storage)
        quizzes = stored_payload["quizzes"]
        stored_quiz = to_stored_quiz(payload)
        quizzes.append(stored_quiz)
        write_quizzes_payload_atomic(storage.quizzes_file, stored_payload)

    return {"id": stored_quiz["id"]}


def update_quiz(
    app: FastAPI, quiz_id: str, payload: AdminQuizUpsertPayload
) -> dict[str, str]:
    storage = get_storage(app)

    with QUIZ_WRITE_LOCK:
        stored_payload = read_quizzes_payload(storage)
        quizzes = stored_payload["quizzes"]
        index = find_quiz_index(quizzes, quiz_id)

        if index == -1:
            raise HTTPException(status_code=404, detail="Nie znaleziono quizu.")

        existing = quizzes[index]
        raw_created_at = existing.get("created_at")
        quizzes[index] = to_stored_quiz(
            payload,
            quiz_id=quiz_id,
            created_at=str(raw_created_at) if raw_created_at is not None else None,
            status=str(existing.get("status", "active")),
            participants_count=int(existing.get("participants_count", 0)),
        )
        write_quizzes_payload_atomic(storage.quizzes_file, stored_payload)

    return {"id": quiz_id}
