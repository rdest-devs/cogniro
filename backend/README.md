# Cogniro Backend

FastAPI backend for the Cogniro project.

## Prerequisites

- Python 3.14+
- [uv](https://docs.astral.sh/uv/)

## Setup

```bash
uv sync
```

## Development

```bash
uv run uvicorn main:app --reload
```

API docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Linting & formatting

```bash
uv run ruff check .
uv run ruff format .
```
