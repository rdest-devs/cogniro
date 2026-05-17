from __future__ import annotations

from schemas.kqf import KqfChoice, KqfFrontMatter, KqfQuiz, KqfSingleChoice
from services.quiz_files import (
    QuizMeta,
    derive_meta_from_kqf,
    read_meta_or_rebuild,
    read_quiz_kqf,
    write_quiz_dir,
)
from services.storage import initialize_storage, quiz_dir_for


def _example_quiz() -> KqfQuiz:
    return KqfQuiz(
        front_matter=KqfFrontMatter(title="Tytuł"),
        questions=[
            KqfSingleChoice(
                id="Q1",
                type="singlechoice",
                text="?",
                choices=[
                    KqfChoice(text="a", is_correct=True),
                    KqfChoice(text="b", is_correct=False),
                ],
            )
        ],
    )


def test_write_quiz_dir_creates_kqf_meta_media() -> None:
    paths = initialize_storage()
    qd = quiz_dir_for(paths, "quiz_abc")
    write_quiz_dir(qd, _example_quiz(), created_at="2026-05-17T00:00:00Z")
    assert (qd / "quiz.kqf").is_file()
    assert (qd / "meta.json").is_file()
    assert (qd / "media").is_dir()


def test_read_quiz_kqf_roundtrip() -> None:
    paths = initialize_storage()
    qd = quiz_dir_for(paths, "quiz_abc")
    quiz = _example_quiz()
    write_quiz_dir(qd, quiz, created_at="2026-05-17T00:00:00Z")
    assert read_quiz_kqf(qd).model_dump() == quiz.model_dump()


def test_meta_rebuild_if_missing() -> None:
    paths = initialize_storage()
    qd = quiz_dir_for(paths, "quiz_abc")
    write_quiz_dir(qd, _example_quiz(), created_at="2026-05-17T00:00:00Z")
    (qd / "meta.json").unlink()
    meta = read_meta_or_rebuild(qd, "quiz_abc")
    assert isinstance(meta, QuizMeta)
    assert meta.title == "Tytuł"
    assert meta.question_count == 1
    assert (qd / "meta.json").is_file()


def test_meta_rebuild_when_id_mismatch() -> None:
    paths = initialize_storage()
    qd = quiz_dir_for(paths, "quiz_abc")
    write_quiz_dir(qd, _example_quiz(), created_at="2026-05-17T00:00:00Z")
    raw = (qd / "meta.json").read_text(encoding="utf-8")
    (qd / "meta.json").write_text(
        raw.replace('"id": "quiz_abc"', '"id": "quiz_other"'),
        encoding="utf-8",
    )
    meta = read_meta_or_rebuild(qd, "quiz_abc")
    assert meta.id == "quiz_abc"
    assert meta.title == "Tytuł"


def test_derive_meta() -> None:
    meta = derive_meta_from_kqf(
        _example_quiz(),
        quiz_id="quiz_abc",
        created_at="2026-05-17T00:00:00Z",
        updated_at="2026-05-17T00:00:00Z",
        last_activated_at=None,
    )
    assert meta.id == "quiz_abc"
    assert meta.question_count == 1
