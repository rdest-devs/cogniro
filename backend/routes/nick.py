"""Nickname validation."""

from fastapi import APIRouter, HTTPException

from schemas.nick import ValidateNickRequest, ValidateNickResponse

router = APIRouter(tags=["nick"])


def validate(nick: str) -> bool:
    """Return True if nick is allowed. Stub: always accepts."""
    return True


@router.post("/validate-nick", response_model=ValidateNickResponse)
async def validate_nick(body: ValidateNickRequest) -> ValidateNickResponse:
    if validate(body.nick):
        return ValidateNickResponse(valid=True)
    raise HTTPException(status_code=403, detail="invalid_nickname")
