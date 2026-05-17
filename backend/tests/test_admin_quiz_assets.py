from __future__ import annotations

import io
from pathlib import Path
import sys

from fastapi.testclient import TestClient
from PIL import Image

sys.path.append(str(Path(__file__).resolve().parents[1]))

from core import settings
import services.media_assets as media_assets_service
import services.sessions as sessions_service
from main import app
from tests.auth_test_constants import TEST_ADMIN_PASSWORD


def _create_png_bytes(width: int = 1200, height: int = 800) -> bytes:
    buffer = io.BytesIO()
    image = Image.new("RGB", (width, height), color=(120, 80, 200))
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _minimal_quiz_payload() -> dict:
    return {
        "title": "Quiz testowy",
        "questions": [
            {
                "text": "Co jest na obrazku?",
                "type": "singlechoice",
                "choices": [
                    {"text": "A", "is_correct": True},
                    {"text": "B", "is_correct": False},
                ],
            }
        ],
    }


def _admin_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/admin/auth/login",
        json={"password": TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _patch_media_prefix(monkeypatch) -> str:
    prefix = settings.normalize_media_public_prefix(
        settings.DEFAULT_MEDIA_PUBLIC_PREFIX
    )
    monkeypatch.setattr(settings, "MEDIA_PUBLIC_PREFIX", prefix)
    monkeypatch.setattr(media_assets_service, "MEDIA_PUBLIC_PREFIX", prefix)
    return prefix


def test_startup_initializes_storage(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))
    _patch_media_prefix(monkeypatch)

    with TestClient(app):
        assert (data_dir / "storage" / "quizzes").is_dir()
        assert (data_dir / "storage" / "results").is_dir()
        assert (data_dir / "storage" / "uploads" / "quiz-assets").is_dir()


def test_admin_quiz_create_get_update_list_delete(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))
    _patch_media_prefix(monkeypatch)

    with TestClient(app) as client:
        headers = _admin_headers(client)

        create_response = client.post(
            "/admin/quiz",
            json=_minimal_quiz_payload(),
            headers=headers,
        )
        assert create_response.status_code == 200
        quiz_id = create_response.json()["id"]
        assert isinstance(quiz_id, str)

        list_response = client.get("/admin/quiz/all", headers=headers)
        assert list_response.status_code == 200
        listed = list_response.json()
        assert len(listed) == 1
        assert listed[0]["id"] == quiz_id
        assert listed[0]["question_count"] == 1
        assert listed[0]["status"] == "idle"
        assert "participants_count" not in listed[0]

        details_response = client.get(f"/admin/quiz/{quiz_id}", headers=headers)
        assert details_response.status_code == 200
        details = details_response.json()
        assert details["id"] == quiz_id
        assert details["title"] == "Quiz testowy"
        assert details["questions"][0]["type"] == "singlechoice"
        assert details["questions"][0]["id"] == "Q1"
        assert details["questions"][0]["choices"][0]["text"] == "A"

        update_payload = _minimal_quiz_payload()
        update_payload["title"] = "Quiz po aktualizacji"
        update_payload["questions"][0]["text"] = "Z tekstem"
        aid = "asset_" + "d" * 32
        staging_asset = data_dir / "storage" / "uploads" / "quiz-assets" / aid
        staging_asset.mkdir(parents=True, exist_ok=True)
        (staging_asset / "image.webp").write_bytes(b"\xff\xd8\xff\xd9")
        (staging_asset / "thumb.webp").write_bytes(b"thumb")
        update_payload["questions"][0]["image"] = (
            f"{settings.MEDIA_PUBLIC_PREFIX}/{aid}/image.webp"
        )

        update_response = client.put(
            f"/admin/quiz/{quiz_id}",
            json=update_payload,
            headers=headers,
        )
        assert update_response.status_code == 200

        after_update = client.get(f"/admin/quiz/{quiz_id}", headers=headers)
        assert after_update.status_code == 200
        updated = after_update.json()
        assert updated["title"] == "Quiz po aktualizacji"
        assert updated["questions"][0]["text"] == "Z tekstem"
        assert updated["questions"][0]["image"] == f"./media/{aid}"

        quiz_dir = data_dir / "storage" / "quizzes" / quiz_id
        assert (quiz_dir / "quiz.kqf").is_file()
        assert (quiz_dir / "meta.json").is_file()

        delete_response = client.delete(f"/admin/quiz/{quiz_id}", headers=headers)
        assert delete_response.status_code == 204
        assert not quiz_dir.exists()

        missing = client.get(f"/admin/quiz/{quiz_id}", headers=headers)
        assert missing.status_code == 404


def test_admin_quiz_delete_while_running_returns_409(
    monkeypatch, tmp_path: Path
) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))
    monkeypatch.setattr(sessions_service, "is_quiz_running", lambda _qid: True)

    with TestClient(app) as client:
        headers = _admin_headers(client)
        create = client.post(
            "/admin/quiz", json=_minimal_quiz_payload(), headers=headers
        )
        quiz_id = create.json()["id"]
        delete_response = client.delete(f"/admin/quiz/{quiz_id}", headers=headers)
        assert delete_response.status_code == 409


def test_admin_quiz_rejects_blank_title(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))

    payload = _minimal_quiz_payload()
    payload["title"] = "   "

    with TestClient(app) as client:
        response = client.post(
            "/admin/quiz",
            json=payload,
            headers=_admin_headers(client),
        )
        assert response.status_code == 422


def test_admin_quiz_multichoice_truefalse_slider_roundtrip(
    monkeypatch, tmp_path: Path
) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))

    payload = {
        "title": "Mix",
        "questions": [
            {
                "type": "multichoice",
                "text": "Pick",
                "choices": [
                    {"text": "a", "is_correct": True},
                    {"text": "b", "is_correct": True},
                    {"text": "c", "is_correct": False},
                ],
            },
            {"type": "truefalse", "text": "Prawda?", "correct": True},
            {
                "type": "slider",
                "text": "Rok?",
                "correct": 2000,
                "min": 1990,
                "max": 2010,
                "step": 1,
                "tolerance": 0,
                "unit": "rok",
            },
        ],
    }

    with TestClient(app) as client:
        headers = _admin_headers(client)
        r = client.post("/admin/quiz", json=payload, headers=headers)
        assert r.status_code == 200
        qid = r.json()["id"]
        got = client.get(f"/admin/quiz/{qid}", headers=headers).json()
        assert got["questions"][0]["type"] == "multichoice"
        assert got["questions"][1]["type"] == "truefalse"
        assert got["questions"][1]["correct"] is True
        assert got["questions"][2]["type"] == "slider"
        assert got["questions"][2]["correct"] == 2000


def test_admin_assets_upload_and_processing(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))
    media_prefix = _patch_media_prefix(monkeypatch)

    png_bytes = _create_png_bytes(1200, 800)

    with TestClient(app) as client:
        headers = _admin_headers(client)
        response = client.post(
            "/admin/assets",
            files={"file": ("input.png", png_bytes, "image/png")},
            headers=headers,
        )

        assert response.status_code == 200
        payload = response.json()

        assert payload["assetId"].startswith("asset_")
        assert payload["url"].endswith("/image.webp")
        assert payload["thumbUrl"].endswith("/thumb.webp")
        assert payload["url"].startswith(f"{media_prefix}/")
        assert payload["thumbUrl"].startswith(f"{media_prefix}/")
        assert payload["width"] <= 720
        assert payload["height"] > 0
        assert payload["alt"] == ""

        asset_dir = (
            data_dir / "storage" / "uploads" / "quiz-assets" / payload["assetId"]
        )
        image_path = asset_dir / "image.webp"
        thumb_path = asset_dir / "thumb.webp"

        assert image_path.exists()
        assert thumb_path.exists()

        with Image.open(image_path) as image:
            assert image.format == "WEBP"
            assert image.width == payload["width"]
            assert image.height == payload["height"]
            assert image.width <= 720

        with Image.open(thumb_path) as thumb:
            assert thumb.format == "WEBP"
            assert thumb.width <= 256


def test_admin_assets_rejects_invalid_type_and_too_large(
    monkeypatch, tmp_path: Path
) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))

    with TestClient(app) as client:
        headers = _admin_headers(client)
        invalid_type_response = client.post(
            "/admin/assets",
            files={"file": ("not-image.txt", b"hello", "text/plain")},
            headers=headers,
        )
        assert invalid_type_response.status_code == 400
        assert (
            "Dozwolone typy plików: JPEG, PNG, WebP"
            in invalid_type_response.json()["detail"]
        )

        too_large_response = client.post(
            "/admin/assets",
            files={
                "file": (
                    "large.png",
                    b"a" * (5 * 1024 * 1024 + 1),
                    "image/png",
                )
            },
            headers=headers,
        )
        assert too_large_response.status_code == 413
        assert "Maksymalny rozmiar pliku to 5 MB" in too_large_response.json()["detail"]


def test_admin_assets_rejects_too_many_pixels(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))

    large_pixel_png = _create_png_bytes(5000, 5000)

    with TestClient(app) as client:
        headers = _admin_headers(client)
        response = client.post(
            "/admin/assets",
            files={"file": ("huge-dimensions.png", large_pixel_png, "image/png")},
            headers=headers,
        )

        assert response.status_code == 413
        assert "Obraz ma zbyt duże wymiary" in response.json()["detail"]


def test_resolve_data_dir_falls_back_when_default_is_not_writable(
    monkeypatch, tmp_path: Path
) -> None:
    import services.storage as storage_service
    import tempfile

    readonly_default = tmp_path / "readonly-default"
    readonly_default.mkdir()

    real_write_text = Path.write_text

    def write_text_probe(self: Path, data: str, *args, **kwargs) -> int:
        if self.parent == readonly_default and self.name.startswith(".write_probe_"):
            raise OSError("simulated read-only directory")
        return real_write_text(self, data, *args, **kwargs)

    monkeypatch.setattr(Path, "write_text", write_text_probe)

    monkeypatch.delenv("COGNIRO_DATA_DIR", raising=False)
    monkeypatch.setattr(storage_service, "DEFAULT_DATA_DIR", str(readonly_default))

    resolved = storage_service.resolve_data_dir()

    assert resolved == Path(tempfile.gettempdir()) / "cogniro"
