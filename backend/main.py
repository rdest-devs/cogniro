from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from admin_quiz_service import create_quiz, get_quiz, list_quizzes, update_quiz
from media_asset_service import serve_asset, upload_asset
from models import (
    AdminQuizUpsertPayload,
    QuizAssetUploadResponse,
    QuizResultsRequest,
    QuizResultsResponse,
)
from quiz_results_service import calculate_quiz_results
from settings import MEDIA_PUBLIC_PREFIX
from storage_service import initialize_storage


# ---------------------------------------------------------------------------
# Admin authentication placeholder
# TODO: Replace with a proper auth system (e.g. OAuth2, session-based, etc.)
# For now, set COGNIRO_ADMIN_TOKEN env var to a secret value.
# If the env var is not set, admin endpoints are left OPEN (dev mode).
# ---------------------------------------------------------------------------
_ADMIN_TOKEN: str | None = os.getenv("COGNIRO_ADMIN_TOKEN")
_bearer_scheme = HTTPBearer(auto_error=False)


async def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> None:
    if _ADMIN_TOKEN is None:
        # No token configured — skip auth (dev mode).
        return
    if credentials is None or credentials.credentials != _ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Brak autoryzacji.")


@asynccontextmanager
async def lifespan(application: FastAPI):
    application.state.storage = initialize_storage()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
