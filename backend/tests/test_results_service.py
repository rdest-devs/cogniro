from __future__ import annotations

import datetime as dt
import json

from services.results import (
    ResultEntry,
    ResultFileMetadata,
    delete_result_day,
    delete_result_file,
    list_result_dates,
    list_results_in_day,
    read_result_file,
    write_result_file,
)
from services.storage import initialize_storage


def _entries() -> list[ResultEntry]:
    return [
        ResultEntry(nickname="Ala", score=4500, submitted_at="2026-05-17T19:18:02Z")
    ]


def test_write_result_file_creates_path() -> None:
    paths = initialize_storage()
    name = write_result_file(
        paths,
        quiz_id="quiz_abc",
        quiz_title="Tytuł",
        session_started_at=dt.datetime(2026, 5, 17, 19, 0, 1, tzinfo=dt.timezone.utc),
        session_stopped_at=dt.datetime(2026, 5, 17, 19, 23, 44, tzinfo=dt.timezone.utc),
        entries=_entries(),
    )
    assert name == "quiz_abc_tytul_19-23-44.json"
    path = paths.results_dir / "2026-05-17" / name
    assert path.is_file()
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["scores"][0]["nickname"] == "Ala"


def test_list_dates_and_files() -> None:
    paths = initialize_storage()
    write_result_file(
        paths,
        quiz_id="quiz_a",
        quiz_title="x",
        session_started_at=dt.datetime(2026, 5, 17, tzinfo=dt.timezone.utc),
        session_stopped_at=dt.datetime(2026, 5, 17, 10, 0, 0, tzinfo=dt.timezone.utc),
        entries=_entries(),
    )
    write_result_file(
        paths,
        quiz_id="quiz_b",
        quiz_title="y",
        session_started_at=dt.datetime(2026, 5, 18, tzinfo=dt.timezone.utc),
        session_stopped_at=dt.datetime(2026, 5, 18, 10, 0, 0, tzinfo=dt.timezone.utc),
        entries=_entries(),
    )
    assert list_result_dates(paths) == ["2026-05-18", "2026-05-17"]
    files = list_results_in_day(paths, "2026-05-17")
    assert len(files) == 1
    assert isinstance(files[0], ResultFileMetadata)
    assert files[0].quiz_id == "quiz_a"


def test_read_and_delete_file_and_day() -> None:
    paths = initialize_storage()
    name = write_result_file(
        paths,
        quiz_id="quiz_a",
        quiz_title="x",
        session_started_at=dt.datetime(2026, 5, 17, tzinfo=dt.timezone.utc),
        session_stopped_at=dt.datetime(2026, 5, 17, 10, 0, 0, tzinfo=dt.timezone.utc),
        entries=_entries(),
    )
    payload = read_result_file(paths, "2026-05-17", name)
    assert payload["quiz_id"] == "quiz_a"
    delete_result_file(paths, "2026-05-17", name)
    assert not (paths.results_dir / "2026-05-17" / name).exists()
    delete_result_day(paths, "2026-05-17")
    assert not (paths.results_dir / "2026-05-17").exists()
