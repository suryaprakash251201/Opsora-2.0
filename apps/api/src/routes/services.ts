import { Hono } from "hono";
import { zValidator, validBody } from "../lib/validator.js";
import { serviceCreateSchema } from "../validation/schemas.js";
import { getDb } from "../db/client.js";
import { services } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { listServicesSync, runServiceChecks } from "../services/serviceChecker.js";

const router = new Hono();

router.get("/", (c) => {
  return c.json({ services: listServicesSync(), updatedAt: new Date().toISOString() });
});

router.post("/check", async (c) => {
  const out = await runServiceChecks();
  return c.json({ services: out, updatedAt: new Date().toISOString() });
});

router.post("/", zValidator("json", serviceCreateSchema), (c) => {
  const body = validBody<{
    name: string;
    url: string | null;
    expectedStatus: number;
    checkIntervalMs: number;
    enabled: boolean;
  }>(c);
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  db.insert(services)
    .values({
      id,
      name: body.name,
      url: body.url,
      expectedStatus: body.expectedStatus,
      checkIntervalMs: body.checkIntervalMs,
      enabled: body.enabled,
      lastStatus: "unknown",
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
  getDb().delete(services).where(eq(services.id, id)).run();
  return c.json({ ok: true });
});

export default router;
