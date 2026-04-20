import os
from typing import Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SubmittedAnswer(BaseModel):
    questionId: int
    selected: list[int] = Field(default_factory=list)
    ordering: list[str] | None = None
    value: float | None = None


class QuizResultsRequest(BaseModel):
    answers: list[SubmittedAnswer]


class ReviewAnswer(BaseModel):
    text: str
    state: Literal["correct-selected", "wrong-selected", "correct", "neutral"]
    yourAnswer: bool = False


class ReviewQuestion(BaseModel):
    number: int
    text: str
    isCorrect: bool
    answers: list[ReviewAnswer]


class QuizResultsResponse(BaseModel):
    scorePercent: int
    scorePoints: int
    scoreMaxPoints: int
    correct: int
    scoreTotal: int
    showAnswerReview: bool
    message: str
    reviewQuestions: list[ReviewQuestion] = Field(default_factory=list)


def _env_bool(key: str, default: bool) -> bool:
    raw = os.getenv(key)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _build_result_message(score_percent: int) -> str:
    if score_percent >= 90:
        return "Świetny wynik! Znakomicie poradziłeś(-aś) sobie z quizem."
    if score_percent >= 70:
        return "Bardzo dobry wynik! Jesteś na dobrej drodze."
    if score_percent >= 50:
        return "Dobry start! Przejrzyj odpowiedzi i spróbuj jeszcze raz."
    return "To dopiero początek — przejrzyj odpowiedzi i podejdź do quizu ponownie."


MOCK_QUESTIONS = [
    {
        "id": 1,
        "type": "single",
        "text": "Który protokół jest używany do bezpiecznego przesyłania danych w sieci?",
        "answers": ["HTTP", "HTTPS", "FTP", "SMTP"],
        "correct_indices": [1],
    },
    {
        "id": 2,
        "type": "multiple",
        "text": "Które z poniższych są językami programowania?",
        "answers": ["Python", "HTML", "Java", "CSS"],
        "correct_indices": [0, 2],
    },
    {
        "id": 3,
        "type": "image-question",
        "text": "Który schemat blokowy przedstawia pętlę while?",
        "answers": ["Schemat A", "Schemat B", "Schemat C"],
        "correct_indices": [1],
    },
    {
        "id": 4,
        "type": "image-answers",
        "text": "Który obraz przedstawia strukturę drzewa binarnego?",
        "answers": ["A", "B", "C", "D"],
        "correct_indices": [2],
    },
    {
        "id": 5,
        "type": "ordering",
        "text": "Ułóż etapy kompilacji programu w odpowiedniej kolejności",
        "correct_order": [
            "Analiza leksykalna",
            "Analiza składniowa",
            "Optymalizacja",
            "Generowanie kodu",
        ],
    },
    {
        "id": 6,
        "type": "slider",
        "text": "Ile bitów ma adres IPv4?",
        "correct_value": 32,
    },
    {
        "id": 7,
        "type": "range-slider",
        "text": "Oceń swoją pewność w zakresie programowania obiektowego",
        "correct_value": 7,
    },
]


def _build_choice_review(
    question: dict, selected: set[int]
) -> tuple[bool, list[ReviewAnswer]]:
    correct = set(question["correct_indices"])
    is_correct = selected == correct

    review_answers: list[ReviewAnswer] = []
    for answer_index, answer_text in enumerate(question["answers"]):
        in_selected = answer_index in selected
        in_correct = answer_index in correct

        if in_selected and in_correct:
            state = "correct-selected"
        elif in_selected and not in_correct:
            state = "wrong-selected"
        elif in_correct:
            state = "correct"
        else:
            state = "neutral"

        review_answers.append(
            ReviewAnswer(
                text=answer_text,
                state=state,
                yourAnswer=in_selected,
            )
        )

    return is_correct, review_answers


def _build_ordering_review(
    question: dict, ordering: list[str] | None
) -> tuple[bool, list[ReviewAnswer]]:
    submitted_order = ordering or []
    correct_order = question["correct_order"]
    is_correct = submitted_order == correct_order

    review_answers: list[ReviewAnswer] = []
    if submitted_order:
        for idx, item in enumerate(submitted_order):
            expected = correct_order[idx] if idx < len(correct_order) else None
            review_answers.append(
                ReviewAnswer(
                    text=item,
                    state="correct-selected" if item == expected else "wrong-selected",
                    yourAnswer=True,
                )
            )
    else:
        for item in correct_order:
            review_answers.append(
                ReviewAnswer(
                    text=item,
                    state="correct",
                    yourAnswer=False,
                )
            )

    return is_correct, review_answers


def _build_numeric_review(
    question: dict, value: float | None
) -> tuple[bool, list[ReviewAnswer]]:
    correct_value = float(question["correct_value"])
    submitted_value = float(value) if value is not None else None
    is_correct = submitted_value is not None and submitted_value == correct_value

    if submitted_value is None:
        return (
            False,
            [
                ReviewAnswer(
                    text=f"Poprawna odpowiedź: {int(correct_value)}",
                    state="correct",
                    yourAnswer=False,
                )
            ],
        )

    return (
        is_correct,
        [
            ReviewAnswer(
                text=f"Twoja odpowiedź: {int(submitted_value)}",
                state="correct-selected" if is_correct else "wrong-selected",
                yourAnswer=True,
            ),
            ReviewAnswer(
                text=f"Poprawna odpowiedź: {int(correct_value)}",
                state="neutral" if is_correct else "correct",
                yourAnswer=False,
            ),
        ],
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/quiz/results", response_model=QuizResultsResponse)
async def quiz_results(payload: QuizResultsRequest) -> QuizResultsResponse:
    show_answer_review = _env_bool("QUIZ_SHOW_ANSWER_REVIEW", default=True)
    submitted_by_id = {answer.questionId: answer for answer in payload.answers}

    correct = 0
    review_questions: list[ReviewQuestion] = []

    for idx, question in enumerate(MOCK_QUESTIONS, start=1):
        submitted = submitted_by_id.get(question["id"])

        if question["type"] in {
            "single",
            "multiple",
            "image-question",
            "image-answers",
        }:
            selected = set(submitted.selected) if submitted else set()
            is_correct, review_answers = _build_choice_review(question, selected)
        elif question["type"] == "ordering":
            ordering = submitted.ordering if submitted else None
            is_correct, review_answers = _build_ordering_review(question, ordering)
        elif question["type"] in {"slider", "range-slider"}:
            value = submitted.value if submitted else None
            is_correct, review_answers = _build_numeric_review(question, value)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown question type: {question['type']}",
            )

        if is_correct:
            correct += 1

        review_questions.append(
            ReviewQuestion(
                number=idx,
                text=question["text"],
                isCorrect=is_correct,
                answers=review_answers,
            )
        )

    score_total = len(MOCK_QUESTIONS)
    score_percent = round((correct / score_total) * 100) if score_total else 0
    score_points = correct

    return QuizResultsResponse(
        scorePercent=score_percent,
        scorePoints=score_points,
        scoreMaxPoints=score_total,
        correct=correct,
        scoreTotal=score_total,
        showAnswerReview=show_answer_review,
        message=_build_result_message(score_percent),
        reviewQuestions=review_questions if show_answer_review else [],
    )


def main():
    print("Backend module loaded. Serve `app` with an ASGI server.")


if __name__ == "__main__":
    main()
