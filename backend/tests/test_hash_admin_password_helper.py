from __future__ import annotations

import bcrypt
import pytest

from scripts import hash_admin_password


def test_hash_admin_password_helper_outputs_usable_bcrypt_hash(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(
        hash_admin_password.getpass,
        "getpass",
        lambda prompt: "test-admin-password",
    )

    exit_code = hash_admin_password.main(["--rounds", "4"])

    assert exit_code == 0
    captured = capsys.readouterr()
    password_hash = captured.out.strip()
    assert password_hash.startswith("$2b$04$")
    assert "test-admin-password" not in captured.out
    assert bcrypt.checkpw(
        b"test-admin-password",
        password_hash.encode("utf-8"),
    )
