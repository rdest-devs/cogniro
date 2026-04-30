from pydantic import BaseModel, Field


class ValidateNickRequest(BaseModel):
    nick: str = Field(min_length=1, max_length=128)


class ValidateNickResponse(BaseModel):
    valid: bool
