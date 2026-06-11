"""Pydantic request/response models for the participant play API."""

from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

Nickname = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=128)
]


class JoinBody(BaseModel):
    nickname: Nickname


class SubmitBody(BaseModel):
    nickname: Nickname
    score: int = Field(ge=0)


class LeaderboardEntryModel(BaseModel):
    position: int
    nickname: str
    score: int


class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntryModel]
