from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def main():
    print("Backend module loaded. Serve `app` with an ASGI server.")


if __name__ == "__main__":
    main()
