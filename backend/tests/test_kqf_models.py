from __future__ import annotations

import pytest
from pydantic import ValidationError

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


def test_front_matter_minimal() -> None:
    fm = KqfFrontMatter(title="Test")
    assert fm.title == "Test"
    assert fm.tags == []
    assert fm.show_answer_review is True


def test_singlechoice_requires_exactly_one_correct() -> None:
    KqfSingleChoice(
        id="Q1",
        type="singlechoice",
        text="x?",
        choices=[
            KqfChoice(text="a", is_correct=True),
            KqfChoice(text="b", is_correct=False),
        ],
    )
    with pytest.raises(ValidationError, match="exactly one correct"):
        KqfSingleChoice(
            id="Q1",
            type="singlechoice",
            text="x?",
            choices=[
                KqfChoice(text="a", is_correct=True),
                KqfChoice(text="b", is_correct=True),
            ],
        )


def test_singlechoice_choice_count_bounds() -> None:
    with pytest.raises(ValidationError):
        KqfSingleChoice(
            id="Q1",
            type="singlechoice",
            text="x?",
            choices=[KqfChoice(text="a", is_correct=True)],
        )
    with pytest.raises(ValidationError):
        KqfSingleChoice(
            id="Q1",
            type="singlechoice",
            text="x?",
            choices=[KqfChoice(text=f"a{i}", is_correct=(i == 0)) for i in range(7)],
        )


def test_multichoice_requires_at_least_one_correct() -> None:
    KqfMultiChoice(
        id="Q2",
        type="multichoice",
        text="x?",
        choices=[
            KqfChoice(text="a", is_correct=True),
            KqfChoice(text="b", is_correct=True),
        ],
    )
    with pytest.raises(ValidationError, match="at least one correct"):
        KqfMultiChoice(
            id="Q2",
            type="multichoice",
            text="x?",
            choices=[
                KqfChoice(text="a", is_correct=False),
                KqfChoice(text="b", is_correct=False),
            ],
        )


def test_truefalse_uses_boolean_correct() -> None:
    q = KqfTrueFalse(id="Q3", type="truefalse", text="The sky is blue.", correct=True)
    assert q.correct is True


def test_slider_bounds() -> None:
    KqfSlider(id="Q4", type="slider", text="Year?", correct=1989, min=1900, max=2000)
    with pytest.raises(ValidationError, match="min must be < max"):
        KqfSlider(id="Q4", type="slider", text="?", correct=5, min=10, max=10)
    with pytest.raises(ValidationError, match="correct must be in"):
        KqfSlider(id="Q4", type="slider", text="?", correct=999, min=0, max=10)


def test_quiz_discriminator_routes_to_correct_subtype() -> None:
    quiz = KqfQuiz.model_validate(
        {
            "front_matter": {"title": "T"},
            "questions": [
                {
                    "id": "Q1",
                    "type": "singlechoice",
                    "text": "?",
                    "choices": [
                        {"text": "a", "is_correct": True},
                        {"text": "b", "is_correct": False},
                    ],
                },
                {"id": "Q2", "type": "truefalse", "text": "?", "correct": False},
            ],
        }
    )
    assert isinstance(quiz.questions[0], KqfSingleChoice)
    assert isinstance(quiz.questions[1], KqfTrueFalse)


def test_media_optional_and_independent_fields() -> None:
    m = KqfMedia(image="./media/foo.jpg", hint="hint")
    assert m.image == "./media/foo.jpg"
    assert m.video is None
