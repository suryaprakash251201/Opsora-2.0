# Opsora — home-lab infrastructure dashboard and control center

Fast, dark-first, honest infrastructure visibility: servers, Docker, services,
network, devices, DNS, storage, alerts, logs, events, and integrations.

## Quickstart

```bash
cp .env.example .env
pnpm setup      # install + migrate SQLite
pnpm dev        # web :5173 + api :4100
```

## Docker

Single container — nginx serves the built SPA and proxies `/api` to the Node
API running alongside it (started by `docker/entrypoint.sh`):

```bash
docker compose up -d --build   # dashboard http://localhost:8080 · api :4100
```

- SQLite persists in the `opsora-data` volume at `/data/opsora.db`; migrations run on boot
- The host Docker socket is mounted read-only so the Docker page shows real
  containers — remove that line from `docker-compose.yml` if you don't want it
  (the UI then shows `Not Connected`)
- Ports are overridable when the dev servers are running:
  `OPSORA_API_PORT=4101 OPSORA_WEB_PORT=8081 docker compose up -d`

## Workspace

```text
apps/web        React 19 + Vite 8 + Router 8 + TanStack Query + Zustand + ECharts
apps/api        Hono + Drizzle + SQLite + SSE
packages/types  Shared domain models (Zod)
packages/utils  Formatting + freshness helpers
packages/config Query policy + navigation
drizzle/        SQLite migrations
scripts/        Linux agent example
```

## Data honesty

Opsora never fabricates infrastructure data. Unavailable integrations render
`Not Connected` / `Unavailable` / `Unknown` / `Stale` — never plausible-looking
fake metrics.

## Verify

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm --filter @opsora/web test:e2e   # needs dev servers running
```
