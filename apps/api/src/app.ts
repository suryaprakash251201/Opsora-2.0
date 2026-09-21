import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initAdapters } from "./adapters/index.js";
import { rateLimit, secureHeaders } from "./middleware/security.js";
import activity from "./routes/activity.js";
import alerts from "./routes/alerts.js";
import devices from "./routes/devices.js";
import dns from "./routes/dns.js";
import docker from "./routes/docker.js";
import events from "./routes/events.js";
import github from "./routes/github.js";
import health from "./routes/health.js";
import integrations from "./routes/integrations.js";
import logs from "./routes/logs.js";
import metrics from "./routes/metrics.js";
import network from "./routes/network.js";
import servers from "./routes/servers.js";
import services from "./routes/services.js";
import settings from "./routes/settings.js";
import storage from "./routes/storage.js";

initAdapters();
// NOTE: keep module import side-effect free for tests.
// server.ts runs migrations + seedDefaultServices() on boot.

export function createApp(): Hono {
  const app = new Hono();

  app.use("*", logger());
  app.use("*", secureHeaders());
  app.use("/api/*", rateLimit(600));
  app.use(
    "/api/*",
    cors({
      origin: (origin) => origin || "*",
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.route("/api/health", health);
  app.route("/api/servers", servers);
  app.route("/api/metrics", metrics);
  app.route("/api/docker", docker);
  app.route("/api/services", services);
  app.route("/api/devices", devices);
  app.route("/api/network", network);
  app.route("/api/storage", storage);
  app.route("/api/dns", dns);
  app.route("/api/alerts", alerts);
  app.route("/api/events", events);
  app.route("/api/activity", activity);
  app.route("/api/integrations", integrations);
  app.route("/api/github", github);
  app.route("/api/logs", logs);
  app.route("/api/settings", settings);

  app.get("/api", (c) => c.json({ name: "opsora", version: "0.1.0" }));
  app.notFound((c) => c.json({ error: "not_found" }, 404));

  return app;
}
