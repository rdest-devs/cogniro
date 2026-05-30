"""Read/write helpers for a single quiz directory (quiz.kqf + meta.json + media/)."""

from __future__ import annotations

import json
import logging
import re
import shutil
from urllib.parse import urlparse
from dataclasses import dataclass, fields as dataclass_fields
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

from schemas.kqf import KqfQuiz
from services.kqf import KqfParseError, parse_kqf, serialize_kqf
from services.slug import slugify_title
from services.storage import write_text_atomic

_ASSET_ID = re.compile(r"\b(asset_[0-9a-f]{32})\b")
logger = logging.getLogger(__name__)


@dataclass
class QuizMeta:
    id: str
    title: str
    title_slug: str
    created_at: str
    updated_at: str
    question_count: int
    last_activated_at: str | None
    schedule_start: str | None = None
    schedule_end: str | None = None
    manual_status: str | None = None


def derive_meta_from_kqf(
    quiz: KqfQuiz,
    *,
    quiz_id: str,
    created_at: str,
    updated_at: str,
    last_activated_at: str | None,
    schedule_start: str | None = None,
    schedule_end: str | None = None,
    manual_status: str | None = None,
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
        schedule_start=schedule_start,
        schedule_end=schedule_end,
        manual_status=manual_status,
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
        "schedule_start": meta.schedule_start,
        "schedule_end": meta.schedule_end,
        "manual_status": meta.manual_status,
    }
    write_text_atomic(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def read_meta_or_rebuild(quiz_dir: Path, quiz_id: str) -> QuizMeta:
    meta_path = quiz_dir / "meta.json"
    if meta_path.is_file():
        try:
            data = json.loads(meta_path.read_text(encoding="utf-8"))
            if data.get("id") != quiz_id:
                raise ValueError("meta id mismatch")
            known = {f.name for f in dataclass_fields(QuizMeta)}
            return QuizMeta(**{k: v for k, v in data.items() if k in known})
        except (json.JSONDecodeError, KeyError, ValueError):
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
    schedule_start: str | None = None,
    schedule_end: str | None = None,
    manual_status: str | None = None,
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
        schedule_start=schedule_start,
        schedule_end=schedule_end,
        manual_status=manual_status,
    )
    write_meta_json_atomic(quiz_dir / "meta.json", meta)
    return meta


def read_quiz_kqf(quiz_dir: Path) -> KqfQuiz:
    return parse_kqf((quiz_dir / "quiz.kqf").read_text(encoding="utf-8"))


def max_points_from_quiz_dir(quiz_dir: Path) -> int:
    """Sum of ``points`` from ``quiz.kqf``; 0 if file missing or invalid."""
    if not quiz_dir.is_dir() or not (quiz_dir / "quiz.kqf").is_file():
        return 0
    try:
        quiz = read_quiz_kqf(quiz_dir)
    except (OSError, UnicodeDecodeError, KqfParseError):
        return 0
    return sum(q.points for q in quiz.questions)


def safe_asset_file_path_under_dir(media_root: Path, filename: str) -> Path | None:
    """Resolve ``filename`` under ``media_root`` with traversal checks; or None."""
    rel = PurePosixPath(filename)
    if rel.is_absolute() or any(p in {"..", "."} for p in rel.parts):
        return None
    base = media_root.resolve()
    target = (base / Path(*rel.parts)).resolve()
    try:
        target.relative_to(base)
    except ValueError:
        return None
    if not target.is_file():
        return None
    for parent in [target, *target.parents]:
        if parent == base:
            break
        if parent.is_symlink():
            return None
    return target


def safe_quiz_media_file_path(quiz_dir: Path, filename: str) -> Path | None:
    """Resolve ``filename`` under ``quiz_dir/media`` with traversal checks; or None."""
    return safe_asset_file_path_under_dir(quiz_dir / "media", filename)


def _materialize_one_media_url(
    url: str | None,
    staging_dir: Path,
    quiz_media_root: Path,
) -> str | None:
    """Copy staged editor assets into ``quiz_media_root``; normalize to ``./media/...``."""
    if not url or not (s := url.strip()):
        return None

    m = _ASSET_ID.search(s)
    if m:
        aid = m.group(1)
        dest_img = quiz_media_root / aid / "image.webp"
        if dest_img.is_file():
            return f"./media/{aid}"
        src_img = staging_dir / aid / "image.webp"
        if src_img.is_file():
            dest_img.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_img, dest_img)
            st_thumb = staging_dir / aid / "thumb.webp"
            if st_thumb.is_file():
                shutil.copy2(st_thumb, quiz_media_root / aid / "thumb.webp")
            try:
                shutil.rmtree(staging_dir / aid)
            except OSError:
                pass
            return f"./media/{aid}"
        return url

    if s.startswith("./media/"):
        tail = s[len("./media/") :]
    elif s.startswith("media/"):
        tail = s[len("media/") :]
    else:
        return url
    target = quiz_media_root / tail
    if target.is_file():
        m_tail = _ASSET_ID.search(tail)
        if m_tail:
            return f"./media/{m_tail.group(1)}"
        return f"./media/{tail}"
    return url


def _rel_under_media_from_media_url(url: str | None) -> str | None:
    """Return posix path relative to ``quiz_dir/media`` for ``./media/…`` or ``media/…``; else None."""
    if not url or not (s := url.strip()):
        return None
    if s.startswith(("http://", "https://", "/")):
        return None
    if s.startswith("./media/"):
        tail = s[len("./media/") :]
    elif s.startswith("media/"):
        tail = s[len("media/") :]
    else:
        return None
    rel = PurePosixPath(tail)
    if rel.is_absolute() or any(p in {"..", "."} for p in rel.parts):
        return None
    return tail.replace("\\", "/")


def _expanded_quiz_media_relpaths(quiz: KqfQuiz) -> set[str]:
    """Relative posix paths under ``media/`` that this quiz content keeps (files).

    For ``…/image.webp`` or ``./media/{asset_id}`` (directory form), the paired
    ``thumb.webp`` in the same asset folder is also retained.
    """
    rels: set[str] = set()
    for q in quiz.questions:
        for raw in (q.media.image, q.media.video, q.media.audio):
            rel = _rel_under_media_from_media_url(raw)
            if not rel:
                continue
            rels.add(rel)
            p = PurePosixPath(rel)
            if p.name == "image.webp" and len(p.parts) > 1:
                rels.add(str(p.parent / "thumb.webp"))
            elif (
                len(p.parts) == 1 and p.name.startswith("asset_") and "." not in p.name
            ):
                rels.add(f"{rel}/image.webp")
                rels.add(f"{rel}/thumb.webp")
        # Include choice images
        if hasattr(q, "choices"):
            for choice in q.choices:
                if not choice.image:
                    continue
                rel = _rel_under_media_from_media_url(choice.image)
                if not rel:
                    continue
                rels.add(rel)
                p = PurePosixPath(rel)
                if (
                    len(p.parts) == 1
                    and p.name.startswith("asset_")
                    and "." not in p.name
                ):
                    rels.add(f"{rel}/image.webp")
                    rels.add(f"{rel}/thumb.webp")
    return rels


def _safe_resolved_path_under_quiz_media(quiz_dir: Path, rel_posix: str) -> Path | None:
    """Resolve ``rel_posix`` under ``quiz_dir/media`` with traversal checks; or None."""
    rel = PurePosixPath(rel_posix)
    if rel.is_absolute() or any(p in {"..", "."} for p in rel.parts):
        return None
    base = (quiz_dir / "media").resolve()
    target = (base / Path(*rel.parts)).resolve()
    try:
        target.relative_to(base)
    except ValueError:
        return None
    for node in [target, *target.parents]:
        if node == base:
            break
        if node.is_symlink():
            return None
    return target


def remove_obsolete_quiz_media_files(
    quiz_dir: Path, *, previous: KqfQuiz, current: KqfQuiz
) -> None:
    """Delete files under ``quiz_dir/media`` that were referenced in ``previous`` but not in ``current``.

    Call only after ``current`` has been written to ``quiz.kqf`` (so disk matches ``current``).
    Only removes paths that were part of ``previous``'s expanded media set; unrelated files in
    ``media/`` are left untouched.
    """
    before = _expanded_quiz_media_relpaths(previous)
    after = _expanded_quiz_media_relpaths(current)
    obsolete = before - after
    for rel in sorted(obsolete):
        path = _safe_resolved_path_under_quiz_media(quiz_dir, rel)
        if path is None or not path.is_file():
            continue
        try:
            path.unlink()
        except OSError as exc:
            logger.warning(
                "Could not remove obsolete quiz media file %s: %s", path, exc
            )
    _prune_empty_media_subdirs(quiz_dir)


def _prune_empty_media_subdirs(quiz_dir: Path) -> None:
    root = quiz_dir / "media"
    if not root.is_dir():
        return
    dirs = [p for p in root.rglob("*") if p.is_dir() and p != root]
    for d in sorted(dirs, key=lambda p: len(p.parts), reverse=True):
        try:
            if not any(d.iterdir()):
                d.rmdir()
        except OSError:
            pass


def materialize_staging_media_into_quiz_dir(
    quiz_dir: Path,
    quiz: KqfQuiz,
    staging_dir: Path,
) -> KqfQuiz:
    """Persist staged ``/media/quiz-assets/asset_…`` files under this quiz's ``media/`` tree."""
    quiz_media = quiz_dir / "media"
    quiz_media.mkdir(parents=True, exist_ok=True)
    out = quiz.model_copy(deep=True)
    for q in out.questions:
        m = q.media
        new_image = _materialize_one_media_url(m.image, staging_dir, quiz_media)
        new_video = _materialize_one_media_url(m.video, staging_dir, quiz_media)
        new_audio = _materialize_one_media_url(m.audio, staging_dir, quiz_media)
        if (new_image, new_video, new_audio) != (m.image, m.video, m.audio):
            q.media = m.model_copy(
                update={"image": new_image, "video": new_video, "audio": new_audio}
            )
        # NEW: materialize choice images
        if hasattr(q, "choices"):
            for choice in q.choices:
                if not choice.image:
                    continue
                new_choice_image = _materialize_one_media_url(
                    choice.image, staging_dir, quiz_media
                )
                if new_choice_image is not None and new_choice_image != choice.image:
                    choice.image = new_choice_image
    return out


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
        schedule_start=meta.schedule_start,
        schedule_end=meta.schedule_end,
        manual_status=meta.manual_status,
    )
    write_meta_json_atomic(quiz_dir / "meta.json", new)


def update_availability(
    quiz_dir: Path,
    *,
    schedule_start: str | None,
    schedule_end: str | None,
    manual_status: str | None,
) -> QuizMeta:
    meta = read_meta_or_rebuild(quiz_dir, quiz_dir.name)
    new = QuizMeta(
        id=meta.id,
        title=meta.title,
        title_slug=meta.title_slug,
        created_at=meta.created_at,
        updated_at=meta.updated_at,
        question_count=meta.question_count,
        last_activated_at=meta.last_activated_at,
        schedule_start=schedule_start,
        schedule_end=schedule_end,
        manual_status=manual_status,
    )
    write_meta_json_atomic(quiz_dir / "meta.json", new)
    return new


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
        out = f"{origin.rstrip('/')}/media/{quiz_id}/{cleaned}"
        path = urlparse(out).path.rstrip("/")
        leaf = path.split("/")[-1] if path else ""
        if leaf and "." not in leaf:
            return out.rstrip("/")
        return out

    copy = quiz.model_copy(deep=True)
    for q in copy.questions:
        q.media.image = rewrite(q.media.image)
        q.media.video = rewrite(q.media.video)
        q.media.audio = rewrite(q.media.audio)
        if hasattr(q, "choices"):
            for choice in q.choices:
                if choice.image:
                    choice.image = rewrite(choice.image)
    return copy
