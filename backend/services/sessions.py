"""In-memory live-session state. NOT persisted; vanishes on server restart."""

from __future__ import annotations

import random
import secrets
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone

PIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
PIN_LENGTH = 6


@dataclass
class Participant:
    nickname: str
    joined_at: datetime
    blocked: bool = False
    score: int | None = None
    submitted_at: datetime | None = None


@dataclass
class QuizSession:
    quiz_id: str
    quiz_title: str
    pin: str
    started_at: datetime
    participants: dict[str, Participant] = field(default_factory=dict)
    shuffled_question_ids: list[str] | None = None


_SESSIONS_BY_QUIZ: dict[str, QuizSession] = {}
_SESSIONS_BY_PIN: dict[str, QuizSession] = {}
_LOCK = threading.RLock()


def reset_sessions_for_tests() -> None:
    with _LOCK:
        _SESSIONS_BY_QUIZ.clear()
        _SESSIONS_BY_PIN.clear()


def generate_pin(*, taken: set[str]) -> str:
    while True:
        candidate = "".join(secrets.choice(PIN_ALPHABET) for _ in range(PIN_LENGTH))
        if candidate not in taken:
            return candidate


def is_quiz_running(quiz_id: str) -> bool:
    with _LOCK:
        return quiz_id in _SESSIONS_BY_QUIZ


def lookup_by_quiz(quiz_id: str) -> QuizSession | None:
    with _LOCK:
        return _SESSIONS_BY_QUIZ.get(quiz_id)


def lookup_by_pin(pin: str) -> QuizSession | None:
    with _LOCK:
        return _SESSIONS_BY_PIN.get(pin)


def start_session(*, quiz_id: str, quiz_title: str) -> QuizSession:
    with _LOCK:
        if quiz_id in _SESSIONS_BY_QUIZ:
            raise ValueError("already_running")
        pin = generate_pin(taken=set(_SESSIONS_BY_PIN.keys()))
        session = QuizSession(
            quiz_id=quiz_id,
            quiz_title=quiz_title,
            pin=pin,
            started_at=datetime.now(timezone.utc),
        )
        _SESSIONS_BY_QUIZ[quiz_id] = session
        _SESSIONS_BY_PIN[pin] = session
        return session


class NicknameTakenError(Exception):
    pass


def register_participant(*, pin: str, nickname: str) -> Participant:
    with _LOCK:
        session = _SESSIONS_BY_PIN.get(pin)
        if session is None:
            raise LookupError("pin_not_active")
        key = nickname.casefold()
        if key in session.participants:
            raise NicknameTakenError(nickname)
        participant = Participant(
            nickname=nickname, joined_at=datetime.now(timezone.utc)
        )
        session.participants[key] = participant
        return participant


def block_participant(*, quiz_id: str, nickname: str) -> Participant:
    with _LOCK:
        session = _SESSIONS_BY_QUIZ.get(quiz_id)
        if session is None:
            raise LookupError("not_running")
        key = nickname.casefold()
        if key not in session.participants:
            raise LookupError("nickname_unknown")
        session.participants[key].blocked = True
        return session.participants[key]


class NicknameViolationError(Exception):
    pass


def record_submission(*, pin: str, nickname: str, score: int) -> Participant:
    with _LOCK:
        session = _SESSIONS_BY_PIN.get(pin)
        if session is None:
            raise LookupError("pin_not_active")
        key = nickname.casefold()
        participant = session.participants.get(key)
        if participant is None or participant.blocked:
            raise NicknameViolationError(nickname)
        if participant.submitted_at is not None:
            # Idempotent: duplicate POST (e.g. React Strict Mode double effect) must not fail.
            return participant
        participant.score = int(score)
        participant.submitted_at = datetime.now(timezone.utc)
        return participant


def list_participants(quiz_id: str) -> list[Participant]:
    with _LOCK:
        session = _SESSIONS_BY_QUIZ.get(quiz_id)
        if session is None:
            return []
        return list(session.participants.values())


def get_or_create_session_shuffle(pin: str, question_ids: list[str]) -> list[str]:
    """Return the canonical shuffled question order for a session.

    Fast path (lock-free): shuffle exists and question IDs match current quiz.
    Slow path (locked): first join, or admin edited the quiz while a session was
    live — regenerates the shuffle so new/removed questions don't land at 999.
    Must be called via run_in_threadpool.
    """
    session = _SESSIONS_BY_PIN.get(pin)
    if session is None:
        raise LookupError("pin_not_active")

    current_ids = set(question_ids)

    # Fast path: shuffle is fresh — no lock needed.
    # Attribute read and list construction are GIL-atomic; the field is only
    # ever replaced (never mutated in-place), so the snapshot is consistent.
    stored = session.shuffled_question_ids
    if stored is not None and set(stored) == current_ids:
        return list(stored)

    # Slow path: first join, or quiz was edited (ID set changed).
    with _LOCK:
        stored = session.shuffled_question_ids
        if stored is None or set(stored) != current_ids:
            ids = list(question_ids)
            random.shuffle(ids)
            session.shuffled_question_ids = ids
        return list(session.shuffled_question_ids)  # type: ignore[arg-type]


def stop_session(quiz_id: str) -> QuizSession | None:
    with _LOCK:
        session = _SESSIONS_BY_QUIZ.pop(quiz_id, None)
        if session is None:
            return None
        _SESSIONS_BY_PIN.pop(session.pin, None)
        return session
