import pytest
import jwt
from fastapi.testclient import TestClient

from security.admin_auth import reload_admin_auth_config
from tests.auth_test_constants import TEST_ADMIN_JWT_SECRET as _JWT_SECRET
from tests.auth_test_constants import TEST_ADMIN_PASSWORD
from tests.auth_test_constants import hash_admin_password

_REFRESH_COOKIE_NAME = "admin_refresh_token"


def test_admin_login_returns_token(client: TestClient) -> None:
    response = client.post(
        "/admin/auth/login",
        json={"password": TEST_ADMIN_PASSWORD},
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
        json={"password": TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    set_cookie_header = response.headers.get("set-cookie", "")
    assert f"{_REFRESH_COOKIE_NAME}=" in set_cookie_header
    assert "HttpOnly" in set_cookie_header
    assert "Secure" not in set_cookie_header


def test_admin_login_runs_password_verification_off_event_loop(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import types

    import routes.admin_auth as admin_auth_route

    calls = []

    async def fake_to_thread(func, *args, **kwargs):
        calls.append((func, args, kwargs))
        return func(*args, **kwargs)

    monkeypatch.setattr(
        admin_auth_route,
        "asyncio",
        types.SimpleNamespace(to_thread=fake_to_thread),
        raising=False,
    )

    response = client.post(
        "/admin/auth/login",
        json={"password": TEST_ADMIN_PASSWORD},
    )

    assert response.status_code == 200
    assert calls == [
        (admin_auth_route.verify_password, (TEST_ADMIN_PASSWORD,), {}),
    ]


def test_admin_login_sets_secure_refresh_cookie_when_env_enabled(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ADMIN_REFRESH_COOKIE_SECURE", "true")
    reload_admin_auth_config()
    response = client.post(
        "/admin/auth/login",
        json={"password": TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    set_cookie_header = response.headers.get("set-cookie", "")
    assert f"{_REFRESH_COOKIE_NAME}=" in set_cookie_header
    assert "Secure" in set_cookie_header


def test_admin_refresh_returns_new_access_token(client: TestClient) -> None:
    login = client.post(
        "/admin/auth/login",
        json={"password": TEST_ADMIN_PASSWORD},
    )
    assert login.status_code == 200
    initial_access_token = login.json()["access_token"]

    refreshed = client.post("/admin/auth/refresh")
    assert refreshed.status_code == 200
    refreshed_payload = refreshed.json()
    assert refreshed_payload["token_type"] == "bearer"
    assert refreshed_payload["access_token"] != initial_access_token
    assert refreshed_payload["expires_in"] > 0


def test_admin_refresh_rejects_reused_refresh_token(client: TestClient) -> None:
    login = client.post(
        "/admin/auth/login",
        json={"password": TEST_ADMIN_PASSWORD},
    )
    assert login.status_code == 200
    initial_refresh_token = client.cookies.get(_REFRESH_COOKIE_NAME)
    assert initial_refresh_token is not None

    refreshed = client.post("/admin/auth/refresh")
    assert refreshed.status_code == 200

    client.cookies.set(
        _REFRESH_COOKIE_NAME,
        initial_refresh_token,
        path="/admin/auth",
    )
    replayed = client.post("/admin/auth/refresh")

    assert replayed.status_code == 401
    assert replayed.json()["detail"] == "token_revoked"


def test_admin_refresh_rejects_missing_cookie(client: TestClient) -> None:
    response = client.post("/admin/auth/refresh")
    assert response.status_code == 401
    assert response.json()["detail"] == "missing_refresh_token"


def test_refresh_token_cannot_access_admin_routes(client: TestClient) -> None:
    login = client.post(
        "/admin/auth/login",
        json={"password": TEST_ADMIN_PASSWORD},
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
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", hash_admin_password("only-this-one"))
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
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", hash_admin_password("space-sensitive"))
    reload_admin_auth_config()
    response = client.post(
        "/admin/auth/login",
        json={"password": " space-sensitive "},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid_password"


def test_admin_login_uses_password_env_verbatim(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(
        "ADMIN_PASSWORD_HASH",
        hash_admin_password(" space-sensitive "),
    )
    reload_admin_auth_config()
    response = client.post(
        "/admin/auth/login",
        json={"password": " space-sensitive "},
    )
    assert response.status_code == 200


def test_admin_tokens_use_jwt_secret_env_verbatim(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    jwt_secret = " test-jwt-secret-key-minimum-32-characters-long! "
    monkeypatch.setenv("JWT_SECRET", jwt_secret)
    reload_admin_auth_config()

    response = client.post(
        "/admin/auth/login",
        json={"password": TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    claims = jwt.decode(token, jwt_secret, algorithms=["HS256"])
    assert claims["typ"] == "access"
    with pytest.raises(jwt.InvalidSignatureError):
        jwt.decode(token, jwt_secret.strip(), algorithms=["HS256"])


def test_admin_quiz_requires_auth(client: TestClient) -> None:
    response = client.get("/admin/quiz/all")
    assert response.status_code == 401


def test_admin_quiz_with_token_reaches_stub(client: TestClient) -> None:
    login = client.post(
        "/admin/auth/login",
        json={"password": TEST_ADMIN_PASSWORD},
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
    monkeypatch.setenv(
        "ADMIN_PASSWORD_HASH",
        hash_admin_password("logout-test-password"),
    )
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
        json={"password": TEST_ADMIN_PASSWORD},
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


def test_admin_logout_clears_refresh_cookie_with_invalid_access_token(
    client: TestClient,
) -> None:
    login = client.post(
        "/admin/auth/login",
        json={"password": TEST_ADMIN_PASSWORD},
    )
    assert login.status_code == 200

    logout = client.post(
        "/admin/auth/logout",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert logout.status_code == 200
    set_cookie_header = logout.headers.get("set-cookie", "")
    assert f"{_REFRESH_COOKIE_NAME}=" in set_cookie_header
    assert "Max-Age=0" in set_cookie_header


def test_refresh_lifetime_defaults_to_7_days(client: TestClient) -> None:
    response = client.post(
        "/admin/auth/login",
        json={"password": TEST_ADMIN_PASSWORD},
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
        json={"password": TEST_ADMIN_PASSWORD},
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
