import { Hono } from "hono";
import { getGithubSummary } from "../adapters/github.js";

const router = new Hono();

router.get("/repos", async (c) => {
  return c.json(await getGithubSummary());
});

export default router;
