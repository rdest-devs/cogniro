"""Result file writes + listing/deletion + retention purge."""

from __future__ import annotations

import datetime as dt
import json
import re
import shutil
from dataclasses import asdict, dataclass

from services.slug import compose_result_filename
from services.quiz_files import max_points_from_quiz_dir
from services.storage import StoragePaths, quiz_dir_for, write_text_atomic

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@dataclass
class ResultEntry:
    nickname: str
    score: int
    submitted_at: str


@dataclass
class ResultFileMetadata:
    filename: str
    quiz_id: str
    quiz_title: str
    session_started_at: str
    session_stopped_at: str
    score_count: int


def _iso_z(value: dt.datetime) -> str:
    return value.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def write_result_file(
    paths: StoragePaths,
    *,
    quiz_id: str,
    quiz_title: str,
    session_started_at: dt.datetime,
    session_stopped_at: dt.datetime,
    entries: list[ResultEntry],
    max_score: int,
) -> str:
    date_dir = paths.results_dir / session_stopped_at.strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)
    existing = {p.name for p in date_dir.iterdir()}
    filename = compose_result_filename(
        quiz_id=quiz_id,
        quiz_title=quiz_title,
        stopped_at=session_stopped_at,
        existing=existing,
    )
    payload = {
        "quiz_id": quiz_id,
        "quiz_title": quiz_title,
        "session_started_at": _iso_z(session_started_at),
        "session_stopped_at": _iso_z(session_stopped_at),
        "max_score": int(max_score),
        "scores": [asdict(e) for e in entries],
    }
    write_text_atomic(
        date_dir / filename, json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    )
    return filename


def list_result_dates(paths: StoragePaths) -> list[str]:
    if not paths.results_dir.is_dir():
        return []
    dates = [
        p.name
        for p in paths.results_dir.iterdir()
        if p.is_dir() and _DATE_RE.match(p.name)
    ]
    return sorted(dates, reverse=True)


def list_results_in_day(paths: StoragePaths, date: str) -> list[ResultFileMetadata]:
    day_dir = paths.results_dir / date
    if not day_dir.is_dir():
        return []
    out: list[ResultFileMetadata] = []
    for p in sorted(day_dir.iterdir()):
        if not p.is_file() or p.suffix != ".json":
            continue
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
            out.append(
                ResultFileMetadata(
                    filename=p.name,
                    quiz_id=str(data.get("quiz_id", "")),
                    quiz_title=str(data.get("quiz_title", "")),
                    session_started_at=str(data.get("session_started_at", "")),
                    session_stopped_at=str(data.get("session_stopped_at", "")),
                    score_count=len(data.get("scores", [])),
                )
            )
        except json.JSONDecodeError, OSError:
            continue
    return out


def read_result_file(paths: StoragePaths, date: str, filename: str) -> dict:
    if not _DATE_RE.match(date) or "/" in filename or ".." in filename:
        raise FileNotFoundError(date)
    path = paths.results_dir / date / filename
    if not path.is_file():
        raise FileNotFoundError(filename)
    return json.loads(path.read_text(encoding="utf-8"))


def enrich_result_payload_with_max_score(paths: StoragePaths, data: dict) -> dict:
    """Add ``max_score`` when missing by reading the quiz KQF (older archives)."""
    ms = data.get("max_score")
    if isinstance(ms, int) and ms > 0:
        return data
    qid = data.get("quiz_id")
    if not isinstance(qid, str) or not qid.strip():
        return data
    qd = quiz_dir_for(paths, qid.strip())
    computed = max_points_from_quiz_dir(qd)
    if computed <= 0:
        return data
    out = dict(data)
    out["max_score"] = computed
    return out


def delete_result_file(paths: StoragePaths, date: str, filename: str) -> None:
    if not _DATE_RE.match(date) or "/" in filename or ".." in filename:
        raise FileNotFoundError(date)
    path = paths.results_dir / date / filename
    if path.is_file():
        path.unlink()


def delete_result_day(paths: StoragePaths, date: str) -> None:
    if not _DATE_RE.match(date):
        raise FileNotFoundError(date)
    day_dir = paths.results_dir / date
    if day_dir.is_dir():
        shutil.rmtree(day_dir)


def purge_results_older_than(
    paths: StoragePaths, retention: dt.timedelta, *, today: dt.date | None = None
) -> int:
    cutoff = (today or dt.date.today()) - retention
    if not paths.results_dir.is_dir():
        return 0
    removed = 0
    for p in paths.results_dir.iterdir():
        if not p.is_dir() or not _DATE_RE.match(p.name):
            continue
        try:
            folder_date = dt.date.fromisoformat(p.name)
        except ValueError:
            continue
        if folder_date < cutoff:
            shutil.rmtree(p)
            removed += 1
    return removed
