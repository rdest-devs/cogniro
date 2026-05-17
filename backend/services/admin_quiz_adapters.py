from __future__ import annotations

from typing import Literal

from schemas.admin_quiz import (
    AdminQuizChoicePayload,
    AdminQuizDetailResponse,
    AdminQuizMultiChoicePayload,
    AdminQuizQuestionPayload,
    AdminQuizSingleChoicePayload,
    AdminQuizSliderPayload,
    AdminQuizTrueFalsePayload,
    AdminQuizUpsertPayload,
)
from schemas.kqf import (
    KqfChoice,
    KqfFrontMatter,
    KqfMedia,
    KqfMultiChoice,
    KqfQuestion,
    KqfQuiz,
    KqfSingleChoice,
    KqfSlider,
    KqfTrueFalse,
)


def _kqf_media(image: str | None, hint: str | None) -> KqfMedia:
    return KqfMedia(image=image, hint=hint)


def upsert_payload_to_kqf(
    payload: AdminQuizUpsertPayload, *, existing: KqfQuiz | None
) -> KqfQuiz:
    existing_ids = [q.id for q in existing.questions] if existing else []
    questions: list[KqfQuestion] = []
    for index, q in enumerate(payload.questions):
        raw_id = (getattr(q, "id", None) or "").strip()
        qid = raw_id or (
            existing_ids[index] if index < len(existing_ids) else f"Q{index + 1}"
        )
        media = _kqf_media(q.image, q.hint)
        common = {
            "id": qid,
            "text": q.text,
            "time_s": q.time_s,
            "points": q.points,
            "media": media,
        }
        if isinstance(q, AdminQuizSingleChoicePayload):
            questions.append(
                KqfSingleChoice(
                    type="singlechoice",
                    choices=[
                        KqfChoice(text=c.text, is_correct=c.is_correct)
                        for c in q.choices
                    ],
                    **common,
                )
            )
        elif isinstance(q, AdminQuizMultiChoicePayload):
            questions.append(
                KqfMultiChoice(
                    type="multichoice",
                    choices=[
                        KqfChoice(text=c.text, is_correct=c.is_correct)
                        for c in q.choices
                    ],
                    **common,
                )
            )
        elif isinstance(q, AdminQuizTrueFalsePayload):
            questions.append(
                KqfTrueFalse(type="truefalse", correct=q.correct, **common)
            )
        elif isinstance(q, AdminQuizSliderPayload):
            questions.append(
                KqfSlider(
                    type="slider",
                    correct=q.correct,
                    min=q.min,
                    max=q.max,
                    step=q.step,
                    tolerance=q.tolerance,
                    unit=q.unit,
                    **common,
                )
            )
    return KqfQuiz(
        front_matter=KqfFrontMatter(
            title=payload.title.strip(),
            description=payload.description,
            author=payload.author,
            tags=list(payload.tags),
        ),
        questions=questions,
    )


def kqf_to_admin_detail_payload(
    quiz: KqfQuiz,
    *,
    quiz_id: str,
    status: Literal["idle", "running"],
    created_at: str,
    updated_at: str,
    last_activated_at: str | None,
) -> AdminQuizDetailResponse:
    questions: list[AdminQuizQuestionPayload] = []
    for q in quiz.questions:
        common = {
            "id": q.id,
            "text": q.text,
            "time_s": q.time_s,
            "points": q.points,
            "image": q.media.image,
            "hint": q.media.hint,
        }
        if q.type == "singlechoice":
            questions.append(
                AdminQuizSingleChoicePayload(
                    type="singlechoice",
                    choices=[
                        AdminQuizChoicePayload(text=c.text, is_correct=c.is_correct)
                        for c in q.choices
                    ],
                    **common,
                )
            )
        elif q.type == "multichoice":
            questions.append(
                AdminQuizMultiChoicePayload(
                    type="multichoice",
                    choices=[
                        AdminQuizChoicePayload(text=c.text, is_correct=c.is_correct)
                        for c in q.choices
                    ],
                    **common,
                )
            )
        elif q.type == "truefalse":
            questions.append(
                AdminQuizTrueFalsePayload(type="truefalse", correct=q.correct, **common)
            )
        elif q.type == "slider":
            questions.append(
                AdminQuizSliderPayload(
                    type="slider",
                    correct=q.correct,
                    min=q.min,
                    max=q.max,
                    step=q.step,
                    tolerance=q.tolerance,
                    unit=q.unit,
                    **common,
                )
            )
    return AdminQuizDetailResponse(
        id=quiz_id,
        title=quiz.front_matter.title,
        description=quiz.front_matter.description,
        author=quiz.front_matter.author,
        tags=list(quiz.front_matter.tags),
        status=status,
        created_at=created_at,
        updated_at=updated_at,
        last_activated_at=last_activated_at,
        questions=questions,
    )
