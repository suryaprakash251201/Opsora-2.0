import { Hono } from "hono";
import type { HealthLevel } from "@opsora/types";
import { getDb } from "../db/client.js";
import { getDockerSummary } from "../adapters/docker.js";
import { getDnsSummary } from "../adapters/pihole.js";
import { getGithubSummary } from "../adapters/github.js";
import { getTailscaleDevices } from "../adapters/tailscale.js";
import { getS3Summary } from "../adapters/s3.js";
import { getNetworkSummary } from "../services/network.js";
import { listServicesSync } from "../services/serviceChecker.js";
import { evaluateHostThresholds, overallHealth } from "../services/alerts.js";
import { sampleHost } from "../services/metrics.js";

const health = new Hono();

// Liveness — also used by Opsora self-monitoring ( §42 ).
health.get("/", async (c) => {
  let dbOk = true;
  try {
    getDb().run("SELECT 1");
  } catch {
    dbOk = false;
  }
  return c.json({
    status: dbOk ? "ok" : "degraded",
    version: "0.1.0",
    time: new Date().toISOString(),
    checks: { database: dbOk ? "ok" : "error" },
  });
});

// Aggregated overview for the Home dashboard ( §§18-19, 53 ).
health.get("/overview", async (c) => {
  const host = await sampleHost();
  const [docker, dns, network, tailscale, s3, github] = await Promise.all([
    getDockerSummary(),
    getDnsSummary(),
    getNetworkSummary(),
    getTailscaleDevices(),
    getS3Summary(),
    getGithubSummary(),
  ]);
  const services = listServicesSync();

  const hostLevels = evaluateHostThresholds({
    cpuPercent: host.cpuPercent,
    memPercent: host.memPercent,
    diskPercent: host.diskPercent,
    hostname: host.hostname,
  });
  const serviceLevels: HealthLevel[] = services.map((s) =>
    s.status === "up" ? "healthy" : s.status === "unknown" ? "unknown" : "critical",
  );
  const dockerLevels = docker.containers.map(() => "healthy" as const);
  const agg = overallHealth([...hostLevels, ...serviceLevels, ...dockerLevels]);

  return c.json({
    health: { ...agg },
    host: {
      hostname: host.hostname,
      cpu: host.cpuPercent,
      mem: host.memPercent,
      disk: host.diskPercent,
      uptimeSeconds: host.uptimeSeconds,
      tempCelsius: host.tempCelsius,
    },
    counts: {
      dockerRunning: docker.running,
      dockerStopped: docker.stopped,
      servicesUp: services.filter((s) => s.status === "up").length,
      servicesTotal: services.length,
      devicesOnline: tailscale.devices.filter((d) => d.online).length,
    },
    integrations: {
      docker: docker.status,
      dns: dns.status,
      network: network.status,
      tailscale: tailscale.status,
      s3: s3.status,
      github: github.status,
    },
    updatedAt: new Date().toISOString(),
  });
});

export default health;
