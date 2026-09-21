# Opsora — home-lab infrastructure dashboard and control center

Fast, dark-first, honest infrastructure visibility: servers, Docker, services,
network, devices, DNS, storage, alerts, logs, events, and integrations.

## Quickstart

```bash
cp .env.example .env
pnpm setup      # install + migrate SQLite
pnpm dev        # web :5173 + api :4100
```

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
