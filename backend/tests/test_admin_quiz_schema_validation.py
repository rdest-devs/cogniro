from __future__ import annotations

import pytest
from pydantic import ValidationError

from schemas.admin_quiz import AdminQuizUpsertPayload


def test_admin_quiz_allows_image_only_choice() -> None:
    payload = {
        "title": "T",
        "questions": [
            {
                "text": "Q",
                "type": "singlechoice",
                "choices": [
                    {"text": "", "is_correct": True, "image": "./media/asset_a"},
                    {"text": "B", "is_correct": False},
                ],
            }
        ],
    }
    AdminQuizUpsertPayload.model_validate(payload)


def test_admin_quiz_rejects_empty_choice_without_image() -> None:
    payload = {
        "title": "T",
        "questions": [
            {
                "text": "Q",
                "type": "singlechoice",
                "choices": [
                    {"text": "", "is_correct": True},
                    {"text": "B", "is_correct": False},
                ],
            }
        ],
    }
    with pytest.raises(ValidationError):
        AdminQuizUpsertPayload.model_validate(payload)


def test_admin_quiz_payload_rejects_unsupported_question_type() -> None:
    with pytest.raises(ValidationError):
        AdminQuizUpsertPayload.model_validate(
            {
                "title": "Test quiz",
                "questions": [
                    {
                        "text": "Pytanie",
                        "type": "unsupported_type",
                        "choices": [
                            {"text": "A", "is_correct": True},
                            {"text": "B", "is_correct": False},
                        ],
                    }
                ],
            }
        )
