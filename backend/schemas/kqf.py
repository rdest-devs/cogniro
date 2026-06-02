from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from schemas.points import normalize_question_points


class KqfFrontMatter(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    author: str | None = None
    version: str | None = None
    language: str | None = None
    tags: list[str] = Field(default_factory=list)
    show_answer_review: bool = True

    model_config = ConfigDict(extra="ignore")


class KqfMedia(BaseModel):
    image: str | None = None
    video: str | None = None
    audio: str | None = None
    hint: str | None = None

    model_config = ConfigDict(extra="ignore")


class KqfChoice(BaseModel):
    text: str = ""
    is_correct: bool
    image: str | None = None

    @model_validator(mode="after")
    def _validate_text_or_image(self) -> "KqfChoice":
        if not self.text.strip() and not (self.image and self.image.strip()):
            raise ValueError("choice must have text or image")
        return self


class _KqfBaseQuestion(BaseModel):
    id: str = Field(min_length=1)
    text: str = Field(min_length=1)
    time_s: int | None = Field(default=None, gt=0)
    points: int = Field(default=1, ge=1)
    media: KqfMedia = Field(default_factory=KqfMedia)

    model_config = ConfigDict(extra="ignore")

    @field_validator("points", mode="before")
    @classmethod
    def _validate_points(cls, value: object) -> int:
        return normalize_question_points(value)


class KqfSingleChoice(_KqfBaseQuestion):
    type: Literal["singlechoice"]
    choices: list[KqfChoice] = Field(min_length=2, max_length=6)

    @model_validator(mode="after")
    def _validate_correct(self) -> KqfSingleChoice:
        correct = sum(1 for choice in self.choices if choice.is_correct)
        if correct != 1:
            raise ValueError("singlechoice must have exactly one correct choice")
        return self


class KqfMultiChoice(_KqfBaseQuestion):
    type: Literal["multichoice"]
    choices: list[KqfChoice] = Field(min_length=2, max_length=8)

    @model_validator(mode="after")
    def _validate_correct(self) -> KqfMultiChoice:
        if not any(choice.is_correct for choice in self.choices):
            raise ValueError("multichoice must have at least one correct choice")
        return self


class KqfTrueFalse(_KqfBaseQuestion):
    type: Literal["truefalse"]
    correct: bool


class KqfSlider(_KqfBaseQuestion):
    type: Literal["slider"]
    correct: float
    min: float
    max: float
    step: float = 1
    tolerance: float = 0
    unit: str | None = None
    # Optional labels describing the slider extremes (e.g. what min and max mean).
    min_label: str | None = None
    max_label: str | None = None

    @model_validator(mode="after")
    def _validate_range(self) -> KqfSlider:
        if self.min >= self.max:
            raise ValueError("min must be < max")
        if not (self.min <= self.correct <= self.max):
            raise ValueError("correct must be in [min, max]")
        if self.step <= 0:
            raise ValueError("step must be > 0")
        if self.tolerance < 0:
            raise ValueError("tolerance must be >= 0")
        return self


KqfQuestion = Annotated[
    KqfSingleChoice | KqfMultiChoice | KqfTrueFalse | KqfSlider,
    Field(discriminator="type"),
]


class KqfQuiz(BaseModel):
    front_matter: KqfFrontMatter
    questions: list[KqfQuestion] = Field(min_length=1)

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def _validate_unique_question_ids(self) -> "KqfQuiz":
        ids = [q.id.strip() for q in self.questions]
        if any(not qid for qid in ids):
            raise ValueError("question ids must not be blank")
        if len(ids) != len(set(ids)):
            raise ValueError("question ids must be unique")
        return self
