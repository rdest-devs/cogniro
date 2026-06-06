"""Admin auth request/response models."""

from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=512)


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AdminLogoutResponse(BaseModel):
    ok: bool = True


class AdminChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=512)
    new_password: str = Field(min_length=8, max_length=512)
    confirm_password: str = Field(min_length=1, max_length=512)


class AdminChangePasswordResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    ok: bool = True
