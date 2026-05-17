"""Read/write helpers for a single quiz directory (quiz.kqf + meta.json + media/)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from schemas.kqf import KqfQuiz
from services.kqf import parse_kqf, serialize_kqf
from services.slug import slugify_title
from services.storage import write_text_atomic


@dataclass
class QuizMeta:
    id: str
    title: str
    title_slug: str
    created_at: str
    updated_at: str
    question_count: int
    last_activated_at: str | None


def derive_meta_from_kqf(
    quiz: KqfQuiz,
    *,
    quiz_id: str,
    created_at: str,
    updated_at: str,
    last_activated_at: str | None,
) -> QuizMeta:
    title = quiz.front_matter.title
    return QuizMeta(
        id=quiz_id,
        title=title,
        title_slug=slugify_title(title),
        created_at=created_at,
        updated_at=updated_at,
        question_count=len(quiz.questions),
        last_activated_at=last_activated_at,
    )


def write_meta_json_atomic(path: Path, meta: QuizMeta) -> None:
    payload = {
        "id": meta.id,
        "title": meta.title,
        "title_slug": meta.title_slug,
        "created_at": meta.created_at,
        "updated_at": meta.updated_at,
        "question_count": meta.question_count,
        "last_activated_at": meta.last_activated_at,
    }
    write_text_atomic(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def read_meta_or_rebuild(quiz_dir: Path, quiz_id: str) -> QuizMeta:
    meta_path = quiz_dir / "meta.json"
    if meta_path.is_file():
        try:
            data = json.loads(meta_path.read_text(encoding="utf-8"))
            return QuizMeta(**data)
        except json.JSONDecodeError, KeyError, TypeError:
            pass
    quiz = read_quiz_kqf(quiz_dir)
    now = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
    meta = derive_meta_from_kqf(
        quiz,
        quiz_id=quiz_id,
        created_at=now,
        updated_at=now,
        last_activated_at=None,
    )
    write_meta_json_atomic(meta_path, meta)
    return meta


def write_quiz_dir(
    quiz_dir: Path,
    quiz: KqfQuiz,
    *,
    created_at: str,
    updated_at: str | None = None,
    last_activated_at: str | None = None,
) -> QuizMeta:
    quiz_dir.mkdir(parents=True, exist_ok=True)
    (quiz_dir / "media").mkdir(exist_ok=True)
    write_text_atomic(quiz_dir / "quiz.kqf", serialize_kqf(quiz))
    eff_updated = updated_at or created_at
    meta = derive_meta_from_kqf(
        quiz,
        quiz_id=quiz_dir.name,
        created_at=created_at,
        updated_at=eff_updated,
        last_activated_at=last_activated_at,
    )
    write_meta_json_atomic(quiz_dir / "meta.json", meta)
    return meta


def read_quiz_kqf(quiz_dir: Path) -> KqfQuiz:
    return parse_kqf((quiz_dir / "quiz.kqf").read_text(encoding="utf-8"))


def update_last_activated_at(quiz_dir: Path, ts: str) -> None:
    meta = read_meta_or_rebuild(quiz_dir, quiz_dir.name)
    new = QuizMeta(
        id=meta.id,
        title=meta.title,
        title_slug=meta.title_slug,
        created_at=meta.created_at,
        updated_at=meta.updated_at,
        question_count=meta.question_count,
        last_activated_at=ts,
    )
    write_meta_json_atomic(quiz_dir / "meta.json", new)


def kqf_with_absolute_media(quiz: KqfQuiz, quiz_id: str, origin: str) -> KqfQuiz:
    """Rewrite relative `./media/...` (or `media/...`) paths to absolute backend URLs.

    Absolute values (http(s) or leading ``/``) are left unchanged. Intended for
    active play sessions only (caller should ensure the quiz session is live).
    """

    def rewrite(value: str | None) -> str | None:
        if value is None:
            return None
        if value.startswith(("http://", "https://", "/")):
            return value
        cleaned = value.lstrip("./")
        if cleaned.startswith("media/"):
            cleaned = cleaned[len("media/") :]
        return f"{origin.rstrip('/')}/media/{quiz_id}/{cleaned}"

    copy = quiz.model_copy(deep=True)
    for q in copy.questions:
        q.media.image = rewrite(q.media.image)
        q.media.video = rewrite(q.media.video)
        q.media.audio = rewrite(q.media.audio)
    return copy
