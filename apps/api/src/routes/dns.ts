import { Hono } from "hono";
import { getDnsSummary } from "../adapters/pihole.js";

const router = new Hono();

router.get("/", async (c) => {
  return c.json(await getDnsSummary());
});

export default router;
