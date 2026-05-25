from __future__ import annotations

import datetime as dt

from services.slug import compose_result_filename, slugify_title


def test_slugify_basic() -> None:
    assert slugify_title("Test rozproszony") == "test-rozproszony"


def test_slugify_polish_diacritics() -> None:
    assert slugify_title("Żabki ąść!") == "zabki-asc"


def test_slugify_collapses_separators() -> None:
    assert slugify_title("  Hello   --  world!! ") == "hello-world"


def test_slugify_cap_60() -> None:
    long = "a" * 200
    assert len(slugify_title(long)) <= 60


def test_slugify_empty_falls_back_to_quiz() -> None:
    assert slugify_title("") == "quiz"
    assert slugify_title("!!!") == "quiz"


def test_result_filename_pattern() -> None:
    now = dt.datetime(2026, 5, 17, 19, 23, 44)
    name = compose_result_filename(
        quiz_id="quiz_abc",
        quiz_title="Test rozproszony",
        stopped_at=now,
        existing=set(),
    )
    assert name == "quiz_abc_test-rozproszony_19-23-44.json"


def test_result_filename_collision_suffix() -> None:
    now = dt.datetime(2026, 5, 17, 19, 23, 44)
    existing = {"quiz_abc_t_19-23-44.json", "quiz_abc_t_19-23-44-2.json"}
    name = compose_result_filename(
        quiz_id="quiz_abc", quiz_title="t", stopped_at=now, existing=existing
    )
    assert name == "quiz_abc_t_19-23-44-3.json"
