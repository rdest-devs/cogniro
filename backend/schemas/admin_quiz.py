from __future__ import annotations

from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator


class QuizImage(BaseModel):
    assetId: str = Field(min_length=1)
    url: str = Field(min_length=1)
    thumbUrl: str = Field(min_length=1)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    alt: str = ""

    model_config = ConfigDict(extra="ignore")


class QuizAssetUploadResponse(QuizImage):
    pass


class AdminQuizAnswer(BaseModel):
    id: str | None = None
    text: str = ""
    is_correct: bool = Field(
        validation_alias=AliasChoices("is_correct", "isCorrect"),
        serialization_alias="is_correct",
    )
    image: QuizImage | None = None

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    @model_validator(mode="after")
    def validate_text_or_image(self) -> "AdminQuizAnswer":
        if not self.text.strip() and self.image is None:
            raise ValueError(
                "Odpowiedź musi zawierać tekst lub obraz (text albo image)."
            )
        return self


class AdminQuizQuestion(BaseModel):
    id: str | None = None
    text: str = ""
    type: Literal["single_choice", "multiple_choice"]
    image: QuizImage | None = None
    answers: list[AdminQuizAnswer] = Field(min_length=2)

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def validate_question(self) -> "AdminQuizQuestion":
        if not self.text.strip() and self.image is None:
            raise ValueError("Pytanie musi zawierać tekst lub obraz (text albo image).")

        correct_answers_count = sum(answer.is_correct for answer in self.answers)
        if self.type == "single_choice" and correct_answers_count != 1:
            raise ValueError(
                "Pytanie typu single_choice musi mieć dokładnie 1 poprawną odpowiedź."
            )
        if self.type == "multiple_choice" and correct_answers_count < 1:
            raise ValueError(
                "Pytanie typu multiple_choice musi mieć co najmniej 1 poprawną odpowiedź."
            )
        return self


class AdminQuizUpsertPayload(BaseModel):
    title: str = Field(min_length=1)
    time_limit: int | None = Field(default=None, gt=0)
    shuffle_questions: bool = False
    show_answers_after: bool = True
    show_leaderboard_after: bool = False
    questions: list[AdminQuizQuestion] = Field(min_length=1)

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def validate_title(self) -> "AdminQuizUpsertPayload":
        if not self.title.strip():
            raise ValueError("Tytuł quizu nie może być pusty.")
        return self
