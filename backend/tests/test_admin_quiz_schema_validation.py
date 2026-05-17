from __future__ import annotations

import pytest
from pydantic import ValidationError

from schemas.admin_quiz import AdminQuizUpsertPayload


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
