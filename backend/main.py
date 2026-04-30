import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.admin_auth import router as admin_auth_router
from routes.admin_quiz import router as admin_quiz_router
from routes.nick import router as nick_router
from routes.user import router as user_router

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


app = FastAPI()

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


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def main():
    print("Backend module loaded. Serve `app` with an ASGI server.")


if __name__ == "__main__":
    main()
