"""Pytest configuration for the FastAPI backend."""

from __future__ import annotations

from tests.auth_test_constants import TEST_ADMIN_JWT_SECRET, TEST_ADMIN_PASSWORD
from tests.auth_test_constants import hash_admin_password

from pathlib import Path
from collections.abc import Iterator
import sys

import pytest
from fastapi.testclient import TestClient

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))


@pytest.fixture(autouse=True)
def _admin_auth_per_test(monkeypatch: pytest.MonkeyPatch) -> None:
    """Pin admin auth env so tests do not depend on the host shell or CI globals."""
    from security.admin_auth import (
        clear_revoked_tokens_for_tests,
        reload_admin_auth_config,
    )

    monkeypatch.setenv("ADMIN_PASSWORD_HASH", hash_admin_password(TEST_ADMIN_PASSWORD))
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    monkeypatch.setenv("JWT_SECRET", TEST_ADMIN_JWT_SECRET)
    monkeypatch.delenv("ADMIN_REFRESH_COOKIE_SECURE", raising=False)
    monkeypatch.delenv("ADMIN_REFRESH_COOKIE_SAMESITE", raising=False)
    monkeypatch.delenv("ADMIN_REFRESH_EXPIRE_DAYS", raising=False)
    monkeypatch.delenv("JWT_EXPIRE_MINUTES", raising=False)

    clear_revoked_tokens_for_tests()
    reload_admin_auth_config()
    yield


@pytest.fixture
def client() -> Iterator[TestClient]:
    from main import app

    with TestClient(app) as test_client:
        yield test_client
