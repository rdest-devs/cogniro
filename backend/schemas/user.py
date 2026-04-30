from typing import Literal

from pydantic import BaseModel, Field


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
