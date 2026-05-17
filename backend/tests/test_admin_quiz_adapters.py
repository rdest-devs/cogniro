from __future__ import annotations

from schemas.admin_quiz import (
    AdminQuizChoicePayload,
    AdminQuizSingleChoicePayload,
    AdminQuizSliderPayload,
    AdminQuizTrueFalsePayload,
    AdminQuizUpsertPayload,
)
from schemas.kqf import KqfQuiz
from services.admin_quiz_adapters import (
    kqf_to_admin_detail_payload,
    upsert_payload_to_kqf,
)


def _payload() -> AdminQuizUpsertPayload:
    return AdminQuizUpsertPayload(
        title="T",
        description="d",
        author="a",
        tags=["x"],
        questions=[
            AdminQuizSingleChoicePayload(
                type="singlechoice",
                text="?",
                time_s=30,
                points=1000,
                choices=[
                    AdminQuizChoicePayload(text="a", is_correct=True),
                    AdminQuizChoicePayload(text="b", is_correct=False),
                ],
            ),
            AdminQuizTrueFalsePayload(type="truefalse", text="t?", correct=True),
            AdminQuizSliderPayload(
                type="slider",
                text="y?",
                correct=1989,
                min=1900,
                max=2000,
                unit="year",
            ),
        ],
    )


def test_upsert_to_kqf_roundtrip() -> None:
    quiz = upsert_payload_to_kqf(_payload(), existing=None)
    assert isinstance(quiz, KqfQuiz)
    assert quiz.front_matter.title == "T"
    assert quiz.questions[0].id == "Q1"
    assert quiz.questions[1].id == "Q2"
    assert quiz.questions[2].id == "Q3"


def test_preserves_existing_ids() -> None:
    quiz = upsert_payload_to_kqf(_payload(), existing=None)
    quiz.questions[0].id = "myID"
    payload2 = AdminQuizUpsertPayload(
        title="T",
        questions=[
            AdminQuizSingleChoicePayload(
                id="myID",
                type="singlechoice",
                text="?",
                time_s=30,
                points=1000,
                choices=[
                    AdminQuizChoicePayload(text="a", is_correct=True),
                    AdminQuizChoicePayload(text="b", is_correct=False),
                ],
            ),
        ],
    )
    quiz2 = upsert_payload_to_kqf(payload2, existing=quiz)
    assert quiz2.questions[0].id == "myID"


def test_kqf_to_admin_detail() -> None:
    quiz = upsert_payload_to_kqf(_payload(), existing=None)
    detail = kqf_to_admin_detail_payload(
        quiz,
        quiz_id="quiz_abc",
        status="idle",
        created_at="t1",
        updated_at="t2",
        last_activated_at=None,
    )
    assert detail.id == "quiz_abc"
    assert detail.questions[0].type == "singlechoice"
    assert detail.show_answer_review is True
    assert detail.questions[2].type == "slider"
