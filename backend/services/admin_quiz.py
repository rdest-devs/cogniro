from __future__ import annotations

import io
import os
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Literal

from fastapi import FastAPI, HTTPException

from core.settings import (
    MAX_QUIZ_IMPORT_KQF_BYTES,
    MAX_QUIZ_IMPORT_MEMBER_BYTES,
    MAX_QUIZ_IMPORT_UNCOMPRESSED_TOTAL_BYTES,
    UPLOAD_CHUNK_SIZE,
)
from schemas.admin_quiz import (
    ActivateRequest,
    AdminQuizDetailResponse,
    AdminQuizListItemResponse,
    AdminQuizUpsertPayload,
    AvailabilityPatchRequest,
)
from services.admin_quiz_adapters import (
    kqf_to_admin_detail_payload,
    upsert_payload_to_kqf,
)
from services.quiz_files import (
    QuizMeta,
    materialize_staging_media_into_quiz_dir,
    max_points_from_quiz_dir,
    read_meta_or_rebuild,
    read_quiz_kqf,
    remove_obsolete_quiz_media_files,
    update_availability,
    update_last_activated_at,
    write_meta_json_atomic,
    write_quiz_dir,
    write_text_atomic,
)
from services import sessions
from services.kqf import KqfParseError, parse_kqf
from services.results import ResultEntry, write_result_file
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


def check_availability(meta: QuizMeta) -> tuple[bool, str | None]:
    if meta.manual_status == "closed":
        return False, "manually_closed"
    now = datetime.now(timezone.utc)
    if meta.schedule_end:
        end = datetime.fromisoformat(meta.schedule_end)
        if now > end:
            return False, "expired"
    if meta.manual_status == "open":
        return True, None
    if meta.schedule_start:
        start = datetime.fromisoformat(meta.schedule_start)
        if now < start:
            return False, "not_yet"
    return True, None


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
            "running" if sessions.is_quiz_running(quiz_dir.name) else "idle"
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
        "running" if sessions.is_quiz_running(quiz_id) else "idle"
    )
    return kqf_to_admin_detail_payload(
        quiz,
        quiz_id=quiz_id,
        status=status,
        created_at=meta.created_at,
        updated_at=meta.updated_at,
        last_activated_at=meta.last_activated_at,
        schedule_start=meta.schedule_start,
        schedule_end=meta.schedule_end,
        manual_status=meta.manual_status,
    )


def create_quiz(app: FastAPI, payload: AdminQuizUpsertPayload) -> dict[str, str]:
    paths = get_storage(app)
    quiz = upsert_payload_to_kqf(payload, existing=None)
    quiz_id = generate_quiz_id()
    qd = quiz_dir_for(paths, quiz_id)
    with QUIZ_WRITE_LOCK:
        qd.mkdir(parents=True, exist_ok=True)
        quiz = materialize_staging_media_into_quiz_dir(qd, quiz, paths.staging_dir)
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
        quiz = materialize_staging_media_into_quiz_dir(qd, quiz, paths.staging_dir)
        write_quiz_dir(
            qd,
            quiz,
            created_at=meta.created_at,
            updated_at=_now_iso(),
            last_activated_at=meta.last_activated_at,
            schedule_start=meta.schedule_start,
            schedule_end=meta.schedule_end,
            manual_status=meta.manual_status,
        )
        remove_obsolete_quiz_media_files(qd, previous=existing, current=quiz)
    return {"id": quiz_id}


def delete_quiz(app: FastAPI, quiz_id: str) -> None:
    paths = get_storage(app)
    if sessions.is_quiz_running(quiz_id):
        raise HTTPException(
            status_code=409, detail="Nie można usunąć quizu w trakcie sesji."
        )
    qd = quiz_dir_for(paths, quiz_id)
    if not qd.is_dir():
        raise HTTPException(status_code=404, detail="Nie znaleziono quizu.")
    with QUIZ_WRITE_LOCK:
        shutil.rmtree(qd)


def _activation_payload(session: sessions.QuizSession, meta: QuizMeta) -> dict:
    return {
        "pin": session.pin,
        "join_url": _build_join_url(session.pin),
        "started_at": session.started_at.isoformat().replace("+00:00", "Z"),
        "schedule_start": meta.schedule_start,
        "schedule_end": meta.schedule_end,
        "manual_status": meta.manual_status,
    }


def activate_quiz(
    app: FastAPI, quiz_id: str, body: ActivateRequest | None = None
) -> dict:
    paths = get_storage(app)
    qd = quiz_dir_for(paths, quiz_id)
    if not qd.is_dir():
        raise HTTPException(status_code=404, detail="Nie znaleziono quizu.")
    meta = read_meta_or_rebuild(qd, quiz_id)
    existing = sessions.lookup_by_quiz(quiz_id)
    if existing is not None:
        # Idempotent: admin UI / React Strict Mode may POST activate more than once
        # while the same in-memory session is already running.
        return _activation_payload(existing, meta)
    try:
        session = sessions.start_session(quiz_id=quiz_id, quiz_title=meta.title)
    except ValueError:
        # Lost the race with another concurrent activate; join the existing session.
        raced = sessions.lookup_by_quiz(quiz_id)
        if raced is None:
            raise HTTPException(
                status_code=409, detail="Quiz jest już aktywny."
            ) from None
        return _activation_payload(raced, meta)
    now_ts = _now_iso()
    if body is not None:
        new_meta = QuizMeta(
            id=meta.id,
            title=meta.title,
            title_slug=meta.title_slug,
            created_at=meta.created_at,
            updated_at=meta.updated_at,
            question_count=meta.question_count,
            last_activated_at=now_ts,
            schedule_start=body.schedule_start,
            schedule_end=body.schedule_end,
            manual_status=body.manual_status,
        )
        write_meta_json_atomic(qd / "meta.json", new_meta)
        meta = new_meta
    else:
        update_last_activated_at(qd, now_ts)
        meta = read_meta_or_rebuild(qd, quiz_id)
    return _activation_payload(session, meta)


def _build_join_url(pin: str) -> str:
    base = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").rstrip("/")
    return f"{base}/play/?code={pin}"


def get_session_snapshot(app: FastAPI, quiz_id: str) -> dict:
    session = sessions.lookup_by_quiz(quiz_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Quiz nie jest aktywny.")
    paths = get_storage(app)
    qd = quiz_dir_for(paths, quiz_id)
    max_score = max_points_from_quiz_dir(qd)
    participants = sessions.list_participants(quiz_id)
    return {
        "pin": session.pin,
        "started_at": session.started_at.isoformat().replace("+00:00", "Z"),
        "max_score": max_score,
        "participants": [
            {
                "nickname": p.nickname,
                "joined_at": p.joined_at.isoformat().replace("+00:00", "Z"),
                "blocked": p.blocked,
                "has_submitted": p.submitted_at is not None,
                "score": p.score,
            }
            for p in participants
        ],
    }


def block_session_nickname(quiz_id: str, nickname: str) -> None:
    try:
        sessions.block_participant(quiz_id=quiz_id, nickname=nickname)
    except LookupError as exc:
        code = str(exc) if exc.args else ""
        if code == "not_running":
            raise HTTPException(
                status_code=404, detail="Quiz nie jest aktywny."
            ) from exc
        raise HTTPException(
            status_code=404, detail="Nie znaleziono uczestnika."
        ) from exc


def stop_quiz(app: FastAPI, quiz_id: str) -> dict[str, str]:
    paths = get_storage(app)
    session = sessions.stop_session(quiz_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Quiz nie jest aktywny.")
    qd = quiz_dir_for(paths, quiz_id)
    max_score = max_points_from_quiz_dir(qd)
    entries = [
        ResultEntry(
            nickname=p.nickname,
            score=int(p.score) if p.score is not None else 0,
            submitted_at=p.submitted_at.isoformat().replace("+00:00", "Z"),
        )
        for p in session.participants.values()
        if p.submitted_at is not None and not p.blocked
    ]
    stopped_at = datetime.now(timezone.utc)
    filename = write_result_file(
        paths,
        quiz_id=quiz_id,
        quiz_title=session.quiz_title,
        session_started_at=session.started_at,
        session_stopped_at=stopped_at,
        entries=entries,
        max_score=max_score,
    )
    meta = read_meta_or_rebuild(qd, quiz_id)
    if meta.manual_status is not None:
        update_availability(
            qd,
            schedule_start=meta.schedule_start,
            schedule_end=meta.schedule_end,
            manual_status=None,
        )
    return {"date": stopped_at.strftime("%Y-%m-%d"), "filename": filename}


def patch_availability(
    app: FastAPI, quiz_id: str, body: AvailabilityPatchRequest
) -> None:
    paths = get_storage(app)
    qd = quiz_dir_for(paths, quiz_id)
    if not qd.is_dir():
        raise HTTPException(status_code=404, detail="Nie znaleziono quizu.")
    meta = read_meta_or_rebuild(qd, quiz_id)
    fields = body.model_fields_set
    new_schedule_start = (
        body.schedule_start if "schedule_start" in fields else meta.schedule_start
    )
    new_schedule_end = (
        body.schedule_end if "schedule_end" in fields else meta.schedule_end
    )
    new_manual_status = (
        body.manual_status if "manual_status" in fields else meta.manual_status
    )
    update_availability(
        qd,
        schedule_start=new_schedule_start,
        schedule_end=new_schedule_end,
        manual_status=new_manual_status,
    )


def _safe_import_member_path(quiz_dir: Path, member: str) -> Path | None:
    """Resolve a zip entry path under ``quiz_dir``; reject traversal and absolute paths."""
    if not member or member.endswith("/"):
        return None
    norm = member.replace("\\", "/").strip()
    if not norm or norm.startswith("/"):
        return None
    rel = PurePosixPath(norm)
    if rel.is_absolute() or ".." in rel.parts:
        return None
    target = (quiz_dir / Path(*rel.parts)).resolve()
    base = quiz_dir.resolve()
    try:
        target.relative_to(base)
    except ValueError:
        return None
    return target


def export_quiz_zip(app: FastAPI, quiz_id: str) -> tuple[bytes, str]:
    paths = get_storage(app)
    qd = quiz_dir_for(paths, quiz_id)
    if not qd.is_dir():
        raise HTTPException(status_code=404, detail="Nie znaleziono quizu.")
    if not (qd / "quiz.kqf").is_file():
        raise HTTPException(status_code=404, detail="Nie znaleziono quizu.")
    meta = read_meta_or_rebuild(qd, quiz_id)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in qd.rglob("*"):
            if p.is_file():
                arc = str(p.relative_to(qd)).replace("\\", "/")
                zf.write(p, arc)
    return buf.getvalue(), f"{meta.title_slug}.zip"


def _read_zip_entry_bytes_limited(
    zf: zipfile.ZipFile, member: str, max_bytes: int
) -> bytes:
    """Read a zip member fully into memory with a hard uncompressed byte cap."""
    buf = bytearray()
    with zf.open(member) as src:
        while True:
            chunk = src.read(UPLOAD_CHUNK_SIZE)
            if not chunk:
                break
            if len(buf) + len(chunk) > max_bytes:
                raise HTTPException(
                    status_code=413,
                    detail="Plik quiz.kqf w archiwum jest zbyt duży.",
                )
            buf.extend(chunk)
    return bytes(buf)


class _OversizeMember(Exception):
    """Single zip member exceeded ``MAX_QUIZ_IMPORT_MEMBER_BYTES``.

    Recoverable inside ``import_quiz_zip``: the file is dropped, recorded in
    ``skipped`` and the editor surfaces a broken-media warning. The total-budget
    cap is enforced separately and remains a hard 413 (otherwise a zip bomb
    could stream gigabytes before we abort).
    """


def _extract_zip_member_limited(
    zf: zipfile.ZipFile,
    member: str,
    target: Path,
    *,
    max_member: int,
    budget: list[int],
) -> None:
    """Stream a zip member to disk; enforce per-member and total uncompressed caps."""
    written_member = 0
    with zf.open(member) as src, target.open("wb") as dst:
        while True:
            chunk = src.read(UPLOAD_CHUNK_SIZE)
            if not chunk:
                break
            if written_member + len(chunk) > max_member:
                raise _OversizeMember(member)
            if len(chunk) > budget[0]:
                raise HTTPException(
                    status_code=413,
                    detail="Rozpakowana zawartość archiwum przekracza dozwolony limit.",
                )
            budget[0] -= len(chunk)
            written_member += len(chunk)
            dst.write(chunk)


def import_quiz_zip(app: FastAPI, zip_bytes: bytes) -> dict[str, object]:
    """Import a quiz zip.

    Returns ``{"id": <quiz_id>, "skipped": [<archive member names>]}``. Members
    that exceed the per-file size cap are dropped and reported in ``skipped``
    so the editor can show broken-media placeholders the user can replace;
    other failures (oversized total, malformed zip/kqf, traversal in a name
    we still chose to write) roll the quiz directory back and re-raise.
    """
    paths = get_storage(app)
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            names = zf.namelist()
            if "quiz.kqf" not in names:
                raise HTTPException(
                    status_code=400, detail="Archiwum musi zawierać quiz.kqf."
                )
            kqf_bytes = _read_zip_entry_bytes_limited(
                zf, "quiz.kqf", MAX_QUIZ_IMPORT_KQF_BYTES
            )
            budget = [MAX_QUIZ_IMPORT_UNCOMPRESSED_TOTAL_BYTES - len(kqf_bytes)]
            if budget[0] < 0:
                raise HTTPException(
                    status_code=413,
                    detail="Rozpakowana zawartość archiwum przekracza dozwolony limit.",
                )
            try:
                kqf_text = kqf_bytes.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise HTTPException(
                    status_code=400, detail="Niepoprawny plik quiz.kqf."
                ) from exc
            try:
                parse_kqf(kqf_text)
            except KqfParseError as exc:
                raise HTTPException(
                    status_code=400, detail="Niepoprawna zawartość quiz.kqf."
                ) from exc
            quiz_id = generate_quiz_id()
            qd = quiz_dir_for(paths, quiz_id)
            skipped: list[str] = []
            with QUIZ_WRITE_LOCK:
                try:
                    qd.mkdir(parents=True, exist_ok=True)
                    write_text_atomic(qd / "quiz.kqf", kqf_text)
                    for name in names:
                        if not name or name.endswith("/") or name == "quiz.kqf":
                            continue
                        target = _safe_import_member_path(qd, name)
                        if target is None:
                            continue
                        target.parent.mkdir(parents=True, exist_ok=True)
                        try:
                            _extract_zip_member_limited(
                                zf,
                                name,
                                target,
                                max_member=MAX_QUIZ_IMPORT_MEMBER_BYTES,
                                budget=budget,
                            )
                        except _OversizeMember:
                            target.unlink(missing_ok=True)
                            skipped.append(name)
                    read_meta_or_rebuild(qd, quiz_id)
                except BaseException:
                    shutil.rmtree(qd, ignore_errors=True)
                    raise
            return {"id": quiz_id, "skipped": skipped}
    except zipfile.BadZipFile as exc:
        raise HTTPException(
            status_code=400, detail="Niepoprawne archiwum ZIP."
        ) from exc
