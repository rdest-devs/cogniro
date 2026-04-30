"""Admin quiz routes (CRUD, leaderboard, block nickname)."""

from fastapi import APIRouter

from routes.stubs import unimplemented

router = APIRouter(tags=["admin-quiz"])


@router.post("/")
async def admin_root() -> None:
    unimplemented()


@router.post("/quiz")
async def admin_quiz_create() -> None:
    unimplemented()


@router.get("/quiz/all")
async def admin_quiz_list_all() -> None:
    unimplemented()


@router.get("/quiz/{quiz_id}")
async def admin_quiz_get(quiz_id: str) -> None:
    unimplemented()


@router.get("/quiz/{quiz_id}/leaderboard")
async def admin_quiz_leaderboard(quiz_id: str) -> None:
    unimplemented()


@router.patch("/quiz/{quiz_id}/nickname/{nickname}/block")
async def admin_quiz_block_nickname(quiz_id: str, nickname: str) -> None:
    unimplemented()


@router.put("/quiz/{quiz_id}")
async def admin_quiz_update(quiz_id: str) -> None:
    unimplemented()


@router.delete("/quiz/{quiz_id}")
async def admin_quiz_delete(quiz_id: str) -> None:
    unimplemented()
