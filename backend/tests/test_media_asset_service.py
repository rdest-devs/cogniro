from __future__ import annotations

import io
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
from services.media_assets import _is_safe_asset_path, resize_to_webp_bytes
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
