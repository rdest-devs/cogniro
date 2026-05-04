from __future__ import annotations

import io
import json
from pathlib import Path
import sys
import tempfile

from fastapi.testclient import TestClient
from PIL import Image

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import app


def _create_png_bytes(width: int = 1200, height: int = 800) -> bytes:
    buffer = io.BytesIO()
    image = Image.new("RGB", (width, height), color=(120, 80, 200))
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _minimal_quiz_payload() -> dict:
    return {
        "title": "Quiz testowy",
        "time_limit": None,
        "shuffle_questions": False,
        "show_answers_after": True,
        "show_leaderboard_after": False,
        "questions": [
            {
                "text": "Co jest na obrazku?",
                "type": "single_choice",
                "answers": [
                    {"text": "A", "is_correct": True},
                    {"text": "B", "is_correct": False},
                ],
            }
        ],
    }


def test_startup_initializes_storage(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))
    monkeypatch.delenv("MEDIA_PUBLIC_PREFIX", raising=False)

    with TestClient(app):
        quizzes_file = data_dir / "quizzes" / "quizzes.json"
        uploads_dir = data_dir / "uploads" / "quiz-assets"

        assert quizzes_file.exists()
        assert uploads_dir.exists()
        assert json.loads(quizzes_file.read_text(encoding="utf-8")) == {"quizzes": []}


def test_admin_quiz_create_get_update_and_list(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))

    with TestClient(app) as client:
        create_response = client.post("/admin/quiz", json=_minimal_quiz_payload())
        assert create_response.status_code == 200
        quiz_id = create_response.json()["id"]
        assert isinstance(quiz_id, str)

        list_response = client.get("/admin/quiz/all")
        assert list_response.status_code == 200
        listed = list_response.json()
        assert len(listed) == 1
        assert listed[0]["id"] == quiz_id
        assert listed[0]["participants_count"] == 0

        details_response = client.get(f"/admin/quiz/{quiz_id}")
        assert details_response.status_code == 200
        details = details_response.json()
        assert details["id"] == quiz_id
        assert details["title"] == "Quiz testowy"
        assert details["questions"][0]["type"] == "single_choice"
        assert "id" not in details["questions"][0]
        assert "id" not in details["questions"][0]["answers"][0]
        assert "id" not in details["questions"][0]["answers"][1]

        update_payload = _minimal_quiz_payload()
        update_payload["title"] = "Quiz po aktualizacji"
        update_payload["questions"][0]["text"] = ""
        update_payload["questions"][0]["image"] = {
            "assetId": "asset_demo",
            "url": "/media/quiz-assets/asset_demo/image.webp",
            "thumbUrl": "/media/quiz-assets/asset_demo/thumb.webp",
            "width": 720,
            "height": 400,
            "alt": "",
        }
        update_payload["questions"][0]["answers"][0]["text"] = ""
        update_payload["questions"][0]["answers"][0]["image"] = {
            "assetId": "asset_demo_answer",
            "url": "/media/quiz-assets/asset_demo_answer/image.webp",
            "thumbUrl": "/media/quiz-assets/asset_demo_answer/thumb.webp",
            "width": 256,
            "height": 256,
            "alt": "",
        }

        update_response = client.put(f"/admin/quiz/{quiz_id}", json=update_payload)
        assert update_response.status_code == 200

        after_update = client.get(f"/admin/quiz/{quiz_id}")
        assert after_update.status_code == 200
        updated = after_update.json()
        assert updated["title"] == "Quiz po aktualizacji"
        assert updated["questions"][0]["text"] == ""
        assert "id" not in updated["questions"][0]
        assert "id" not in updated["questions"][0]["answers"][0]
        assert "id" not in updated["questions"][0]["answers"][1]
        assert updated["questions"][0]["image"]["assetId"] == "asset_demo"
        assert (
            updated["questions"][0]["answers"][0]["image"]["assetId"]
            == "asset_demo_answer"
        )

        quizzes_file = data_dir / "quizzes" / "quizzes.json"
        stored_payload = json.loads(quizzes_file.read_text(encoding="utf-8"))
        assert len(stored_payload["quizzes"]) == 1
        assert stored_payload["quizzes"][0]["title"] == "Quiz po aktualizacji"


def test_admin_quiz_rejects_blank_title(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))

    payload = _minimal_quiz_payload()
    payload["title"] = "   "

    with TestClient(app) as client:
        response = client.post("/admin/quiz", json=payload)
        assert response.status_code == 422


def test_admin_assets_upload_and_processing(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))
    monkeypatch.delenv("MEDIA_PUBLIC_PREFIX", raising=False)

    png_bytes = _create_png_bytes(1200, 800)

    with TestClient(app) as client:
        response = client.post(
            "/admin/assets",
            files={"file": ("input.png", png_bytes, "image/png")},
        )

        assert response.status_code == 200
        payload = response.json()

        assert payload["assetId"].startswith("asset_")
        assert payload["url"].endswith("/image.webp")
        assert payload["thumbUrl"].endswith("/thumb.webp")
        assert payload["url"].startswith("/media/quiz-assets/")
        assert payload["thumbUrl"].startswith("/media/quiz-assets/")
        assert payload["width"] <= 720
        assert payload["height"] > 0
        assert payload["alt"] == ""

        asset_dir = data_dir / "uploads" / "quiz-assets" / payload["assetId"]
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
        invalid_type_response = client.post(
            "/admin/assets",
            files={"file": ("not-image.txt", b"hello", "text/plain")},
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
        )
        assert too_large_response.status_code == 413
        assert "Maksymalny rozmiar pliku to 5 MB" in too_large_response.json()["detail"]


def test_admin_assets_rejects_too_many_pixels(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setenv("COGNIRO_DATA_DIR", str(data_dir))

    large_pixel_png = _create_png_bytes(5000, 5000)

    with TestClient(app) as client:
        response = client.post(
            "/admin/assets",
            files={"file": ("huge-dimensions.png", large_pixel_png, "image/png")},
        )

        assert response.status_code == 413
        assert "Obraz ma zbyt duże wymiary" in response.json()["detail"]


def test_resolve_data_dir_falls_back_when_default_is_not_writable(
    monkeypatch, tmp_path: Path
) -> None:
    import storage_service

    readonly_default = tmp_path / "readonly-default"
    readonly_default.mkdir()
    readonly_default.chmod(0o555)

    monkeypatch.delenv("COGNIRO_DATA_DIR", raising=False)
    monkeypatch.setattr(storage_service, "DEFAULT_DATA_DIR", str(readonly_default))

    resolved = storage_service.resolve_data_dir()

    assert resolved == Path(tempfile.gettempdir()) / "cogniro"
