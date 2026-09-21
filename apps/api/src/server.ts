import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { bus } from "./realtime/bus.js";
import { sampleAndStore } from "./services/metrics.js";
import { runServiceChecks, seedDefaultServices } from "./services/serviceChecker.js";
import { applyMigrations } from "./db/migrate.js";

const PORT = Number(process.env.PORT ?? 4100);

try {
  applyMigrations();
} catch (err) {
  console.error("[opsora] migration failed:", err);
}
seedDefaultServices();

const app = createApp();

bus.publish({
  category: "system",
  resource: "opsora-api",
  message: "Opsora API started",
  severity: "info",
});

// Samplers: metrics frequent, service checks moderate ( §45-46 ).
async function metricsLoop(): Promise<void> {
  try {
    await sampleAndStore();
  } catch (err) {
    console.error("[opsora] metrics sample failed", err);
  } finally {
    setTimeout(metricsLoop, 5_000).unref?.();
  }
}

async function serviceLoop(): Promise<void> {
  try {
    await runServiceChecks();
  } catch (err) {
    console.error("[opsora] service check failed", err);
  } finally {
    setTimeout(serviceLoop, 30_000).unref?.();
  }
}

void metricsLoop();
void serviceLoop();

serve({ fetch: app.fetch, port: PORT, hostname: process.env.HOST ?? "0.0.0.0" }, (info) => {
  console.log(`[opsora] api listening on http://${info.address}:${info.port}`);
});
