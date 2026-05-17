from __future__ import annotations

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


def test_activate_returns_pin_and_join_url(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    r = client.post(f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header)
    assert r.status_code == 200
    body = r.json()
    assert len(body["pin"]) == 6
    assert body["join_url"].endswith(f"/play/?code={body['pin']}")
    r2 = client.post(f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header)
    assert r2.status_code == 409


def test_session_snapshot_lists_participants(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    r = client.get(f"/admin/quiz/{quiz_id}/session", headers=admin_token_header)
    assert r.status_code == 200
    body = r.json()
    assert body["pin"] == pin
    assert body["participants"][0]["nickname"] == "Ala"
    assert body["participants"][0]["has_submitted"] is False


def test_block_endpoint_marks_blocked(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    client.post(f"/play/{pin}/join", json={"nickname": "Bartek"})
    r = client.post(
        f"/admin/quiz/{quiz_id}/session/block",
        json={"nickname": "Bartek"},
        headers=admin_token_header,
    )
    assert r.status_code == 200
    snap = client.get(
        f"/admin/quiz/{quiz_id}/session", headers=admin_token_header
    ).json()
    assert snap["participants"][0]["blocked"] is True


def test_stop_flushes_result_file(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    client.post(f"/play/{pin}/submit", json={"nickname": "Ala", "score": 4500})
    r = client.post(f"/admin/quiz/{quiz_id}/stop", headers=admin_token_header)
    assert r.status_code == 200
    body = r.json()
    assert body["date"]
    assert body["filename"].endswith(".json")
    assert (
        client.get(
            f"/admin/quiz/{quiz_id}/session", headers=admin_token_header
        ).status_code
        == 404
    )
