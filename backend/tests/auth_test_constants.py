"""Stable admin-auth values; conftest pins these so tests ignore host env."""

import bcrypt

TEST_ADMIN_PASSWORD = "pytest-admin-password"
TEST_ADMIN_JWT_SECRET = "test-jwt-secret-key-minimum-32-characters-long!"


def hash_admin_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=4)).decode(
        "utf-8",
    )
