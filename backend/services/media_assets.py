from __future__ import annotations

from io import BytesIO
from pathlib import Path, PurePosixPath
import re
import shutil
import time
import uuid

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError

from core.settings import (
    ALLOWED_UPLOAD_MIME_TYPES,
    MAX_IMAGE_PIXELS,
    MAX_UPLOAD_BYTES,
    MEDIA_PUBLIC_PREFIX,
    UPLOAD_CHUNK_SIZE,
)
from schemas.admin_quiz import QuizAssetUploadResponse
from services.storage import StoragePaths, get_storage

_ALLOWED_PILLOW_FORMATS = {"JPEG", "PNG", "WEBP"}
# Minimum age before periodic purge deletes ``storage/uploads/quiz-assets/asset_*`` (editor cache).
ORPHAN_ASSET_RETENTION_SECONDS = 24 * 60 * 60
_ASSET_ID_IN_STRING = re.compile(r"\b(asset_[0-9a-f]{32})\b")


def _is_safe_asset_path(asset_path: str) -> bool:
    """Reject path components that could escape the uploads directory."""
    path = PurePosixPath(asset_path)
    if path.is_absolute():
        return False
    return all(part != ".." and part != "." for part in path.parts)


def _assert_relative_to(resolved: Path, base: Path) -> None:
    try:
        resolved.relative_to(base.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Nie znaleziono zasobu.") from exc


def _wants_alpha(source: Image.Image) -> bool:
    return source.mode in {"RGBA", "LA"} or (
        source.mode == "P" and "transparency" in source.info
    )


def resize_to_webp_bytes(
    source: Image.Image, *, max_width: int, quality: int
) -> tuple[bytes, int, int]:
    oriented = ImageOps.exif_transpose(source)
    image = oriented.convert("RGBA" if _wants_alpha(oriented) else "RGB")

    if image.width > max_width:
        ratio = max_width / image.width
        target_size = (max_width, max(1, round(image.height * ratio)))
        image = image.resize(target_size, Image.Resampling.LANCZOS)

    output = BytesIO()
    image.save(
        output,
        format="WEBP",
        quality=quality,
        optimize=True,
        method=6,
    )
    return output.getvalue(), image.width, image.height


async def _read_upload_with_limit(file: UploadFile, max_bytes: int) -> bytes:
    """Read an upload in chunks, aborting early if the size limit is exceeded."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(UPLOAD_CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=413,
                detail="Plik jest za duży. Maksymalny rozmiar pliku to 5 MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


def _process_upload_bytes(app: FastAPI, raw_data: bytes) -> QuizAssetUploadResponse:
    try:
        source = Image.open(BytesIO(raw_data))
        if source.format not in _ALLOWED_PILLOW_FORMATS:
            raise HTTPException(
                status_code=400,
                detail="Nieprawidłowy typ pliku. Dozwolone typy plików: JPEG, PNG, WebP.",
            )
        width, height = source.size
        if width * height > MAX_IMAGE_PIXELS:
            raise HTTPException(
                status_code=413,
                detail="Obraz ma zbyt duże wymiary.",
            )
        source.load()
    except Image.DecompressionBombError as exc:
        raise HTTPException(
            status_code=413,
            detail="Obraz ma zbyt duże wymiary.",
        ) from exc
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Nie udało się przetworzyć obrazu.",
        ) from exc

    image_bytes, image_width, image_height = resize_to_webp_bytes(
        source,
        max_width=720,
        quality=75,
    )
    thumb_bytes, _, _ = resize_to_webp_bytes(
        source,
        max_width=256,
        quality=70,
    )

    asset_id = f"asset_{uuid.uuid4().hex}"
    storage = get_storage(app)
    asset_dir = storage.staging_dir / asset_id
    asset_dir.mkdir(parents=True, exist_ok=True)

    image_path = asset_dir / "image.webp"
    thumb_path = asset_dir / "thumb.webp"

    image_path.write_bytes(image_bytes)
    thumb_path.write_bytes(thumb_bytes)

    return QuizAssetUploadResponse(
        assetId=asset_id,
        url=f"{MEDIA_PUBLIC_PREFIX}/{asset_id}/image.webp",
        thumbUrl=f"{MEDIA_PUBLIC_PREFIX}/{asset_id}/thumb.webp",
        width=image_width,
        height=image_height,
        alt="",
    )


async def upload_asset(app: FastAPI, file: UploadFile) -> QuizAssetUploadResponse:
    # NOTE: content_type is client-supplied; real format validation happens
    # after Pillow opens the image (see _ALLOWED_PILLOW_FORMATS check below).
    if file.content_type not in ALLOWED_UPLOAD_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Nieprawidłowy typ pliku. Dozwolone typy plików: JPEG, PNG, WebP.",
        )

    raw_data = await _read_upload_with_limit(file, MAX_UPLOAD_BYTES)
    return await run_in_threadpool(_process_upload_bytes, app, raw_data)


def _asset_ids_from_string(value: object) -> set[str]:
    if isinstance(value, str):
        return set(_ASSET_ID_IN_STRING.findall(value))
    return set()


def _extract_referenced_asset_ids(quizzes: list[dict]) -> set[str]:
    referenced: set[str] = set()

    for quiz in quizzes:
        if not isinstance(quiz, dict):
            continue
        questions = quiz.get("questions", [])
        if not isinstance(questions, list):
            continue

        for question in questions:
            if not isinstance(question, dict):
                continue

            question_image = question.get("image")
            if isinstance(question_image, dict):
                asset_id = question_image.get("assetId")
                if isinstance(asset_id, str) and asset_id:
                    referenced.add(asset_id)

            referenced.update(_asset_ids_from_string(question.get("image")))

            answers = question.get("answers")
            if answers is None:
                answers = question.get("choices")
            if not isinstance(answers, list):
                continue

            for answer in answers:
                if not isinstance(answer, dict):
                    continue
                answer_image = answer.get("image")
                if isinstance(answer_image, dict):
                    asset_id = answer_image.get("assetId")
                    if isinstance(asset_id, str) and asset_id:
                        referenced.add(asset_id)
                referenced.update(_asset_ids_from_string(answer_image))

    return referenced


def _purge_staging_orphans(
    storage: StoragePaths,
    referenced_asset_ids: set[str] | None,
    *,
    now_timestamp: float | None,
    min_age_seconds: int,
) -> int:
    """Remove ``asset_*`` staging dirs older than ``cutoff``.

    When ``referenced_asset_ids`` is not ``None``, those ids are kept (tests).
    When ``None``, all stale ``asset_*`` dirs are removed (periodic editor cache).
    """
    now = time.time() if now_timestamp is None else now_timestamp
    cutoff = now - max(min_age_seconds, 0)
    removed = 0

    try:
        children = list(storage.staging_dir.iterdir())
    except OSError:
        return 0

    for child in children:
        try:
            if not child.is_dir() or not child.name.startswith("asset_"):
                continue
            if referenced_asset_ids is not None and child.name in referenced_asset_ids:
                continue
            if child.stat().st_mtime > cutoff:
                continue
            shutil.rmtree(child)
            removed += 1
        except OSError:
            continue

    return removed


def cleanup_orphaned_assets(
    app: FastAPI,
    quizzes: list[dict],
    *,
    now_timestamp: float | None = None,
    min_age_seconds: int = ORPHAN_ASSET_RETENTION_SECONDS,
) -> int:
    referenced_asset_ids = _extract_referenced_asset_ids(quizzes)
    return _purge_staging_orphans(
        get_storage(app),
        referenced_asset_ids,
        now_timestamp=now_timestamp,
        min_age_seconds=min_age_seconds,
    )


def purge_stale_editor_staging(
    app: FastAPI,
    *,
    now_timestamp: float | None = None,
    min_age_seconds: int = ORPHAN_ASSET_RETENTION_SECONDS,
) -> int:
    """Periodic purge: remove old ``storage/uploads/quiz-assets/asset_*`` (editor cache)."""
    return _purge_staging_orphans(
        get_storage(app),
        None,
        now_timestamp=now_timestamp,
        min_age_seconds=min_age_seconds,
    )


def serve_asset(app: FastAPI, asset_path: str) -> FileResponse:
    if not _is_safe_asset_path(asset_path):
        raise HTTPException(status_code=404, detail="Nie znaleziono zasobu.")

    storage = get_storage(app)
    candidate = storage.staging_dir / asset_path

    # Only serve .webp files — the only format the upload pipeline produces.
    if candidate.suffix.lower() != ".webp":
        raise HTTPException(status_code=404, detail="Nie znaleziono zasobu.")

    # Reject symlinks anywhere in the path to prevent traversal.
    for parent in [candidate] + list(candidate.parents):
        if parent == storage.staging_dir:
            break
        if parent.is_symlink():
            raise HTTPException(status_code=404, detail="Nie znaleziono zasobu.")

    resolved = candidate.resolve()
    _assert_relative_to(resolved, storage.staging_dir)

    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="Nie znaleziono zasobu.")

    # Assets are content-addressed by UUID — safe to cache indefinitely.
    return FileResponse(
        resolved,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
