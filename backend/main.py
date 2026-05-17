from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routes.admin_auth import router as admin_auth_router  # noqa: E402
from routes.admin_quiz import router as admin_quiz_router  # noqa: E402
from routes.media import router as media_router  # noqa: E402
from routes.nick import router as nick_router  # noqa: E402
from routes.user import router as user_router  # noqa: E402
from security.admin_auth import reload_admin_auth_config  # noqa: E402
from services.storage import initialize_storage  # noqa: E402

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

app.include_router(user_router, prefix="/quiz")
app.include_router(admin_quiz_router, prefix="/admin")
app.include_router(admin_auth_router, prefix="/admin")
app.include_router(nick_router)
app.include_router(media_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def main() -> None:
    print("Backend module loaded. Serve `app` with an ASGI server.")


if __name__ == "__main__":
    main()
