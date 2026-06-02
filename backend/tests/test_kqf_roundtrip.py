from __future__ import annotations

from schemas.kqf import (
    KqfChoice,
    KqfFrontMatter,
    KqfMedia,
    KqfMultiChoice,
    KqfQuiz,
    KqfSingleChoice,
    KqfSlider,
    KqfTrueFalse,
)
from services.kqf import parse_kqf, serialize_kqf


def _assert_roundtrip(quiz: KqfQuiz) -> None:
    text = serialize_kqf(quiz)
    parsed = parse_kqf(text)
    assert parsed.model_dump() == quiz.model_dump()
    assert serialize_kqf(parsed) == text


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


def test_roundtrip_slider_with_extreme_labels() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="Opinions"),
        questions=[
            KqfSlider(
                id="Q1",
                type="slider",
                text="How much do you agree?",
                correct=5,
                min=1,
                max=10,
                step=1,
                tolerance=2,
                min_label="Zdecydowanie nie",
                max_label="Zdecydowanie tak",
            ),
        ],
    )
    _assert_roundtrip(quiz)
    parsed = parse_kqf(serialize_kqf(quiz))
    slider = parsed.questions[0]
    assert isinstance(slider, KqfSlider)
    assert slider.min_label == "Zdecydowanie nie"
    assert slider.max_label == "Zdecydowanie tak"
