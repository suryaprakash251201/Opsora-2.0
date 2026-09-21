import { Hono } from "hono";

const router = new Hono();

// Honest placeholder: log aggregation ships incrementally; never fake entries.
router.get("/", (c) => {
  const source = c.req.query("source") ?? undefined;
  const level = c.req.query("level") ?? undefined;
  void source;
  void level;
  return c.json({
    logs: [],
    status: "not_connected",
    message: "Log aggregation is not configured. Connect a log source to stream entries here.",
    updatedAt: new Date().toISOString(),
  });
});

export default router;
