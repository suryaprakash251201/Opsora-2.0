import { Hono } from "hono";
import { getGithubSummary } from "../adapters/github.js";

const router = new Hono();

router.get("/repos", async (c) => {
  // ?refresh=1 bypasses the 90s server-side cache (manual refresh button).
  return c.json(await getGithubSummary(c.req.query("refresh") === "1"));
});

export default router;
