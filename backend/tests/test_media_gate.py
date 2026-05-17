from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from services import sessions as sessions_service


def _minimal_quiz_payload() -> dict:
    return {
        "title": "Quiz z mediami",
        "questions": [
            {
                "text": "Obrazek?",
                "type": "singlechoice",
                "choices": [
                    {"text": "A", "is_correct": True},
                    {"text": "B", "is_correct": False},
                ],
            }
        ],
    }


def _create_quiz(client: TestClient, headers: dict[str, str]) -> str:
    r = client.post("/admin/quiz", json=_minimal_quiz_payload(), headers=headers)
    assert r.status_code == 200
    return r.json()["id"]


def _create_quiz_with_media(
    client: TestClient, headers: dict[str, str], *, file_name: str
) -> str:
    quiz_id = _create_quiz(client, headers)
    data_dir = Path(os.environ["COGNIRO_DATA_DIR"])
    media_file = data_dir / "storage" / "quizzes" / quiz_id / "media" / file_name
    media_file.parent.mkdir(parents=True, exist_ok=True)
    media_file.write_bytes(b"\xff\xd8\xff\xd9")  # minimal JPEG SOI/EOI
    return quiz_id


def test_media_returns_403_without_active_session(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz_with_media(client, admin_token_header, file_name="dog.jpg")
    r = client.get(f"/media/{quiz_id}/dog.jpg")
    assert r.status_code == 403


def test_media_returns_200_when_quiz_session_running(
    client: TestClient,
    admin_token_header: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    quiz_id = _create_quiz_with_media(client, admin_token_header, file_name="dog.jpg")
    monkeypatch.setattr(sessions_service, "is_quiz_running", lambda qid: qid == quiz_id)
    r = client.get(f"/media/{quiz_id}/dog.jpg")
    assert r.status_code == 200


def test_admin_quiz_media_returns_200_with_token(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz_with_media(client, admin_token_header, file_name="dog.jpg")
    r = client.get(
        f"/admin/quiz/{quiz_id}/media/dog.jpg",
        headers=admin_token_header,
    )
    assert r.status_code == 200


def test_admin_quiz_media_returns_401_without_token(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz_with_media(client, admin_token_header, file_name="dog.jpg")
    r = client.get(f"/admin/quiz/{quiz_id}/media/dog.jpg")
    assert r.status_code == 401


def test_media_path_traversal_returns_404(
    client: TestClient,
    admin_token_header: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    monkeypatch.setattr(sessions_service, "is_quiz_running", lambda qid: qid == quiz_id)
    r = client.get(f"/media/{quiz_id}/..%2Fetc%2Fpasswd")
    assert r.status_code == 404


def test_admin_quiz_media_serves_staging_before_quiz_save(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    """Editor upload writes to staging; preview GET must work before quiz PUT copies files."""
    quiz_id = _create_quiz(client, admin_token_header)
    data_dir = Path(os.environ["COGNIRO_DATA_DIR"])
    staging = data_dir / "storage" / "uploads" / "quiz-assets"
    staging.mkdir(parents=True, exist_ok=True)
    aid = f"asset_{'b' * 32}"
    asset_dir = staging / aid
    asset_dir.mkdir(parents=True, exist_ok=True)
    (asset_dir / "thumb.webp").write_bytes(b"thumb-bytes")
    (asset_dir / "image.webp").write_bytes(b"img-bytes")
    r_thumb = client.get(
        f"/admin/quiz/{quiz_id}/media/{aid}/thumb.webp",
        headers=admin_token_header,
    )
    assert r_thumb.status_code == 200
    assert r_thumb.content == b"thumb-bytes"
    r_img = client.get(
        f"/admin/quiz/{quiz_id}/media/{aid}/image.webp",
        headers=admin_token_header,
    )
    assert r_img.status_code == 200
    assert r_img.content == b"img-bytes"


def test_admin_quiz_media_path_traversal_returns_404(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    r = client.get(
        f"/admin/quiz/{quiz_id}/media/..%2Fetc%2Fpasswd",
        headers=admin_token_header,
    )
    assert r.status_code == 404
