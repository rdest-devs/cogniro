"""Filesystem layout: storage/{quizzes/{quiz_id}/{quiz.kqf,meta.json,media/}, results/{date}/}."""

from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
import tempfile
import threading
import uuid

from fastapi import FastAPI

from core.settings import DEFAULT_DATA_DIR

# Optional override: path to the `storage` directory (`quizzes/`, `results/` live here).
# Parent of that path is used for `uploads/quiz-assets/`. When set, `COGNIRO_DATA_DIR`
# does not affect quiz or result file locations.
COGNIRO_STORAGE_DIR_ENV = "COGNIRO_STORAGE_DIR"


@dataclass
class StoragePaths:
    data_dir: Path
    quizzes_dir: Path
    results_dir: Path
    staging_dir: Path  # editor media staging (= old uploads/quiz-assets)


# NOTE: This in-process lock only serializes writes within a single worker.
# If running with multiple uvicorn workers (--workers N), use file-based
# locking (e.g. fcntl.flock) or migrate to a proper database.
QUIZ_WRITE_LOCK = threading.RLock()


def resolve_data_dir() -> Path:
    configured = os.getenv("COGNIRO_DATA_DIR")
    if configured and configured.strip():
        return Path(configured).expanduser()
    preferred = Path(DEFAULT_DATA_DIR).expanduser()
    try:
        preferred.mkdir(parents=True, exist_ok=True)
        probe = preferred / f".write_probe_{uuid.uuid4().hex}"
        probe.write_text("", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return preferred
    except OSError:
        return Path(tempfile.gettempdir()) / "cogniro"


def resolve_storage_paths() -> StoragePaths:
    storage_override = os.getenv(COGNIRO_STORAGE_DIR_ENV)
    if storage_override and storage_override.strip():
        storage_root = Path(storage_override).expanduser().resolve()
        data_root = storage_root.parent
        return StoragePaths(
            data_dir=data_root,
            quizzes_dir=storage_root / "quizzes",
            results_dir=storage_root / "results",
            staging_dir=data_root / "uploads" / "quiz-assets",
        )

    data_dir = resolve_data_dir()
    return StoragePaths(
        data_dir=data_dir,
        quizzes_dir=data_dir / "storage" / "quizzes",
        results_dir=data_dir / "storage" / "results",
        staging_dir=data_dir / "uploads" / "quiz-assets",
    )


def initialize_storage() -> StoragePaths:
    paths = resolve_storage_paths()
    for p in (paths.quizzes_dir, paths.results_dir, paths.staging_dir):
        p.mkdir(parents=True, exist_ok=True)
    return paths


def get_storage(app: FastAPI) -> StoragePaths:
    paths = getattr(app.state, "storage", None)
    if paths is None:
        paths = initialize_storage()
        app.state.storage = paths
    return paths


def generate_quiz_id() -> str:
    return f"quiz_{uuid.uuid4().hex}"


def quiz_dir_for(paths: StoragePaths, quiz_id: str) -> Path:
    return paths.quizzes_dir / quiz_id


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


def write_text_atomic(path: Path, text: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        fh.write(text)
        fh.flush()
        os.fsync(fh.fileno())
    os.replace(tmp, path)
    _fsync_directory(path.parent)
