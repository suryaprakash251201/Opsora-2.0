import { Hono } from "hono";
import { zValidator, validBody } from "../lib/validator.js";
import { settingsUpdateSchema } from "../validation/schemas.js";
import { getDb } from "../db/client.js";
import { settings } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = new Hono();

const DEFAULTS = {
  theme: "dark",
  timezone: "local",
  refreshIntervalMs: 5000,
  cpuWarn: 80,
  cpuCrit: 95,
  memWarn: 85,
  memCrit: 95,
  diskWarn: 80,
  diskCrit: 90,
};

router.get("/", (c) => {
  const db = getDb();
  const rows = db.select().from(settings).all();
  const out: Record<string, unknown> = { ...DEFAULTS };
  for (const r of rows) {
    try {
      out[r.key] = JSON.parse(r.valueJson) as unknown;
    } catch {
      /* keep default */
    }
  }
  return c.json({ settings: out, updatedAt: new Date().toISOString() });
});

router.patch("/", zValidator("json", settingsUpdateSchema), (c) => {
  const body = validBody<Record<string, string | number>>(c);
  const db = getDb();
  const now = new Date().toISOString();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue;
    const existing = db.select().from(settings).where(eq(settings.key, k)).get();
    if (existing) {
      db.update(settings)
        .set({ valueJson: JSON.stringify(v), updatedAt: now })
        .where(eq(settings.key, k))
        .run();
    } else {
      db.insert(settings)
        .values({ key: k, valueJson: JSON.stringify(v), updatedAt: now })
        .run();
    }
  }
  return c.json({ ok: true });
});

export default router;
