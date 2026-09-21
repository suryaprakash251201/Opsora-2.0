import { Hono } from "hono";
import { getS3Summary } from "../adapters/s3.js";
import { getLocalStorage } from "../services/storage.js";

const router = new Hono();

router.get("/", async (c) => {
  const [local, s3] = await Promise.all([getLocalStorage(), getS3Summary()]);
  return c.json({
    local,
    s3Buckets: s3.buckets,
    s3Status: s3.status,
    s3Error: s3.error,
    updatedAt: new Date().toISOString(),
  });
});

export default router;
