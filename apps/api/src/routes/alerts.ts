import { Hono } from "hono";
import { zValidator, validBody } from "../lib/validator.js";
import { alertActionSchema } from "../validation/schemas.js";
import { listAlerts, setAlertStatus, setBulkAlertStatus } from "../services/alerts.js";

const router = new Hono();

router.get("/", (c) => {
  const status = c.req.query("status") ?? undefined;
  const severity = c.req.query("severity") ?? undefined;
  let alerts = listAlerts(status);
  if (severity) alerts = alerts.filter((a) => a.severity === severity);
  const counts = {
    active: alerts.filter((a) => a.status === "active").length,
    critical: alerts.filter((a) => a.severity === "critical" && a.status === "active").length,
  };
  return c.json({ alerts, counts, updatedAt: new Date().toISOString() });
});

router.post("/bulk", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    action: "acknowledge" | "resolve" | "mute";
    ids?: string[];
  } | null;
  if (!body || !["acknowledge", "resolve", "mute"].includes(body.action)) {
    return c.json({ error: "invalid_action" }, 400);
  }
  const next =
    body.action === "acknowledge" ? "acknowledged" : body.action === "resolve" ? "resolved" : "muted";
  const updated = setBulkAlertStatus(body.ids, next);
  return c.json({ ok: true, updated, status: next });
});

router.post("/:id", zValidator("json", alertActionSchema), (c) => {
  const id = c.req.param("id");
  const { action } = validBody<{ action: "acknowledge" | "resolve" | "mute" }>(c);
  const next =
    action === "acknowledge" ? "acknowledged" : action === "resolve" ? "resolved" : "muted";
  const ok = setAlertStatus(id, next);
  if (!ok) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true, id, status: next });
});

export default router;
