from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Literal, Optional

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


class AdminQuizImportResponse(BaseModel):
    """Import result. ``skipped`` lists archive members dropped because they
    exceeded the per-file size cap; the editor renders broken-media placeholders
    so the user can re-upload them."""

    id: str = Field(min_length=1)
    skipped: list[str] = Field(default_factory=list)


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
    text: str = ""
    is_correct: bool
    image: str | None = None

    @model_validator(mode="after")
    def _validate_text_or_image(self) -> "AdminQuizChoicePayload":
        if not self.text.strip() and not (self.image and self.image.strip()):
            raise ValueError("choice must have text or image")
        return self


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


class AdminQuizImagePixelatePayload(_AdminQuizPayloadBase):
    type: Literal["imagepixelate"]
    choices: list[AdminQuizChoicePayload] = Field(min_length=2, max_length=6)

    @model_validator(mode="after")
    def _validate(self) -> AdminQuizImagePixelatePayload:
        if sum(1 for c in self.choices if c.is_correct) != 1:
            raise ValueError("imagepixelate musi mieć dokładnie 1 poprawną odpowiedź")
        if not (self.image and self.image.strip()):
            raise ValueError("imagepixelate wymaga obrazu")
        return self


class AdminQuizTrueFalsePayload(_AdminQuizPayloadBase):
    type: Literal["truefalse"]
    correct: bool


class AdminQuizSliderPayload(_AdminQuizPayloadBase):
    type: Literal["slider"]
    correct: float | None = None
    min: float
    max: float
    step: float = 1
    tolerance: float = 0
    unit: str | None = None
    score: Literal["range", "scale"] = "range"
    label_min: str | None = None
    label_max: str | None = None

    @model_validator(mode="after")
    def _validate(self) -> AdminQuizSliderPayload:
        if self.min >= self.max:
            raise ValueError("min must be < max")
        if self.step <= 0:
            raise ValueError("step must be > 0")
        if self.tolerance < 0:
            raise ValueError("tolerance must be >= 0")
        if self.score == "range":
            if self.correct is None:
                raise ValueError("correct is required for score=range")
            if not (self.min <= self.correct <= self.max):
                raise ValueError("correct must be in [min, max]")
        return self


class AdminQuizOrderingPayload(_AdminQuizPayloadBase):
    type: Literal["ordering"]
    items: list[str] = Field(min_length=2, max_length=8)
    correct_order: list[int] = Field(min_length=2)

    @model_validator(mode="after")
    def _validate(self) -> AdminQuizOrderingPayload:
        n = len(self.items)
        if len(self.correct_order) != n:
            raise ValueError(f"correct_order must have exactly {n} indices")
        if sorted(self.correct_order) != list(range(n)):
            raise ValueError("correct_order must be a permutation of 0..n-1")
        return self


AdminQuizQuestionPayload = Annotated[
    AdminQuizSingleChoicePayload
    | AdminQuizMultiChoicePayload
    | AdminQuizTrueFalsePayload
    | AdminQuizSliderPayload
    | AdminQuizOrderingPayload
    | AdminQuizImagePixelatePayload,
    Field(discriminator="type"),
]


class AdminQuizUpsertPayload(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    author: str | None = None
    tags: list[str] = Field(default_factory=list)
    show_answer_review: bool = True
    time_limit: int | None = Field(default=None, gt=0)
    shuffle_questions: bool = False
    shuffle_mode: Literal["per_player", "session"] = "per_player"
    questions: list[AdminQuizQuestionPayload] = Field(min_length=1)

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def _validate_title(self) -> AdminQuizUpsertPayload:
        if not self.title.strip():
            raise ValueError("Tytuł quizu nie może być pusty.")
        return self

    @model_validator(mode="after")
    def _validate_unique_question_ids(self) -> AdminQuizUpsertPayload:
        explicit_ids = [q.id.strip() for q in self.questions if q.id and q.id.strip()]
        if len(explicit_ids) != len(set(explicit_ids)):
            raise ValueError("Pytania muszą mieć unikalne identyfikatory.")
        return self


# ---------- Read-side detail response ----------


class AdminQuizDetailResponse(BaseModel):
    id: str = Field(min_length=1)
    title: str
    description: str | None = None
    author: str | None = None
    tags: list[str] = Field(default_factory=list)
    show_answer_review: bool = True
    time_limit: int | None = Field(default=None, gt=0)
    shuffle_questions: bool = False
    shuffle_mode: Literal["per_player", "session"] = "per_player"
    status: Literal["idle", "running"] = "idle"
    created_at: str
    updated_at: str
    last_activated_at: str | None = None
    schedule_start: str | None = None
    schedule_end: str | None = None
    manual_status: Optional[Literal["open", "closed"]] = None
    questions: list[AdminQuizQuestionPayload] = Field(min_length=1)

    model_config = ConfigDict(extra="ignore")


# ---------- Availability ----------


def _normalize_utc_datetime(v: str | None) -> str | None:
    if v is None:
        return None
    try:
        dt = datetime.fromisoformat(v)
    except ValueError:
        raise ValueError(
            "Nieprawidłowy format daty — oczekiwany ISO 8601 (np. 2025-06-01T14:00:00Z)."
        )
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")


class AvailabilityPatchRequest(BaseModel):
    schedule_start: str | None = None
    schedule_end: str | None = None
    manual_status: Optional[Literal["open", "closed"]] = None

    model_config = ConfigDict(extra="ignore")

    @field_validator("schedule_start", "schedule_end", mode="before")
    @classmethod
    def validate_datetime(cls, v: object) -> str | None:
        if v is None or isinstance(v, str):
            return _normalize_utc_datetime(v)
        raise ValueError("Nieprawidłowy format daty.")


class ActivateRequest(BaseModel):
    schedule_start: str | None = None
    schedule_end: str | None = None
    manual_status: Optional[Literal["open", "closed"]] = None

    model_config = ConfigDict(extra="ignore")

    @field_validator("schedule_start", "schedule_end", mode="before")
    @classmethod
    def validate_datetime(cls, v: object) -> str | None:
        if v is None or isinstance(v, str):
            return _normalize_utc_datetime(v)
        raise ValueError("Nieprawidłowy format daty.")
