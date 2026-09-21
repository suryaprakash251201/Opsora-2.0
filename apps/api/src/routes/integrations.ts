import { Hono } from "hono";
import { zValidator, validBody } from "../lib/validator.js";
import { integrationCreateSchema } from "../validation/schemas.js";
import { initAdapters } from "../adapters/index.js";
import { redactSecrets, registry } from "../adapters/types.js";
import { getDb } from "../db/client.js";
import { integrations } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const router = new Hono();

initAdapters();

router.get("/", async (c) => {
  const db = getDb();
  const stored = db.select().from(integrations).all();
  const out = await Promise.all(
    registry.list().map(async (a) => {
      const row = stored.find((s) => s.type === a.type || s.id === a.id);
      let status = row?.status ?? "unknown";
      let error: string | null = row?.lastError ?? null;
      if (!row || row.enabled) {
        try {
          const h = await a.healthCheck();
          status = h.status;
          error = h.error ?? null;
        } catch (e) {
          status = "unavailable";
          error = e instanceof Error ? e.message : "health check failed";
        }
      }
      let config: Record<string, unknown> = {};
      try {
        config = JSON.parse(row?.configJson ?? "{}") as Record<string, unknown>;
      } catch {
        config = {};
      }
      return {
        id: row?.id ?? a.id,
        name: row?.name ?? a.name,
        type: a.type,
        status,
        enabled: row ? Boolean(row.enabled) : true,
        lastSync: row?.lastSync ?? null,
        error,
        capabilities: a.capabilities,
        config: redactSecrets(config),
      };
    }),
  );
  return c.json({ integrations: out, updatedAt: new Date().toISOString() });
});

router.post("/", zValidator("json", integrationCreateSchema), (c) => {
  const body = validBody<{
    name: string;
    type: "docker" | "pihole" | "github" | "linux_agent" | "tailscale" | "s3";
    enabled: boolean;
    config: Record<string, unknown>;
  }>(c);
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  db.insert(integrations)
    .values({
      id,
      name: body.name,
      type: body.type,
      enabled: body.enabled,
      configJson: JSON.stringify(body.config),
      status: "unknown",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return c.json({ id }, 201);
});

router.delete("/:id", (c) => {
  const id = c.req.param("id");
  if (c.req.header("x-confirm") !== "true") {
    return c.json({ error: "confirmation_required" }, 428);
  }
  getDb().delete(integrations).where(eq(integrations.id, id)).run();
  return c.json({ ok: true });
});

export default router;
