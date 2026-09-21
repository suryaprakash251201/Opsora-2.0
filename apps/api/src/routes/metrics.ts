import { Hono } from "hono";
import { getHistory, latestPoint, sampleAndStore } from "../services/metrics.js";

const metrics = new Hono();

metrics.get("/current", async (c) => {
  const point = await sampleAndStore();
  return c.json({ ...point, updatedAt: point.t });
});

metrics.get("/history", (c) => {
  const range = c.req.query("range") ?? "1h";
  const allowed = ["15m", "1h", "6h", "24h"];
  const r = allowed.includes(range) ? range : "1h";
  return c.json({ range: r, points: getHistory(r), cached: latestPoint() !== null });
});

export default metrics;
