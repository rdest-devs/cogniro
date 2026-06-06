from __future__ import annotations

from schemas.kqf import (
    KqfChoice,
    KqfFrontMatter,
    KqfMedia,
    KqfMultiChoice,
    KqfOrdering,
    KqfQuiz,
    KqfSingleChoice,
    KqfSlider,
    KqfTrueFalse,
)
from services.kqf import parse_kqf, serialize_kqf


def test_roundtrip_ordering() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="Order"),
        questions=[
            KqfOrdering(
                id="O1",
                type="ordering",
                text="Sort these.",
                items=["B", "C", "A", "D"],
                correct_order=[2, 0, 1, 3],
                time_s=30,
                points=500,
            )
        ],
    )
    _assert_roundtrip(quiz)


def test_roundtrip_slider_scale() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="Scale"),
        questions=[
            KqfSlider(
                id="S1",
                type="slider",
                text="Rate your confidence.",
                min=1,
                max=10,
                step=1,
                score="scale",
                label_min="Niska pewność",
                label_max="Wysoka pewność",
                points=1,
            )
        ],
    )
    _assert_roundtrip(quiz)


def test_roundtrip_slider_range_with_labels() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="Range"),
        questions=[
            KqfSlider(
                id="S2",
                type="slider",
                text="Year?",
                correct=1989,
                min=1900,
                max=2000,
                label_min="Early",
                label_max="Late",
                points=800,
            )
        ],
    )
    _assert_roundtrip(quiz)


def _assert_roundtrip(quiz: KqfQuiz) -> None:
    text = serialize_kqf(quiz)
    parsed = parse_kqf(text)
    assert parsed.model_dump() == quiz.model_dump()
    assert serialize_kqf(parsed) == text


def test_roundtrip_front_matter_time_and_shuffle() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(
            title="Timed Shuffled Quiz",
            time_limit=120,
            shuffle_questions=True,
            shuffle_mode="session",
        ),
        questions=[
            KqfTrueFalse(
                id="Q1",
                type="truefalse",
                text="Is Python interpreted?",
                correct=True,
                points=500,
            )
        ],
    )
    _assert_roundtrip(quiz)


def test_roundtrip_front_matter_shuffle_per_player() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(
            title="Per-Player Shuffle",
            shuffle_questions=True,
            shuffle_mode="per_player",
        ),
        questions=[
            KqfTrueFalse(
                id="Q1",
                type="truefalse",
                text="True or false?",
                correct=False,
                points=500,
            )
        ],
    )
    _assert_roundtrip(quiz)


def test_roundtrip_front_matter_defaults_not_written() -> None:
    """shuffle_questions=False and shuffle_mode='per_player' are defaults — they must not appear in serialized text."""
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="Clean"),
        questions=[
            KqfTrueFalse(id="Q1", type="truefalse", text="T?", correct=True, points=100)
        ],
    )
    text = serialize_kqf(quiz)
    assert "shuffle_questions" not in text
    assert "shuffle_mode" not in text
    assert "time_limit" not in text


def test_roundtrip_full_kqf_example() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="Science", author="Bot", tags=["science"]),
        questions=[
            KqfSingleChoice(
                id="Q1",
                type="singlechoice",
                text="H2O?",
                time_s=20,
                points=1000,
                choices=[
                    KqfChoice(text="Water", is_correct=True),
                    KqfChoice(text="Air", is_correct=False),
                ],
                media=KqfMedia(image="./media/water.jpg"),
            ),
            KqfTrueFalse(
                id="Q2",
                type="truefalse",
                text="Sound > light.",
                correct=False,
                time_s=10,
                points=500,
            ),
            KqfSlider(
                id="Q3",
                type="slider",
                text="Boiling C?",
                correct=100,
                min=50,
                max=150,
                step=1,
                tolerance=0,
                unit="C",
                time_s=30,
                points=800,
            ),
            KqfMultiChoice(
                id="Q4",
                type="multichoice",
                text="Noble gases?",
                time_s=40,
                points=600,
                choices=[
                    KqfChoice(text="He", is_correct=True),
                    KqfChoice(text="Ne", is_correct=True),
                    KqfChoice(text="O", is_correct=False),
                ],
                media=KqfMedia(hint="Right column."),
            ),
        ],
    )
    _assert_roundtrip(quiz)
