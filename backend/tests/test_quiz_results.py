from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))


def _full_correct_payload() -> dict:
    return {
        "answers": [
            {"questionId": 1, "selected": [1]},
            {"questionId": 2, "selected": [0, 2]},
            {"questionId": 3, "selected": [1]},
            {"questionId": 4, "selected": [2]},
            {
                "questionId": 5,
                "ordering": [
                    "Analiza leksykalna",
                    "Analiza składniowa",
                    "Optymalizacja",
                    "Generowanie kodu",
                ],
            },
            {"questionId": 6, "value": 32},
            {"questionId": 7, "value": 7},
        ]
    }


def test_quiz_results_returns_points_and_percentage(client: TestClient) -> None:
    response = client.post("/quiz/results", json=_full_correct_payload())

    assert response.status_code == 200
    data = response.json()

    assert data["scorePoints"] == 7
    assert data["scoreMaxPoints"] == 7
    assert data["scorePercent"] == 100
    assert data["correct"] == 7
    assert data["scoreTotal"] == 7
    assert isinstance(data["message"], str)
    assert data["message"]


def test_quiz_results_hides_review_when_env_disabled(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("QUIZ_SHOW_ANSWER_REVIEW", "false")

    response = client.post("/quiz/results", json=_full_correct_payload())

    assert response.status_code == 200
    data = response.json()

    assert data["showAnswerReview"] is False
    assert data["reviewQuestions"] == []


def test_quiz_results_shows_review_when_env_enabled(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("QUIZ_SHOW_ANSWER_REVIEW", "true")

    response = client.post("/quiz/results", json=_full_correct_payload())

    assert response.status_code == 200
    data = response.json()

    assert data["showAnswerReview"] is True
    assert len(data["reviewQuestions"]) == 7
