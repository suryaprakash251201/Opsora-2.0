import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { services } from "../db/schema.js";
import { bus } from "../realtime/bus.js";
import type { Service } from "@opsora/types";
import { randomUUID } from "node:crypto";

async function checkOne(
  id: string,
  name: string,
  url: string | null,
  expectedStatus: number,
): Promise<{
  status: Service["status"];
  http: number | null;
  ms: number | null;
  error: string | null;
}> {
  if (!url) return { status: "unknown", http: null, ms: null, error: "no URL configured" };
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    // Drain body so timing is honest but bounded.
    await res.arrayBuffer().catch(() => null);
    const ms = Date.now() - started;
    if (res.status === expectedStatus) return { status: "up", http: res.status, ms, error: null };
    if (res.status >= 500)
      return { status: "down", http: res.status, ms, error: `http ${res.status}` };
    return {
      status: "degraded",
      http: res.status,
      ms,
      error: `expected ${expectedStatus}, got ${res.status}`,
    };
  } catch (err) {
    return {
      status: "down",
      http: null,
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : "check failed",
    };
  }
}

/** Run one health-check pass over enabled services and persist results. */
export async function runServiceChecks(): Promise<Service[]> {
  const db = getDb();
  const rows = db.select().from(services).all();
  const out: Service[] = [];
  for (const row of rows) {
    if (!row.enabled) {
      out.push({
        id: row.id,
        name: row.name,
        url: row.url,
        status: "unknown",
        httpStatus: row.lastHttpStatus,
        responseTimeMs: row.lastLatencyMs,
        uptimePercent: null,
        lastCheck: row.lastCheck,
        error: "checks disabled",
      });
      continue;
    }
    const prev = row.lastStatus;
    const r = await checkOne(row.id, row.name, row.url, row.expectedStatus);
    const now = new Date().toISOString();
    db.update(services)
      .set({
        lastStatus: r.status,
        lastHttpStatus: r.http,
        lastLatencyMs: r.ms,
        lastCheck: now,
        lastError: r.error,
        updatedAt: now,
      })
      .where(eq(services.id, row.id))
      .run();
    if (prev !== r.status && (r.status === "down" || prev === "down")) {
      bus.publish({
        category: "service",
        resource: row.name,
        message:
          r.status === "down"
            ? `Service ${row.name} is unreachable`
            : `Service ${row.name} recovered`,
        severity: r.status === "down" ? "critical" : "info",
      });
    }
    out.push({
      id: row.id,
      name: row.name,
      url: row.url,
      status: r.status,
      httpStatus: r.http,
      responseTimeMs: r.ms,
      uptimePercent: null,
      lastCheck: now,
      error: r.error,
    });
  }
  return out;
}

export function listServicesSync(): Service[] {
  const db = getDb();
  return db
    .select()
    .from(services)
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      status: (row.lastStatus as Service["status"]) ?? "unknown",
      httpStatus: row.lastHttpStatus,
      responseTimeMs: row.lastLatencyMs,
      uptimePercent: null,
      lastCheck: row.lastCheck,
      error: row.lastError,
    }));
}

export function seedDefaultServices(): void {
  const db = getDb();
  const existing = db.select().from(services).all();
  if (existing.length > 0) return;
  const now = new Date().toISOString();
  const defaults = [
    {
      id: randomUUID(),
      name: "Opsora API",
      url: `http://localhost:${process.env.PORT ?? "4100"}/api/health`,
    },
  ];
  for (const d of defaults) {
    db.insert(services)
      .values({
        id: d.id,
        name: d.name,
        url: d.url,
        expectedStatus: 200,
        checkIntervalMs: 30_000,
        enabled: true,
        lastStatus: "unknown",
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}
