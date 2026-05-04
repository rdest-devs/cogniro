from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from admin_quiz_service import create_quiz, get_quiz, list_quizzes, update_quiz
from media_asset_service import serve_asset, upload_asset
from models import (
    AdminQuizUpsertPayload,
    QuizAssetUploadResponse,
    QuizResultsRequest,
    QuizResultsResponse,
)
from routes.admin_auth import router as admin_auth_router
from routes.nick import router as nick_router
from security.admin_auth import reload_admin_auth_config, require_admin
from quiz_results_service import calculate_quiz_results
from settings import MEDIA_PUBLIC_PREFIX
from storage_service import initialize_storage

load_dotenv()

_DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def _cors_allow_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS")
    if raw is None or not raw.strip():
        return list(_DEFAULT_CORS_ORIGINS)
    return [part.strip() for part in raw.split(",") if part.strip()]


@asynccontextmanager
async def lifespan(application: FastAPI):
    application.state.storage = initialize_storage()
    reload_admin_auth_config()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allow_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_auth_router, prefix="/admin")
app.include_router(nick_router)

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get(f"{MEDIA_PUBLIC_PREFIX}/{{asset_path:path}}")
async def serve_quiz_asset(asset_path: str) -> FileResponse:
    return serve_asset(app, asset_path)


@app.get("/admin/quiz/all", dependencies=[Depends(require_admin)])
async def get_admin_quizzes() -> list[dict]:
    return list_quizzes(app)


@app.get("/admin/quiz/{quiz_id}", dependencies=[Depends(require_admin)])
async def get_admin_quiz(quiz_id: str) -> dict:
    return get_quiz(app, quiz_id)


@app.post("/admin/quiz", dependencies=[Depends(require_admin)])
async def create_admin_quiz(payload: AdminQuizUpsertPayload) -> dict[str, str]:
    return create_quiz(app, payload)


@app.put("/admin/quiz/{quiz_id}", dependencies=[Depends(require_admin)])
async def update_admin_quiz(
    quiz_id: str, payload: AdminQuizUpsertPayload
) -> dict[str, str]:
    return update_quiz(app, quiz_id, payload)


@app.post(
    "/admin/assets",
    response_model=QuizAssetUploadResponse,
    dependencies=[Depends(require_admin)],
)
async def upload_admin_asset(
    file: UploadFile = File(...),
) -> QuizAssetUploadResponse:
    return await upload_asset(app, file)


@app.post("/quiz/results", response_model=QuizResultsResponse)
async def quiz_results(payload: QuizResultsRequest) -> QuizResultsResponse:
    return calculate_quiz_results(payload)


def main() -> None:
    print("Backend module loaded. Serve `app` with an ASGI server.")


if __name__ == "__main__":
    main()
