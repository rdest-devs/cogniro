import pytest
import jwt
from fastapi.testclient import TestClient

from security.admin_auth import reload_admin_auth_config

_REFRESH_COOKIE_NAME = "admin_refresh_token"
_JWT_SECRET = "test-jwt-secret-key-minimum-32-characters-long!"


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


def test_admin_login_sets_refresh_cookie(client: TestClient) -> None:
    response = client.post(
        "/admin/auth/login",
        json={"password": "pytest-admin-password"},
    )
    assert response.status_code == 200
    set_cookie_header = response.headers.get("set-cookie", "")
    assert f"{_REFRESH_COOKIE_NAME}=" in set_cookie_header
    assert "HttpOnly" in set_cookie_header
    assert "Secure" not in set_cookie_header


def test_admin_login_sets_secure_refresh_cookie_when_env_enabled(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ADMIN_REFRESH_COOKIE_SECURE", "true")
    reload_admin_auth_config()
    response = client.post(
        "/admin/auth/login",
        json={"password": "pytest-admin-password"},
    )
    assert response.status_code == 200
    set_cookie_header = response.headers.get("set-cookie", "")
    assert f"{_REFRESH_COOKIE_NAME}=" in set_cookie_header
    assert "Secure" in set_cookie_header


def test_admin_refresh_returns_new_access_token(client: TestClient) -> None:
    login = client.post(
        "/admin/auth/login",
        json={"password": "pytest-admin-password"},
    )
    assert login.status_code == 200
    initial_access_token = login.json()["access_token"]

    refreshed = client.post("/admin/auth/refresh")
    assert refreshed.status_code == 200
    refreshed_payload = refreshed.json()
    assert refreshed_payload["token_type"] == "bearer"
    assert refreshed_payload["access_token"] != initial_access_token
    assert refreshed_payload["expires_in"] > 0


def test_admin_refresh_rejects_missing_cookie(client: TestClient) -> None:
    response = client.post("/admin/auth/refresh")
    assert response.status_code == 401
    assert response.json()["detail"] == "missing_refresh_token"


def test_refresh_token_cannot_access_admin_routes(client: TestClient) -> None:
    login = client.post(
        "/admin/auth/login",
        json={"password": "pytest-admin-password"},
    )
    assert login.status_code == 200
    refresh_token = client.cookies.get(_REFRESH_COOKIE_NAME)
    assert refresh_token is not None

    response = client.get(
        "/admin/quiz/all",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid_token_type"


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


def test_admin_login_preserves_password_whitespace(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ADMIN_PASSWORD", "space-sensitive")
    reload_admin_auth_config()
    response = client.post(
        "/admin/auth/login",
        json={"password": " space-sensitive "},
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


def test_admin_logout_clears_refresh_cookie(client: TestClient) -> None:
    login = client.post(
        "/admin/auth/login",
        json={"password": "pytest-admin-password"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    logout = client.post(
        "/admin/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout.status_code == 200
    set_cookie_header = logout.headers.get("set-cookie", "")
    assert f"{_REFRESH_COOKIE_NAME}=" in set_cookie_header
    assert "Max-Age=0" in set_cookie_header


def test_refresh_lifetime_defaults_to_7_days(client: TestClient) -> None:
    response = client.post(
        "/admin/auth/login",
        json={"password": "pytest-admin-password"},
    )
    assert response.status_code == 200

    refresh_token = client.cookies.get(_REFRESH_COOKIE_NAME)
    assert refresh_token is not None
    claims = jwt.decode(
        refresh_token,
        _JWT_SECRET,
        algorithms=["HS256"],
        options={"verify_exp": False},
    )
    assert claims["typ"] == "refresh"
    assert claims["exp"] - claims["iat"] == 7 * 24 * 60 * 60


def test_refresh_lifetime_honors_env_override(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ADMIN_REFRESH_EXPIRE_DAYS", "3")
    reload_admin_auth_config()

    response = client.post(
        "/admin/auth/login",
        json={"password": "pytest-admin-password"},
    )
    assert response.status_code == 200

    refresh_token = client.cookies.get(_REFRESH_COOKIE_NAME)
    assert refresh_token is not None
    claims = jwt.decode(
        refresh_token,
        _JWT_SECRET,
        algorithms=["HS256"],
        options={"verify_exp": False},
    )
    assert claims["exp"] - claims["iat"] == 3 * 24 * 60 * 60


def test_validate_nick_stays_public(client: TestClient) -> None:
    response = client.post("/validate-nick", json={"nick": "alice"})
    assert response.status_code == 200
    assert response.json() == {"valid": True}
