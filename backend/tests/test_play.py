from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _minimal_quiz_payload(*, image: str | None = None) -> dict:
    q: dict = {
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
    if image is not None:
        q["questions"][0]["image"] = image
    return q


def _create_quiz(client: TestClient, headers: dict[str, str], **kwargs: object) -> str:
    r = client.post(
        "/admin/quiz",
        json=_minimal_quiz_payload(**kwargs),
        headers=headers,
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_join_unknown_pin_returns_404(client: TestClient) -> None:
    r = client.post("/play/AAAAAA/join", json={"nickname": "Ala"})
    assert r.status_code == 404


def test_join_returns_quiz_payload(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    r = client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    assert r.status_code == 200
    body = r.json()
    assert body["front_matter"]["title"]
    assert body["questions"][0]["type"] == "singlechoice"


def test_join_rewrites_relative_media_url(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header, image="./media/dog.jpg")
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    r = client.post(f"/play/{pin}/join", json={"nickname": "U1"})
    assert r.status_code == 200
    img = r.json()["questions"][0]["media"]["image"]
    assert img.startswith("http://")
    assert f"/media/{quiz_id}/dog.jpg" in img


def test_join_returns_404_when_session_stopped_mid_call(
    client: TestClient,
    admin_token_header: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Race: PIN is active at lookup but session is stopped before register_participant."""
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]

    from services import sessions as sessions_service

    def _raise_lookup(*, pin: str, nickname: str) -> None:
        raise LookupError("pin_not_active")

    monkeypatch.setattr(sessions_service, "register_participant", _raise_lookup)
    r = client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    assert r.status_code == 404
    assert r.json()["detail"] == "pin_not_active"


def test_join_rejects_whitespace_only_nickname(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    r = client.post(f"/play/{pin}/join", json={"nickname": "   "})
    assert r.status_code == 422


def test_join_strips_nickname_whitespace(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    assert (
        client.post(f"/play/{pin}/join", json={"nickname": "  Ala  "}).status_code
        == 200
    )
    r = client.post(f"/play/{pin}/submit", json={"nickname": "Ala", "score": 1})
    assert r.status_code == 200


def test_join_rejects_vulgar_nickname_returns_400(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    r = client.post(f"/play/{pin}/join", json={"nickname": "kurwa"})
    assert r.status_code == 400
    assert r.json()["detail"]["error"] == "nickname_profanity"


def test_join_allows_clean_nickname_after_vulgar_rejected(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    assert (
        client.post(f"/play/{pin}/join", json={"nickname": "chuj"}).status_code == 400
    )
    assert client.post(f"/play/{pin}/join", json={"nickname": "Ala"}).status_code == 200


def test_duplicate_nickname_returns_409(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    r = client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    assert r.status_code == 409


def test_duplicate_nickname_casefold_returns_409(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    r = client.post(f"/play/{pin}/join", json={"nickname": "ALA"})
    assert r.status_code == 409


def test_submit_happy_path(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    r = client.post(f"/play/{pin}/submit", json={"nickname": "Ala", "score": 1000})
    assert r.status_code == 200
    assert r.json() == {"accepted": True}


def test_submit_blocked_returns_400_violation(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    client.post(f"/play/{pin}/join", json={"nickname": "Bartek"})
    client.post(
        f"/admin/quiz/{quiz_id}/session/block",
        json={"nickname": "Bartek"},
        headers=admin_token_header,
    )
    r = client.post(f"/play/{pin}/submit", json={"nickname": "Bartek", "score": 100})
    assert r.status_code == 400
    assert r.json()["detail"]["error"] == "nickname_violation"


def test_submit_twice_is_idempotent_returns_200(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]
    client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    r1 = client.post(f"/play/{pin}/submit", json={"nickname": "Ala", "score": 1})
    assert r1.status_code == 200
    r2 = client.post(f"/play/{pin}/submit", json={"nickname": "Ala", "score": 999})
    assert r2.status_code == 200
    assert r2.json() == {"accepted": True}
    snap = client.get(
        f"/admin/quiz/{quiz_id}/session", headers=admin_token_header
    ).json()
    assert snap["participants"][0]["score"] == 1
