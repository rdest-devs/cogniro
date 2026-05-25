# Cogniro Backend

FastAPI backend for the Cogniro project.

## Prerequisites

- Python 3.14+
- [uv](https://docs.astral.sh/uv/)

## Setup

```bash
uv sync
```

## Running

```bash
uv run uvicorn main:app --reload
```

To accept connections from other devices on the LAN (e.g. phone scanning a QR code):

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Linting & formatting

```bash
uv run ruff check .
uv run ruff format .
```

## Tests

```bash
uv run pytest
```

## Quiz settings

- `QUIZ_SHOW_ANSWER_REVIEW` (default: `true`) — controls whether correct/incorrect answer review is returned after quiz completion.
