from __future__ import annotations

from fastapi.testclient import TestClient

from tests.auth_test_constants import TEST_ADMIN_PASSWORD

NEW_PASSWORD = "nowe-haslo-12345"


def _change(
    client: TestClient,
    headers: dict[str, str],
    *,
    current: str,
    new: str,
    confirm: str,
):
    return client.post(
        "/admin/auth/change-password",
        json={
            "current_password": current,
            "new_password": new,
            "confirm_password": confirm,
        },
        headers=headers,
    )


def test_change_password_requires_authentication(client: TestClient) -> None:
    r = client.post(
        "/admin/auth/change-password",
        json={
            "current_password": TEST_ADMIN_PASSWORD,
            "new_password": NEW_PASSWORD,
            "confirm_password": NEW_PASSWORD,
        },
    )
    assert r.status_code == 401


def test_change_password_wrong_current_returns_400_and_keeps_old(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    r = _change(
        client,
        admin_token_header,
        current="zle-haslo",
        new=NEW_PASSWORD,
        confirm=NEW_PASSWORD,
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "invalid_current_password"
    login = client.post("/admin/auth/login", json={"password": TEST_ADMIN_PASSWORD})
    assert login.status_code == 200


def test_change_password_mismatch_returns_400(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    r = _change(
        client,
        admin_token_header,
        current=TEST_ADMIN_PASSWORD,
        new=NEW_PASSWORD,
        confirm="inne-haslo-12345",
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "password_mismatch"


def test_change_password_too_short_returns_422(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    r = _change(
        client,
        admin_token_header,
        current=TEST_ADMIN_PASSWORD,
        new="krotkie",
        confirm="krotkie",
    )
    assert r.status_code == 422


def test_change_password_too_long_returns_400_and_keeps_old(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    # 73 bytes: passes the schema (max_length=512) but exceeds bcrypt's 72-byte limit.
    too_long = "a" * 73
    r = _change(
        client,
        admin_token_header,
        current=TEST_ADMIN_PASSWORD,
        new=too_long,
        confirm=too_long,
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "password_too_long"
    login = client.post("/admin/auth/login", json={"password": TEST_ADMIN_PASSWORD})
    assert login.status_code == 200


def test_change_password_invalidates_existing_sessions(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    r = _change(
        client,
        admin_token_header,
        current=TEST_ADMIN_PASSWORD,
        new=NEW_PASSWORD,
        confirm=NEW_PASSWORD,
    )
    assert r.status_code == 200

    # The token issued before the change is rejected (password fingerprint rotated).
    reuse = _change(
        client,
        admin_token_header,
        current=NEW_PASSWORD,
        new="another-haslo-123",
        confirm="another-haslo-123",
    )
    assert reuse.status_code == 401

    # The change response carries a freshly issued token that still works.
    fresh_header = {"Authorization": f"Bearer {r.json()['access_token']}"}
    ok = _change(
        client,
        fresh_header,
        current=NEW_PASSWORD,
        new="another-haslo-123",
        confirm="another-haslo-123",
    )
    assert ok.status_code == 200


def test_change_password_success_allows_login_with_new_password(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    r = _change(
        client,
        admin_token_header,
        current=TEST_ADMIN_PASSWORD,
        new=NEW_PASSWORD,
        confirm=NEW_PASSWORD,
    )
    assert r.status_code == 200
    assert (
        client.post("/admin/auth/login", json={"password": NEW_PASSWORD}).status_code
        == 200
    )
    assert (
        client.post(
            "/admin/auth/login", json={"password": TEST_ADMIN_PASSWORD}
        ).status_code
        == 401
    )


def test_password_override_is_loaded_after_restart() -> None:
    """A changed password persists: reload (env) then load override (file) restores it."""
    from security.admin_auth import (
        load_admin_password_override,
        reload_admin_auth_config,
        set_admin_password,
        verify_password,
    )
    from services.storage import admin_password_file, resolve_storage_paths

    store_path = admin_password_file(resolve_storage_paths())
    set_admin_password(NEW_PASSWORD, store_path=store_path)
    assert verify_password(NEW_PASSWORD) is True

    # Simulate a restart: env hash is reloaded first, then the persisted override.
    reload_admin_auth_config()
    assert verify_password(NEW_PASSWORD) is False
    load_admin_password_override(store_path)
    assert verify_password(NEW_PASSWORD) is True
    assert verify_password(TEST_ADMIN_PASSWORD) is False
