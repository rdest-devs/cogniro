from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
import threading
import uuid

from fastapi import FastAPI, HTTPException

from models import AdminQuizUpsertPayload, StoragePaths
from settings import DEFAULT_DATA_DIR, QUIZZES_FILENAME

# NOTE: This in-process lock only serializes writes within a single worker.
# If running with multiple uvicorn workers (--workers N), use file-based
# locking (e.g. fcntl.flock) or migrate to a proper database.
QUIZ_WRITE_LOCK = threading.Lock()


def resolve_data_dir() -> Path:
    configured_data_dir = os.getenv("COGNIRO_DATA_DIR")
    if configured_data_dir:
        return Path(configured_data_dir).expanduser()

    preferred_dir = Path(DEFAULT_DATA_DIR).expanduser()
    try:
        preferred_dir.mkdir(parents=True, exist_ok=True)
        probe_file = preferred_dir / f".write_probe_{uuid.uuid4().hex}"
        probe_file.write_text("", encoding="utf-8")
        probe_file.unlink(missing_ok=True)
        return preferred_dir
    except OSError:
        # Fallback for local/dev environments where /var/lib may be read-only.
        return Path(tempfile.gettempdir()) / "cogniro"


def resolve_storage_paths() -> StoragePaths:
    data_dir = resolve_data_dir()
    quizzes_dir = data_dir / "quizzes"
    uploads_quiz_assets_dir = data_dir / "uploads" / "quiz-assets"
    return StoragePaths(
        data_dir=data_dir,
        quizzes_dir=quizzes_dir,
        quizzes_file=quizzes_dir / QUIZZES_FILENAME,
        uploads_dir=data_dir / "uploads",
        uploads_quiz_assets_dir=uploads_quiz_assets_dir,
    )


def default_quizzes_payload() -> dict[str, list[dict]]:
    return {"quizzes": []}


def _fsync_directory(directory: Path) -> None:
    try:
        fd = os.open(directory, os.O_RDONLY)
    except OSError:
        return

    try:
        os.fsync(fd)
    except OSError:
        pass
    finally:
        os.close(fd)


def write_quizzes_payload_atomic(
    quizzes_file: Path, payload: dict[str, list[dict]]
) -> None:
    tmp_path = quizzes_file.with_name(f"{quizzes_file.name}.tmp")

    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())

    os.replace(tmp_path, quizzes_file)
    _fsync_directory(quizzes_file.parent)


def initialize_storage() -> StoragePaths:
    storage = resolve_storage_paths()
    storage.quizzes_dir.mkdir(parents=True, exist_ok=True)
    storage.uploads_quiz_assets_dir.mkdir(parents=True, exist_ok=True)

    if not storage.quizzes_file.exists():
        write_quizzes_payload_atomic(storage.quizzes_file, default_quizzes_payload())

    return storage


def get_storage(app: FastAPI) -> StoragePaths:
    storage = getattr(app.state, "storage", None)
    if storage is None:
        storage = initialize_storage()
        app.state.storage = storage
    return storage


def read_quizzes_payload(storage: StoragePaths) -> dict[str, list[dict]]:
    try:
        with storage.quizzes_file.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail="Brak pliku quizzes.json na serwerze.",
        ) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail="Plik quizzes.json ma niepoprawny format JSON.",
        ) from exc

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=500, detail="Niepoprawna struktura quizzes.json."
        )

    quizzes = payload.get("quizzes")
    if not isinstance(quizzes, list):
        raise HTTPException(
            status_code=500,
            detail="Brak listy quizzes w pliku quizzes.json.",
        )

    return payload


def to_stored_quiz(
    payload: AdminQuizUpsertPayload,
    *,
    quiz_id: str | None = None,
    created_at: str | None = None,
    status: str = "active",
    participants_count: int = 0,
) -> dict:
    return {
        "id": quiz_id or f"quiz_{uuid.uuid4().hex}",
        "title": payload.title.strip(),
        "status": status,
        "created_at": created_at
        or datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "participants_count": participants_count,
        "time_limit": payload.time_limit,
        "shuffle_questions": payload.shuffle_questions,
        "show_answers_after": payload.show_answers_after,
        "show_leaderboard_after": payload.show_leaderboard_after,
        "questions": [
            question.model_dump(mode="json", by_alias=True, exclude_none=True)
            for question in payload.questions
        ],
    }


def find_quiz_index(quizzes: list[dict], quiz_id: str) -> int:
    for index, quiz in enumerate(quizzes):
        if str(quiz.get("id")) == quiz_id:
            return index
    return -1
