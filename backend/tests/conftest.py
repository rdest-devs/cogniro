"""Pytest configuration for the FastAPI backend."""

from __future__ import annotations

import os
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))


@pytest.fixture(scope="session", autouse=True)
def _default_auth_env() -> None:
    os.environ.setdefault(
        "JWT_SECRET",
        "test-jwt-secret-key-minimum-32-characters-long!",
    )
    os.environ.setdefault("ADMIN_PASSWORD", "pytest-admin-password")


@pytest.fixture(autouse=True)
def _admin_auth_per_test(monkeypatch: pytest.MonkeyPatch) -> None:
    from security.admin_auth import (
        clear_revoked_tokens_for_tests,
        reload_admin_auth_config,
    )

    clear_revoked_tokens_for_tests()
    reload_admin_auth_config()
    yield


@pytest.fixture
def client() -> TestClient:
    from main import app

    with TestClient(app) as test_client:
        yield test_client
