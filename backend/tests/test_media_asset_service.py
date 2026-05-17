from __future__ import annotations

import io
import os
from pathlib import Path
import sys
import threading

from fastapi import FastAPI, UploadFile
from PIL import Image
import pytest
from starlette.datastructures import Headers

sys.path.append(str(Path(__file__).resolve().parents[1]))

import services.media_assets as media_assets_service
from schemas.admin_quiz import QuizAssetUploadResponse
from services.media_assets import (
    _is_safe_asset_path,
    cleanup_orphaned_assets,
    resize_to_webp_bytes,
)
from services.storage import initialize_storage


def _transparent_png_bytes() -> bytes:
    image = Image.new("RGBA", (10, 10), color=(255, 0, 0, 255))
    image.putpixel((0, 0), (0, 0, 0, 0))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _jpeg_with_orientation_bytes(orientation: int = 6) -> bytes:
    image = Image.new("RGB", (40, 20), color=(10, 20, 30))
    exif = image.getexif()
    exif[274] = orientation
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", exif=exif)
    return buffer.getvalue()


def test_resize_to_webp_preserves_alpha_channel() -> None:
    source = Image.open(io.BytesIO(_transparent_png_bytes()))
    source.load()

    output, _, _ = resize_to_webp_bytes(source, max_width=10, quality=80)

    with Image.open(io.BytesIO(output)) as result:
        assert result.mode == "RGBA"
        alpha_min, _ = result.getchannel("A").getextrema()
        assert alpha_min == 0


def test_resize_to_webp_applies_exif_orientation() -> None:
    source = Image.open(io.BytesIO(_jpeg_with_orientation_bytes()))
    source.load()

    _, width, height = resize_to_webp_bytes(source, max_width=100, quality=80)

    assert (width, height) == (20, 40)


def test_is_safe_asset_path_rejects_absolute() -> None:
    assert _is_safe_asset_path("/etc/passwd") is False


def _small_png_bytes() -> bytes:
    image = Image.new("RGB", (10, 10), color=(10, 20, 30))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.mark.anyio
async def test_upload_asset_runs_in_threadpool(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    app = FastAPI()
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(tmp_path))
    app.state.storage = initialize_storage()

    main_thread = threading.get_ident()
    worker_thread: dict[str, int] = {}

    def _fake_process(app_ref: FastAPI, raw_data: bytes) -> QuizAssetUploadResponse:
        worker_thread["id"] = threading.get_ident()
        return QuizAssetUploadResponse(
            assetId="asset_test",
            url="/media/quiz-assets/asset_test/image.webp",
            thumbUrl="/media/quiz-assets/asset_test/thumb.webp",
            width=10,
            height=10,
            alt="",
        )

    monkeypatch.setattr(media_assets_service, "_process_upload_bytes", _fake_process)

    upload = UploadFile(
        file=io.BytesIO(_small_png_bytes()),
        filename="input.png",
        headers=Headers({"content-type": "image/png"}),
    )

    response = await media_assets_service.upload_asset(app, upload)

    assert response.assetId == "asset_test"
    assert worker_thread["id"] != main_thread


def test_cleanup_orphaned_assets_keeps_referenced_and_recent(
    monkeypatch, tmp_path: Path
) -> None:
    app = FastAPI()
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(tmp_path))
    app.state.storage = initialize_storage()

    uploads_dir = app.state.storage.staging_dir
    referenced = uploads_dir / "asset_referenced"
    stale_orphan = uploads_dir / "asset_stale_orphan"
    fresh_orphan = uploads_dir / "asset_fresh_orphan"

    referenced.mkdir()
    stale_orphan.mkdir()
    fresh_orphan.mkdir()

    old_mtime = 900.0
    new_mtime = 980.0
    os.utime(referenced, (old_mtime, old_mtime))
    os.utime(stale_orphan, (old_mtime, old_mtime))
    os.utime(fresh_orphan, (new_mtime, new_mtime))

    removed = cleanup_orphaned_assets(
        app,
        quizzes=[
            {
                "questions": [
                    {
                        "image": {"assetId": "asset_referenced"},
                        "answers": [],
                    }
                ]
            }
        ],
        now_timestamp=1000.0,
        min_age_seconds=50,
    )

    assert removed == 1
    assert referenced.exists()
    assert fresh_orphan.exists()
    assert not stale_orphan.exists()


def test_cleanup_orphaned_assets_handles_directory_listing_errors(
    monkeypatch, tmp_path: Path
) -> None:
    app = FastAPI()
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(tmp_path))
    app.state.storage = initialize_storage()

    target_dir = app.state.storage.staging_dir
    real_iterdir = Path.iterdir

    def _iterdir_with_failure(path: Path):
        if path == target_dir:
            raise OSError("simulated listing failure")
        return real_iterdir(path)

    monkeypatch.setattr(Path, "iterdir", _iterdir_with_failure)

    removed = cleanup_orphaned_assets(app, quizzes=[])
    assert removed == 0
