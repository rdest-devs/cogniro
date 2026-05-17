from __future__ import annotations

import io
import zipfile

from fastapi.testclient import TestClient


def _minimal_quiz_payload() -> dict:
    return {
        "title": "Quiz testowy",
        "questions": [
            {
                "text": "Pytanie?",
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


def test_export_returns_zip_with_kqf(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    r = client.get(f"/admin/quiz/{quiz_id}/export", headers=admin_token_header)
    assert r.status_code == 200
    assert r.headers.get("content-type") == "application/zip"
    with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
        assert "quiz.kqf" in zf.namelist()


def test_export_404_for_unknown_quiz(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    r = client.get("/admin/quiz/quiz_nonexistent/export", headers=admin_token_header)
    assert r.status_code == 404


def test_export_then_import_creates_new_quiz(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    zip_bytes = client.get(
        f"/admin/quiz/{quiz_id}/export", headers=admin_token_header
    ).content
    r = client.post(
        "/admin/quiz/import",
        files={"file": ("q.zip", zip_bytes, "application/zip")},
        headers=admin_token_header,
    )
    assert r.status_code == 200
    new_id = r.json()["id"]
    assert new_id != quiz_id
    got = client.get(f"/admin/quiz/{new_id}", headers=admin_token_header)
    assert got.status_code == 200


def test_import_rejects_zip_without_kqf(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("readme.txt", "x")
    r = client.post(
        "/admin/quiz/import",
        files={"file": ("q.zip", buf.getvalue(), "application/zip")},
        headers=admin_token_header,
    )
    assert r.status_code == 400


def test_import_rejects_bad_zip(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    r = client.post(
        "/admin/quiz/import",
        files={"file": ("q.zip", b"not a zip", "application/zip")},
        headers=admin_token_header,
    )
    assert r.status_code == 400


def test_import_skips_path_traversal_member(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    base_zip = client.get(
        f"/admin/quiz/{quiz_id}/export", headers=admin_token_header
    ).content
    with zipfile.ZipFile(io.BytesIO(base_zip), "r") as zin:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zout:
            for name in zin.namelist():
                zout.writestr(name, zin.read(name))
            zout.writestr("media/../../../evil.txt", b"pwned")
    r = client.post(
        "/admin/quiz/import",
        files={"file": ("q.zip", buf.getvalue(), "application/zip")},
        headers=admin_token_header,
    )
    assert r.status_code == 200
