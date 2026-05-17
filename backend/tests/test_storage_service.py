from __future__ import annotations

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
