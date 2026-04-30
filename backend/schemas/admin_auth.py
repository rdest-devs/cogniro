"""Admin auth request/response models."""

from pydantic import BaseModel, ConfigDict, Field


class AdminLoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    password: str = Field(min_length=1, max_length=512)


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AdminLogoutResponse(BaseModel):
    ok: bool = True
