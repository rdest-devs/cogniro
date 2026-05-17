from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from schemas.points import normalize_question_points


class QuizImage(BaseModel):
    """Image reference returned by /admin/assets and used in question media."""

    assetId: str = Field(min_length=1)
    url: str = Field(min_length=1)
    thumbUrl: str = Field(min_length=1)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    alt: str = ""

    model_config = ConfigDict(extra="ignore")


class QuizAssetUploadResponse(QuizImage):
    pass


class AdminQuizSaveResponse(BaseModel):
    id: str = Field(min_length=1)


class AdminQuizListItemResponse(BaseModel):
    id: str = Field(min_length=1)
    title: str = ""
    status: Literal["idle", "running"] = "idle"
    created_at: str = Field(min_length=1)
    last_activated_at: str | None = None
    question_count: int = Field(ge=0)

    model_config = ConfigDict(extra="ignore")


# ---------- Upsert payloads (write side) ----------


class _AdminQuizPayloadBase(BaseModel):
    id: str | None = None
    text: str = Field(min_length=1)
    time_s: int | None = Field(default=None, gt=0)
    points: int = Field(default=1, ge=1)
    image: str | None = None  # KQF @image directive value (URL or relative path)
    hint: str | None = None

    model_config = ConfigDict(extra="ignore")

    @field_validator("points", mode="before")
    @classmethod
    def _validate_points(cls, value: object) -> int:
        return normalize_question_points(value)


class AdminQuizChoicePayload(BaseModel):
    text: str = Field(min_length=1)
    is_correct: bool


class AdminQuizSingleChoicePayload(_AdminQuizPayloadBase):
    type: Literal["singlechoice"]
    choices: list[AdminQuizChoicePayload] = Field(min_length=2, max_length=6)

    @model_validator(mode="after")
    def _validate(self) -> AdminQuizSingleChoicePayload:
        if sum(1 for c in self.choices if c.is_correct) != 1:
            raise ValueError("singlechoice musi mieć dokładnie 1 poprawną odpowiedź")
        return self


class AdminQuizMultiChoicePayload(_AdminQuizPayloadBase):
    type: Literal["multichoice"]
    choices: list[AdminQuizChoicePayload] = Field(min_length=2, max_length=8)

    @model_validator(mode="after")
    def _validate(self) -> AdminQuizMultiChoicePayload:
        if not any(c.is_correct for c in self.choices):
            raise ValueError("multichoice musi mieć co najmniej 1 poprawną odpowiedź")
        return self


class AdminQuizTrueFalsePayload(_AdminQuizPayloadBase):
    type: Literal["truefalse"]
    correct: bool


class AdminQuizSliderPayload(_AdminQuizPayloadBase):
    type: Literal["slider"]
    correct: float
    min: float
    max: float
    step: float = 1
    tolerance: float = 0
    unit: str | None = None

    @model_validator(mode="after")
    def _validate(self) -> AdminQuizSliderPayload:
        if self.min >= self.max:
            raise ValueError("min must be < max")
        if not (self.min <= self.correct <= self.max):
            raise ValueError("correct must be in [min, max]")
        if self.step <= 0:
            raise ValueError("step must be > 0")
        if self.tolerance < 0:
            raise ValueError("tolerance must be >= 0")
        return self


AdminQuizQuestionPayload = Annotated[
    AdminQuizSingleChoicePayload
    | AdminQuizMultiChoicePayload
    | AdminQuizTrueFalsePayload
    | AdminQuizSliderPayload,
    Field(discriminator="type"),
]


class AdminQuizUpsertPayload(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    author: str | None = None
    tags: list[str] = Field(default_factory=list)
    questions: list[AdminQuizQuestionPayload] = Field(min_length=1)

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def _validate_title(self) -> AdminQuizUpsertPayload:
        if not self.title.strip():
            raise ValueError("Tytuł quizu nie może być pusty.")
        return self


# ---------- Read-side detail response ----------


class AdminQuizDetailResponse(BaseModel):
    id: str = Field(min_length=1)
    title: str
    description: str | None = None
    author: str | None = None
    tags: list[str] = Field(default_factory=list)
    status: Literal["idle", "running"] = "idle"
    created_at: str
    updated_at: str
    last_activated_at: str | None = None
    questions: list[AdminQuizQuestionPayload] = Field(min_length=1)

    model_config = ConfigDict(extra="ignore")
