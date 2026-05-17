from __future__ import annotations

from pathlib import Path

import pytest

from services.storage import (
    StoragePaths,
    generate_quiz_id,
    initialize_storage,
    quiz_dir_for,
)


def test_initialize_storage_creates_expected_tree() -> None:
    paths = initialize_storage()
    assert isinstance(paths, StoragePaths)
    assert paths.quizzes_dir.is_dir()
    assert paths.results_dir.is_dir()
    assert paths.staging_dir.is_dir()
    assert paths.data_dir.is_dir()


def test_resolve_storage_paths_respects_cogniro_storage_dir(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.delenv("COGNIRO_DATA_DIR", raising=False)
    root = tmp_path / "app"
    storage_root = root / "custom_storage"
    storage_root.mkdir(parents=True)
    monkeypatch.setenv("COGNIRO_STORAGE_DIR", str(storage_root))

    from services.storage import resolve_storage_paths

    paths = resolve_storage_paths()
    assert paths.data_dir == root
    assert paths.quizzes_dir == storage_root / "quizzes"
    assert paths.results_dir == storage_root / "results"
    assert paths.staging_dir == root / "uploads" / "quiz-assets"


def test_generate_quiz_id_prefix_and_uniqueness() -> None:
    ids = {generate_quiz_id() for _ in range(50)}
    assert len(ids) == 50
    for quiz_id in ids:
        assert quiz_id.startswith("quiz_")
        assert len(quiz_id) > len("quiz_") + 8


def test_quiz_dir_for_creates_path() -> None:
    paths = initialize_storage()
    qd = quiz_dir_for(paths, "quiz_foo")
    assert qd == paths.quizzes_dir / "quiz_foo"
