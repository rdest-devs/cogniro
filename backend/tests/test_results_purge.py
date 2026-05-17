from __future__ import annotations

import datetime as dt

from services.results import purge_results_older_than
from services.storage import initialize_storage


def test_purge_removes_only_old_dates() -> None:
    paths = initialize_storage()
    for name in ("2026-05-01", "2026-05-15", "2026-05-17"):
        (paths.results_dir / name).mkdir(parents=True)
        (paths.results_dir / name / "x.json").write_text("{}", encoding="utf-8")
    removed = purge_results_older_than(
        paths,
        dt.timedelta(days=10),
        today=dt.date(2026, 5, 17),
    )
    assert removed == 1
    assert not (paths.results_dir / "2026-05-01").exists()
    assert (paths.results_dir / "2026-05-15").is_dir()
    assert (paths.results_dir / "2026-05-17").is_dir()
