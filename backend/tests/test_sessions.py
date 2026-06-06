from __future__ import annotations

from datetime import datetime, timezone

import pytest

from services.sessions import (
    Participant,
    block_participant,
    generate_pin,
    get_or_create_session_shuffle,
    is_quiz_running,
    leaderboard_for_pin,
    list_participants,
    lookup_by_pin,
    lookup_by_quiz,
    rank_submitted_participants,
    record_submission,
    register_participant,
    reset_sessions_for_tests,
    start_session,
    stop_session,
)


def _participant(
    nickname: str,
    score: int | None,
    *,
    blocked: bool = False,
    submitted: bool = True,
    second: int = 0,
) -> Participant:
    return Participant(
        nickname=nickname,
        joined_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        blocked=blocked,
        score=score if submitted else None,
        submitted_at=(
            datetime(2026, 1, 1, 0, 0, second, tzinfo=timezone.utc)
            if submitted
            else None
        ),
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


def test_rank_orders_by_score_then_time_then_nickname() -> None:
    entries = rank_submitted_participants(
        [
            _participant("low", 10, second=1),
            _participant("high", 100, second=5),
            _participant("midLate", 50, second=2),
            _participant("midEarly", 50, second=1),
        ]
    )
    assert [e.nickname for e in entries] == ["high", "midEarly", "midLate", "low"]
    assert [e.position for e in entries] == [1, 2, 3, 4]


def test_rank_tie_breaks_by_nickname_when_score_and_time_equal() -> None:
    entries = rank_submitted_participants(
        [
            _participant("Zoe", 50, second=1),
            _participant("Ala", 50, second=1),
        ]
    )
    assert [e.nickname for e in entries] == ["Ala", "Zoe"]


def test_rank_excludes_unsubmitted_and_blocked() -> None:
    entries = rank_submitted_participants(
        [
            _participant("done", 30, second=1),
            _participant("pending", None, submitted=False),
            _participant("blocked", 99, blocked=True, second=2),
        ]
    )
    assert [e.nickname for e in entries] == ["done"]


def test_leaderboard_for_pin_unknown_returns_none() -> None:
    assert leaderboard_for_pin("ZZZZZZ") is None


def test_leaderboard_for_pin_ranks_session_submissions() -> None:
    s = start_session(quiz_id="q1", quiz_title="T")
    register_participant(pin=s.pin, nickname="Ala")
    register_participant(pin=s.pin, nickname="Bob")
    record_submission(pin=s.pin, nickname="Ala", score=10)
    record_submission(pin=s.pin, nickname="Bob", score=50)
    leaderboard = leaderboard_for_pin(s.pin)
    assert leaderboard is not None
    assert [e.nickname for e in leaderboard] == ["Bob", "Ala"]
    assert leaderboard[0].position == 1


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
