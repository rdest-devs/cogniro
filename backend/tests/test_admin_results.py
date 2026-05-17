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


def test_results_list_endpoints(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    client.post(f"/play/{pin}/submit", json={"nickname": "Ala", "score": 100})
    stop1 = client.post(
        f"/admin/quiz/{quiz_id}/stop", headers=admin_token_header
    ).json()

    dates = client.get("/admin/results", headers=admin_token_header).json()
    assert stop1["date"] in dates

    files = client.get(
        f"/admin/results/{stop1['date']}", headers=admin_token_header
    ).json()
    assert any(f["filename"] == stop1["filename"] for f in files)

    full = client.get(
        f"/admin/results/{stop1['date']}/{stop1['filename']}",
        headers=admin_token_header,
    ).json()
    assert full["quiz_id"] == quiz_id
    assert full["max_score"] == 1
    assert full["scores"][0]["score"] == 100


def test_delete_file_and_day(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    client.post(f"/play/{pin}/submit", json={"nickname": "Ala", "score": 1})
    stop = client.post(f"/admin/quiz/{quiz_id}/stop", headers=admin_token_header).json()

    assert (
        client.delete(
            f"/admin/results/{stop['date']}/{stop['filename']}",
            headers=admin_token_header,
        ).status_code
        == 204
    )
    assert (
        client.delete(
            f"/admin/results/{stop['date']}", headers=admin_token_header
        ).status_code
        == 204
    )
