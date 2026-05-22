from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import timedelta

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from core.settings import PURGE_INTERVAL_SECONDS, RESULT_RETENTION_DAYS  # noqa: E402
from legacy.quiz_demo_router import router as legacy_quiz_demo_router  # noqa: E402
from routes.admin_auth import router as admin_auth_router  # noqa: E402
from routes.admin_quiz import router as admin_quiz_router  # noqa: E402
from routes.admin_results import router as admin_results_router  # noqa: E402
from routes.media import router as media_router  # noqa: E402
from routes.play import router as play_router  # noqa: E402
from security.admin_auth import reload_admin_auth_config  # noqa: E402
from services.media_assets import purge_stale_editor_staging  # noqa: E402
from services.results import purge_results_older_than  # noqa: E402
from services.storage import initialize_storage  # noqa: E402

logger = logging.getLogger("cogniro.purge")

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

    async def _purge_loop() -> None:
        retention = timedelta(days=RESULT_RETENTION_DAYS)
        try:
            await asyncio.to_thread(
                purge_results_older_than,
                application.state.storage,
                retention,
            )
        except Exception:
            logger.exception("initial results purge failed")
        try:
            removed = await asyncio.to_thread(purge_stale_editor_staging, application)
            if removed:
                logger.info(
                    "initial editor staging purge removed %d asset directories",
                    removed,
                )
        except Exception:
            logger.exception("initial editor staging purge failed")
        while True:
            await asyncio.sleep(PURGE_INTERVAL_SECONDS)
            try:
                await asyncio.to_thread(
                    purge_results_older_than,
                    application.state.storage,
                    retention,
                )
            except Exception:
                logger.exception("results purge iteration failed")
            try:
                removed = await asyncio.to_thread(
                    purge_stale_editor_staging, application
                )
                if removed:
                    logger.info(
                        "editor staging purge removed %d asset directories",
                        removed,
                    )
            except Exception:
                logger.exception("editor staging purge iteration failed")

    task = asyncio.create_task(_purge_loop())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allow_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_quiz_router, prefix="/admin")
app.include_router(admin_auth_router, prefix="/admin")
app.include_router(admin_results_router)
app.include_router(play_router)
app.include_router(media_router)
app.include_router(legacy_quiz_demo_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def main() -> None:
    print("Backend module loaded. Serve `app` with an ASGI server.")


if __name__ == "__main__":
    main()
