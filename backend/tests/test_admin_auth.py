import pytest
from fastapi.testclient import TestClient

from security.admin_auth import reload_admin_auth_config


def test_admin_login_returns_token(client: TestClient) -> None:
    response = client.post(
        "/admin/auth/login",
        json={"password": "pytest-admin-password"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert isinstance(data["expires_in"], int)
    assert data["expires_in"] > 0


def test_admin_login_rejects_wrong_password(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ADMIN_PASSWORD", "only-this-one")
    reload_admin_auth_config()
    response = client.post(
        "/admin/auth/login",
        json={"password": "wrong"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid_password"


def test_admin_quiz_requires_auth(client: TestClient) -> None:
    response = client.get("/admin/quiz/all")
    assert response.status_code == 401


def test_admin_quiz_with_token_reaches_stub(client: TestClient) -> None:
    login = client.post(
        "/admin/auth/login",
        json={"password": "pytest-admin-password"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    response = client.get(
        "/admin/quiz/all",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 501
    assert response.json()["detail"] == "unimplemented"


def test_admin_logout_revokes_token(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ADMIN_PASSWORD", "logout-test-password")
    reload_admin_auth_config()

    login = client.post(
        "/admin/auth/login",
        json={"password": "logout-test-password"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    logout = client.post(
        "/admin/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout.status_code == 200
    assert logout.json() == {"ok": True}

    blocked = client.get(
        "/admin/quiz/all",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert blocked.status_code == 401
    assert blocked.json()["detail"] == "token_revoked"


def test_validate_nick_stays_public(client: TestClient) -> None:
    response = client.post("/validate-nick", json={"nick": "alice"})
    assert response.status_code == 200
    assert response.json() == {"valid": True}
