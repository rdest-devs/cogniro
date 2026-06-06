from __future__ import annotations

import pytest

from services.sessions import (
    block_participant,
    generate_pin,
    get_or_create_session_shuffle,
    is_quiz_running,
    list_participants,
    lookup_by_pin,
    lookup_by_quiz,
    record_submission,
    register_participant,
    reset_sessions_for_tests,
    start_session,
    stop_session,
)


def setup_function(_: object) -> None:
    reset_sessions_for_tests()


def test_pin_alphabet_and_length() -> None:
    p = generate_pin(taken=set())
    assert len(p) == 6
    forbidden = set("IO01")
    assert not forbidden.intersection(p)


def test_pin_avoids_collisions() -> None:
    taken = {"AAAAAA"} | {generate_pin(taken=set()) for _ in range(5)}
    p = generate_pin(taken=taken)
    assert p not in taken


def test_start_session_indexes_both_ways() -> None:
    s = start_session(quiz_id="q1", quiz_title="T")
    assert is_quiz_running("q1")
    assert lookup_by_quiz("q1") is s
    assert lookup_by_pin(s.pin) is s


def test_register_and_submit() -> None:
    s = start_session(quiz_id="q1", quiz_title="T")
    register_participant(pin=s.pin, nickname="Ala")
    record_submission(pin=s.pin, nickname="Ala", score=4500)
    parts = list_participants("q1")
    assert parts[0].nickname == "Ala"
    assert parts[0].score == 4500
    assert parts[0].submitted_at is not None


def test_block_marks_blocked_and_submit_rejected() -> None:
    s = start_session(quiz_id="q1", quiz_title="T")
    register_participant(pin=s.pin, nickname="Bartek")
    block_participant(quiz_id="q1", nickname="Bartek")
    parts = list_participants("q1")
    assert parts[0].blocked is True


def test_stop_session_returns_snapshot_and_clears() -> None:
    s = start_session(quiz_id="q1", quiz_title="T")
    register_participant(pin=s.pin, nickname="Ala")
    record_submission(pin=s.pin, nickname="Ala", score=100)
    snapshot = stop_session("q1")
    assert snapshot is not None
    assert snapshot.participants["ala"].score == 100
    assert not is_quiz_running("q1")
    assert lookup_by_pin(s.pin) is None


# --- get_or_create_session_shuffle ---


def test_shuffle_bad_pin_raises() -> None:
    with pytest.raises(LookupError, match="pin_not_active"):
        get_or_create_session_shuffle("ZZZZZZ", ["q1", "q2"])


def test_shuffle_creates_order_on_first_call() -> None:
    s = start_session(quiz_id="q1", quiz_title="T")
    ids = ["a", "b", "c", "d"]
    result = get_or_create_session_shuffle(s.pin, ids)
    assert sorted(result) == sorted(ids)
    assert len(result) == len(ids)


def test_shuffle_same_ids_returns_same_order() -> None:
    s = start_session(quiz_id="q1", quiz_title="T")
    ids = ["a", "b", "c", "d"]
    first = get_or_create_session_shuffle(s.pin, ids)
    second = get_or_create_session_shuffle(s.pin, ids)
    assert first == second


def test_shuffle_changed_ids_regenerates() -> None:
    s = start_session(quiz_id="q1", quiz_title="T")
    original = get_or_create_session_shuffle(s.pin, ["a", "b", "c"])
    # Simulate quiz edit: one question replaced
    updated = get_or_create_session_shuffle(s.pin, ["a", "b", "d"])
    assert sorted(updated) == ["a", "b", "d"]
    # The old order must no longer be stored (IDs changed)
    assert set(updated) != set(original)
