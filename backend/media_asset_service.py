from __future__ import annotations

from io import BytesIO
from pathlib import Path, PurePosixPath
import uuid

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError


from models import QuizAssetUploadResponse
from settings import (
    ALLOWED_UPLOAD_MIME_TYPES,
    MAX_IMAGE_PIXELS,
    MAX_UPLOAD_BYTES,
    MEDIA_PUBLIC_PREFIX,
    UPLOAD_CHUNK_SIZE,
)
from storage_service import get_storage

_ALLOWED_PILLOW_FORMATS = {"JPEG", "PNG", "WEBP"}


def _is_safe_asset_path(asset_path: str) -> bool:
    """Reject path components that could escape the uploads directory."""
    parts = PurePosixPath(asset_path).parts
    return all(part != ".." and part != "." for part in parts)


def _assert_relative_to(resolved: Path, base: Path) -> None:
    try:
        resolved.relative_to(base.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Nie znaleziono zasobu.") from exc


def resize_to_webp_bytes(
    source: Image.Image, *, max_width: int, quality: int
) -> tuple[bytes, int, int]:
    image = source.convert("RGB")

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


async def upload_asset(app: FastAPI, file: UploadFile) -> QuizAssetUploadResponse:
    # NOTE: content_type is client-supplied; real format validation happens
    # after Pillow opens the image (see _ALLOWED_PILLOW_FORMATS check below).
    if file.content_type not in ALLOWED_UPLOAD_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Nieprawidłowy typ pliku. Dozwolone typy plików: JPEG, PNG, WebP.",
        )

    raw_data = await _read_upload_with_limit(file, MAX_UPLOAD_BYTES)

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
    asset_dir = storage.uploads_quiz_assets_dir / asset_id
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


def serve_asset(app: FastAPI, asset_path: str) -> FileResponse:
    if not _is_safe_asset_path(asset_path):
        raise HTTPException(status_code=404, detail="Nie znaleziono zasobu.")

    storage = get_storage(app)
    candidate = storage.uploads_quiz_assets_dir / asset_path

    # Only serve .webp files — the only format the upload pipeline produces.
    if candidate.suffix.lower() != ".webp":
        raise HTTPException(status_code=404, detail="Nie znaleziono zasobu.")

    # Reject symlinks anywhere in the path to prevent traversal.
    for parent in [candidate] + list(candidate.parents):
        if parent == storage.uploads_quiz_assets_dir:
            break
        if parent.is_symlink():
            raise HTTPException(status_code=404, detail="Nie znaleziono zasobu.")

    resolved = candidate.resolve()
    _assert_relative_to(resolved, storage.uploads_quiz_assets_dir)

    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="Nie znaleziono zasobu.")

    # Assets are content-addressed by UUID — safe to cache indefinitely.
    return FileResponse(
        resolved,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
