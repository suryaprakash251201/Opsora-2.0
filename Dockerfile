# syntax=docker/dockerfile:1
# Opsora — single-container image: nginx (static SPA + /api reverse proxy)
# and the Node API run together, coordinated by docker/entrypoint.sh.

# ── Base: Node 22 + pnpm pinned by packageManager ─────────────────────
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# ── Deps: full workspace install (devDeps needed for the build) ───────
FROM base AS deps
# toolchain so better-sqlite3 can compile if no prebuilt binary matches
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
# workspace manifests first → cacheable install layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/utils/package.json packages/utils/package.json
RUN pnpm install --frozen-lockfile

# ── Build: tsc (api) + tsc/vite (web) ─────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm -r build

# ── Pruned production deps for the API only ───────────────────────────
FROM build AS api-deploy
RUN pnpm --filter @opsora/api deploy --prod /out

# ── Runtime: one container, two processes ─────────────────────────────
FROM node:22-slim AS app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4100 \
    DATABASE_URL=/data/opsora.db \
    DOCKER_SOCKET=/var/run/docker.sock
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default
WORKDIR /app
# pruned API deps + package files (node_modules, package.json, …)
COPY --from=api-deploy /out/ ./
COPY --from=build /app/apps/api/dist ./dist
# drizzle/ migrations live at the repo root (migrate.ts resolves cwd/drizzle)
COPY --from=build /app/drizzle ./drizzle
# SPA bundle served by nginx
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /app/entrypoint.sh
# /data is the named-volume mountpoint; chowned so `user: node` also works
RUN chmod +x /app/entrypoint.sh && mkdir -p /data && chown node:node /data
VOLUME ["/data"]
EXPOSE 80 4100
# healthcheck goes through nginx → fails if either process is broken
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Runs as root so the (root:docker 0660) host Docker socket is usable when
# mounted. If you don't mount the socket, add:  USER node
ENTRYPOINT ["/app/entrypoint.sh"]
