"""Tests for quiz availability: check_availability priority, join codes, stop_quiz, schema."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from services.admin_quiz import check_availability
from services.quiz_files import QuizMeta


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _minimal_quiz_payload() -> dict:
    return {
        "title": "Quiz testowy",
        "questions": [
            {
                "text": "Pytanie?",
                "type": "singlechoice",
                "choices": [
                    {"text": "A", "is_correct": True},
                    {"text": "B", "is_correct": False},
                ],
            }
        ],
    }


def _create_and_activate(client: TestClient, headers: dict) -> tuple[str, str]:
    """Create a quiz, start its session, return (quiz_id, pin)."""
    r = client.post("/admin/quiz", json=_minimal_quiz_payload(), headers=headers)
    assert r.status_code == 200
    quiz_id = r.json()["id"]
    r = client.post(f"/admin/quiz/{quiz_id}/activate", headers=headers)
    assert r.status_code == 200
    return quiz_id, r.json()["pin"]


def _future(seconds: int = 3600) -> str:
    dt = datetime.now(timezone.utc) + timedelta(seconds=seconds)
    return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _past(seconds: int = 3600) -> str:
    dt = datetime.now(timezone.utc) - timedelta(seconds=seconds)
    return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _base_meta(**overrides: object) -> QuizMeta:
    defaults: dict = {
        "id": "x",
        "title": "T",
        "title_slug": "t",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "question_count": 1,
        "last_activated_at": None,
    }
    defaults.update(overrides)
    return QuizMeta(**defaults)


# ---------------------------------------------------------------------------
# Unit tests: check_availability priority
# ---------------------------------------------------------------------------


def test_check_availability_no_constraints_allows() -> None:
    ok, reason = check_availability(_base_meta())
    assert ok is True
    assert reason is None


def test_check_availability_closed_blocks() -> None:
    ok, reason = check_availability(_base_meta(manual_status="closed"))
    assert ok is False
    assert reason == "manually_closed"


def test_check_availability_open_allows() -> None:
    ok, reason = check_availability(_base_meta(manual_status="open"))
    assert ok is True
    assert reason is None


def test_check_availability_expired_blocks() -> None:
    ok, reason = check_availability(_base_meta(schedule_end=_past()))
    assert ok is False
    assert reason == "expired"


def test_check_availability_not_yet_blocks() -> None:
    ok, reason = check_availability(_base_meta(schedule_start=_future()))
    assert ok is False
    assert reason == "not_yet"


def test_check_availability_closed_priority_over_expired() -> None:
    """closed wins even when schedule_end is also in the past."""
    ok, reason = check_availability(
        _base_meta(manual_status="closed", schedule_end=_past())
    )
    assert ok is False
    assert reason == "manually_closed"


def test_check_availability_closed_priority_over_not_yet() -> None:
    ok, reason = check_availability(
        _base_meta(manual_status="closed", schedule_start=_future())
    )
    assert ok is False
    assert reason == "manually_closed"


def test_check_availability_open_priority_over_not_yet() -> None:
    """manual_status='open' comes before not_yet in the priority chain."""
    ok, reason = check_availability(
        _base_meta(manual_status="open", schedule_start=_future())
    )
    assert ok is True
    assert reason is None


# ---------------------------------------------------------------------------
# Integration tests: join status codes
# ---------------------------------------------------------------------------


def test_join_returns_423_not_yet_with_opens_at(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id, pin = _create_and_activate(client, admin_token_header)
    opens_at = _future(3600)
    r = client.patch(
        f"/admin/quiz/{quiz_id}/availability",
        json={"schedule_start": opens_at},
        headers=admin_token_header,
    )
    assert r.status_code == 204

    r = client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    assert r.status_code == 423
    detail = r.json()["detail"]
    assert detail["code"] == "not_yet"
    assert detail["opens_at"] == opens_at


def test_join_returns_410_expired(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id, pin = _create_and_activate(client, admin_token_header)
    r = client.patch(
        f"/admin/quiz/{quiz_id}/availability",
        json={"schedule_end": _past(3600)},
        headers=admin_token_header,
    )
    assert r.status_code == 204

    r = client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    assert r.status_code == 410


def test_join_returns_403_manually_closed(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id, pin = _create_and_activate(client, admin_token_header)
    r = client.patch(
        f"/admin/quiz/{quiz_id}/availability",
        json={"manual_status": "closed"},
        headers=admin_token_header,
    )
    assert r.status_code == 204

    r = client.post(f"/play/{pin}/join", json={"nickname": "Ala"})
    assert r.status_code == 403


def test_check_endpoint_returns_423_not_yet(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id, pin = _create_and_activate(client, admin_token_header)
    client.patch(
        f"/admin/quiz/{quiz_id}/availability",
        json={"schedule_start": _future(3600)},
        headers=admin_token_header,
    )
    r = client.get(f"/play/{pin}/check")
    assert r.status_code == 423


# ---------------------------------------------------------------------------
# Integration test: stop_quiz clears manual_status, preserves schedule
# ---------------------------------------------------------------------------


def test_stop_quiz_clears_manual_status_preserves_schedule(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id, _ = _create_and_activate(client, admin_token_header)
    s_start = _future(3600)
    s_end = _future(7200)
    r = client.patch(
        f"/admin/quiz/{quiz_id}/availability",
        json={
            "schedule_start": s_start,
            "schedule_end": s_end,
            "manual_status": "open",
        },
        headers=admin_token_header,
    )
    assert r.status_code == 204

    r = client.post(f"/admin/quiz/{quiz_id}/stop", headers=admin_token_header)
    assert r.status_code == 200

    detail = client.get(f"/admin/quiz/{quiz_id}", headers=admin_token_header).json()
    assert detail["schedule_start"] == s_start
    assert detail["schedule_end"] == s_end
    assert detail["manual_status"] is None


# ---------------------------------------------------------------------------
# Datetime normalization / 422 on bad input
# ---------------------------------------------------------------------------


def test_patch_availability_rejects_bad_datetime(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id, _ = _create_and_activate(client, admin_token_header)
    r = client.patch(
        f"/admin/quiz/{quiz_id}/availability",
        json={"schedule_start": "not-a-date"},
        headers=admin_token_header,
    )
    assert r.status_code == 422


def test_patch_availability_rejects_invalid_month(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id, _ = _create_and_activate(client, admin_token_header)
    r = client.patch(
        f"/admin/quiz/{quiz_id}/availability",
        json={"schedule_start": "2025-13-01T00:00:00Z"},
        headers=admin_token_header,
    )
    assert r.status_code == 422


def test_patch_availability_normalizes_naive_datetime_to_utc(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id, _ = _create_and_activate(client, admin_token_header)
    r = client.patch(
        f"/admin/quiz/{quiz_id}/availability",
        json={"schedule_start": "2099-06-01T14:00:00"},
        headers=admin_token_header,
    )
    assert r.status_code == 204
    detail = client.get(f"/admin/quiz/{quiz_id}", headers=admin_token_header).json()
    assert detail["schedule_start"] == "2099-06-01T14:00:00Z"


def test_patch_availability_normalizes_offset_datetime_to_utc(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    quiz_id, _ = _create_and_activate(client, admin_token_header)
    r = client.patch(
        f"/admin/quiz/{quiz_id}/availability",
        json={"schedule_start": "2099-06-01T16:00:00+02:00"},
        headers=admin_token_header,
    )
    assert r.status_code == 204
    detail = client.get(f"/admin/quiz/{quiz_id}", headers=admin_token_header).json()
    assert detail["schedule_start"] == "2099-06-01T14:00:00Z"


def test_activate_with_bad_schedule_start_returns_422(
    client: TestClient, admin_token_header: dict[str, str]
) -> None:
    r = client.post(
        "/admin/quiz", json=_minimal_quiz_payload(), headers=admin_token_header
    )
    assert r.status_code == 200
    quiz_id = r.json()["id"]
    r = client.post(
        f"/admin/quiz/{quiz_id}/activate",
        json={"schedule_start": "garbage"},
        headers=admin_token_header,
    )
    assert r.status_code == 422
