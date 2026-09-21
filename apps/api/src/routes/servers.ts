import { Hono } from "hono";
import { zValidator, validBody } from "../lib/validator.js";
import { agentReportSchema } from "../validation/schemas.js";
import { getDb } from "../db/client.js";
import { hosts } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { sampleHost } from "../services/metrics.js";
import { bus } from "../realtime/bus.js";
import { randomUUID } from "node:crypto";

const servers = new Hono();

// Local host + registered agent hosts.
servers.get("/", async (c) => {
  const local = await sampleHost();
  const db = getDb();
  const rows = db.select().from(hosts).all();
  const agents = rows.map((r) => {
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(r.metaJson) as Record<string, unknown>;
    } catch {
      meta = {};
    }
    const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
    return {
      id: r.id,
      hostname: r.hostname,
      ip: r.ip,
      os: r.os,
      kernel: typeof meta.kernel === "string" ? meta.kernel : null,
      online: Date.now() - new Date(r.lastSeen).getTime() < 90_000,
      uptimeSeconds: num(meta.uptimeSeconds),
      cpuPercent: num(meta.cpuPercent),
      memPercent: num(meta.memPercent),
      memUsedBytes: num(meta.memUsedBytes),
      memTotalBytes: num(meta.memTotalBytes),
      diskPercent: num(meta.diskPercent),
      diskUsedBytes: num(meta.diskUsedBytes),
      diskTotalBytes: num(meta.diskTotalBytes),
      loadAverage: Array.isArray(meta.loadAverage)
        ? (meta.loadAverage as [number, number, number])
        : null,
      tempCelsius: num(meta.tempCelsius),
      lastSeen: r.lastSeen,
      source: "agent" as const,
    };
  });
  return c.json({ servers: [local, ...agents], updatedAt: new Date().toISOString() });
});

servers.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (id === "local") return c.json(await sampleHost());
  const db = getDb();
  const row = db.select().from(hosts).where(eq(hosts.id, id)).get();
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json(row);
});

// Authenticated agent ingest ( §14 ). Token via header, never in URL.
servers.post("/report", zValidator("json", agentReportSchema), async (c) => {
  const token = c.req.header("x-agent-token") ?? "";
  if (!process.env.AGENT_INGEST_TOKEN || token !== process.env.AGENT_INGEST_TOKEN) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const body = validBody<{
    hostname: string;
    os: string | null;
    kernel: string | null;
    ip: string | null;
    cpuPercent: number | null;
    memPercent: number | null;
    memUsedBytes: number | null;
    memTotalBytes: number | null;
    diskPercent: number | null;
    diskUsedBytes: number | null;
    diskTotalBytes: number | null;
    loadAverage: [number, number, number] | null;
    tempCelsius: number | null;
    uptimeSeconds: number | null;
  }>(c);
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db
    .select()
    .from(hosts)
    .all()
    .find((h) => h.hostname === body.hostname);
  const metaJson = JSON.stringify({
    kernel: body.kernel,
    cpuPercent: body.cpuPercent,
    memPercent: body.memPercent,
    memUsedBytes: body.memUsedBytes,
    memTotalBytes: body.memTotalBytes,
    diskPercent: body.diskPercent,
    diskUsedBytes: body.diskUsedBytes,
    diskTotalBytes: body.diskTotalBytes,
    loadAverage: body.loadAverage,
    tempCelsius: body.tempCelsius,
    uptimeSeconds: body.uptimeSeconds,
  });
  if (existing) {
    db.update(hosts)
      .set({ ip: body.ip, os: body.os, lastSeen: now, metaJson })
      .where(eq(hosts.id, existing.id))
      .run();
  } else {
    const id = randomUUID();
    db.insert(hosts)
      .values({
        id,
        hostname: body.hostname,
        ip: body.ip,
        os: body.os,
        source: "agent",
        lastSeen: now,
        metaJson,
      })
      .run();
    bus.publish({
      category: "server",
      resource: body.hostname,
      message: `Agent ${body.hostname} checked in`,
      severity: "info",
    });
  }
  return c.json({ ok: true });
});

export default servers;
