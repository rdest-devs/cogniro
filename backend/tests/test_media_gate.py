from __future__ import annotations

import os
from pathlib import Path

from fastapi.testclient import TestClient


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


def test_media_returns_403_when_not_running(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz_with_media(client, admin_token_header, file_name="dog.jpg")
    r = client.get(f"/media/{quiz_id}/dog.jpg")
    assert r.status_code == 403


def test_media_returns_200_while_running(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz_with_media(client, admin_token_header, file_name="dog.jpg")
    client.post(f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header)
    r = client.get(f"/media/{quiz_id}/dog.jpg")
    assert r.status_code == 200


def test_media_path_traversal_returns_404(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    client.post(f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header)
    r = client.get(f"/media/{quiz_id}/..%2Fetc%2Fpasswd")
    assert r.status_code == 404
