from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.test_play import _create_quiz


def test_play_join_returns_429_when_over_limit(
    client: TestClient,
    admin_token_header: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("core.settings.PLAY_RATE_LIMIT_MAX_REQUESTS", 2)
    monkeypatch.setattr("core.settings.PLAY_RATE_LIMIT_WINDOW_SEC", 3600)

    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]

    assert client.post(f"/play/{pin}/join", json={"nickname": "n1"}).status_code == 200
    assert client.post(f"/play/{pin}/join", json={"nickname": "n2"}).status_code == 200
    r = client.post(f"/play/{pin}/join", json={"nickname": "n3"})
    assert r.status_code == 429
    assert r.json()["detail"] == "rate_limited"
    assert "retry-after" in {k.lower() for k in r.headers.keys()}


def test_play_submit_counts_toward_same_limit(
    client: TestClient,
    admin_token_header: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("core.settings.PLAY_RATE_LIMIT_MAX_REQUESTS", 2)
    monkeypatch.setattr("core.settings.PLAY_RATE_LIMIT_WINDOW_SEC", 3600)

    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]

    assert client.post(f"/play/{pin}/join", json={"nickname": "a1"}).status_code == 200
    assert (
        client.post(
            f"/play/{pin}/submit", json={"nickname": "a1", "score": 1}
        ).status_code
        == 200
    )
    r = client.post(f"/play/{pin}/join", json={"nickname": "a2"})
    assert r.status_code == 429


def test_separate_ips_tracked_when_trust_forwarded(
    client: TestClient,
    admin_token_header: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("core.settings.PLAY_RATE_LIMIT_MAX_REQUESTS", 1)
    monkeypatch.setattr("core.settings.PLAY_RATE_LIMIT_WINDOW_SEC", 3600)
    monkeypatch.setattr("core.settings.PLAY_RATE_LIMIT_TRUST_X_FORWARDED_FOR", True)

    quiz_id = _create_quiz(client, admin_token_header)
    pin = client.post(
        f"/admin/quiz/{quiz_id}/activate", headers=admin_token_header
    ).json()["pin"]

    h1 = {"X-Forwarded-For": "203.0.113.1"}
    h2 = {"X-Forwarded-For": "203.0.113.2"}
    assert (
        client.post(
            f"/play/{pin}/join", json={"nickname": "u1"}, headers=h1
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/play/{pin}/join", json={"nickname": "u2"}, headers=h2
        ).status_code
        == 200
    )
