import { Hono } from "hono";
import { bus } from "../realtime/bus.js";

const router = new Hono();

router.get("/", (c) => {
  return c.json({ activity: bus.recent(100), updatedAt: new Date().toISOString() });
});

export default router;
