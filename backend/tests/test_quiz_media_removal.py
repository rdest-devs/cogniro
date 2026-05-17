"""Removing a question image in the admin editor deletes quiz-owned media files on save."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi.testclient import TestClient


def _minimal_upsert(*, image: str | None) -> dict:
    q: dict = {
        "id": "Q1",
        "text": "Pytanie?",
        "type": "singlechoice",
        "choices": [
            {"text": "A", "is_correct": True},
            {"text": "B", "is_correct": False},
        ],
    }
    if image is not None:
        q["image"] = image
    return {
        "title": "Quiz z obrazem",
        "questions": [q],
    }


def test_update_quiz_deletes_obsolete_media_files(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    r = client.post(
        "/admin/quiz",
        json=_minimal_upsert(image=None),
        headers=admin_token_header,
    )
    assert r.status_code == 200
    quiz_id = r.json()["id"]

    data_dir = Path(os.environ["COGNIRO_DATA_DIR"])
    quiz_dir = data_dir / "storage" / "quizzes" / quiz_id
    asset_dir = "asset_deadbeefdeadbeefdeadbeefdeadbeef"
    media_dir = quiz_dir / "media" / asset_dir
    media_dir.mkdir(parents=True, exist_ok=True)
    (media_dir / "image.webp").write_bytes(b"\xff\xd8\xff\xd9")
    (media_dir / "thumb.webp").write_bytes(b"thumb")

    p_with = _minimal_upsert(image=f"./media/{asset_dir}/image.webp")
    assert (
        client.put(
            f"/admin/quiz/{quiz_id}",
            json=p_with,
            headers=admin_token_header,
        ).status_code
        == 200
    )
    assert (media_dir / "image.webp").is_file()
    assert (media_dir / "thumb.webp").is_file()

    p_without = _minimal_upsert(image=None)
    assert (
        client.put(
            f"/admin/quiz/{quiz_id}",
            json=p_without,
            headers=admin_token_header,
        ).status_code
        == 200
    )
    assert not (media_dir / "image.webp").exists()
    assert not (media_dir / "thumb.webp").exists()
    assert not media_dir.exists()
