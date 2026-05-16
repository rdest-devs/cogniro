from __future__ import annotations

from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from schemas.admin_quiz import AdminQuizUpsertPayload
from services.storage import to_stored_quiz


def test_to_stored_quiz_drops_question_and_answer_ids() -> None:
    payload = AdminQuizUpsertPayload.model_validate(
        {
            "title": "Test quiz",
            "questions": [
                {
                    "id": "q1",
                    "text": "Pytanie",
                    "type": "single_choice",
                    "answers": [
                        {"id": "a1", "text": "A", "is_correct": True},
                        {"id": "a2", "text": "B", "is_correct": False},
                    ],
                }
            ],
        }
    )

    stored = to_stored_quiz(payload)
    question = stored["questions"][0]

    assert "id" not in question
    assert "id" not in question["answers"][0]
    assert "id" not in question["answers"][1]


def test_admin_quiz_payload_rejects_unsupported_question_type() -> None:
    with pytest.raises(ValueError):
        AdminQuizUpsertPayload.model_validate(
            {
                "title": "Test quiz",
                "questions": [
                    {
                        "text": "Pytanie",
                        "type": "unsupported_type",
                        "answers": [
                            {"text": "A", "is_correct": True},
                            {"text": "B", "is_correct": False},
                        ],
                    }
                ],
            }
        )
