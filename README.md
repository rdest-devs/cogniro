# Cogniro

Monorepo for the Cogniro project.

## Structure

```text
cogniro/
├── frontend/   # Next.js web application
├── backend/    # Python (FastAPI) backend
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) 10+
- [Python](https://www.python.org/) (>=3.14)
- [uv](https://docs.astral.sh/uv/) (for backend)

## Getting started

Install all dependencies (root + frontend) from the project root:

```bash
pnpm install
```

### Frontend

```bash
pnpm -C frontend dev
```

See [frontend/README.md](frontend/README.md) for details.

### Backend

```bash
cd backend
uv sync
```

## Git hooks

Managed by [Husky](https://typicode.github.io/husky/):

- **pre-commit** - lint-staged (frontend eslint/prettier + type-check; backend ruff)
- **commit-msg** - [commitlint](https://commitlint.js.org/) (conventional commits)
- **pre-push** - full validation of both projects
