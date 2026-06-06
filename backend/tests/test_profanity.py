from __future__ import annotations

import pytest

from services.profanity import is_nickname_allowed


@pytest.mark.parametrize(
    "nickname",
    ["Ala", "Bartek123", "Mateusz", "Kacper", "assassin", "classic", "grass", ""],
)
def test_clean_nicknames_are_allowed(nickname: str) -> None:
    assert is_nickname_allowed(nickname) is True


@pytest.mark.parametrize(
    "nickname",
    ["kurwa", "kurw4", "chuj", "pizda", "cipa", "dupek", "fuck", "shit"],
)
def test_vulgar_nicknames_are_rejected(nickname: str) -> None:
    assert is_nickname_allowed(nickname) is False


def test_surrounding_whitespace_is_ignored() -> None:
    assert is_nickname_allowed("  kurwa  ") is False
    assert is_nickname_allowed("  Ala  ") is True
