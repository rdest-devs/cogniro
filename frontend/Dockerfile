# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --filter @cogniro/frontend...

FROM deps AS dev
COPY frontend ./frontend
WORKDIR /app/frontend
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM deps AS build
COPY frontend ./frontend
WORKDIR /app/frontend
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /app/frontend/out ./out
EXPOSE 3000
CMD ["serve", "-s", "out", "-l", "3000"]
