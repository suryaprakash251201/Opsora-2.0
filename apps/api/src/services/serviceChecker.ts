import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { serviceChecks, services } from "../db/schema.js";
import { bus } from "../realtime/bus.js";
import { notifyServiceTransition } from "./notifier.js";
import type { Service } from "@opsora/types";
import { randomUUID } from "node:crypto";

export const UPTIME_WINDOW_MS = 24 * 60 * 60 * 1000;
const CHECK_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_TICKS = 8;

/**
 * Score a check outcome: up = 1, degraded = 0.5, down = 0.
 * `unknown` samples (disabled / never checked) are excluded, never invented.
 */
export function computeUptime(statuses: Service["status"][]): number | null {
  let score = 0;
  let total = 0;
  for (const s of statuses) {
    if (s === "up") {
      score += 1;
      total += 1;
    } else if (s === "degraded") {
      score += 0.5;
      total += 1;
    } else if (s === "down") {
      total += 1;
    }
  }
  if (total === 0) return null;
  return (score / total) * 100;
}

/** Best-effort check-history log. Never throws — callers must not fail. */
export function recordCheck(
  serviceId: string,
  status: Service["status"],
  latencyMs: number | null,
  at = new Date().toISOString(),
): void {
  try {
    const db = getDb();
    db.insert(serviceChecks).values({ serviceId, ts: at, status, latencyMs }).run();
    const cutoff = new Date(Date.now() - CHECK_RETENTION_MS).toISOString();
    db.delete(serviceChecks).where(lt(serviceChecks.ts, cutoff)).run();
  } catch {
    /* history unavailable — current status still served */
  }
}

/** Last N outcomes oldest→newest; [] when nothing was recorded yet. */
export function getRecentChecks(serviceId: string, n = RECENT_TICKS): Service["status"][] {
  try {
    const db = getDb();
    const rows = db
      .select()
      .from(serviceChecks)
      .where(eq(serviceChecks.serviceId, serviceId))
      .orderBy(desc(serviceChecks.id))
      .limit(n)
      .all();
    return rows
      .reverse()
      .map((r) => r.status as Service["status"])
      .filter((s) => s === "up" || s === "down" || s === "degraded" || s === "unknown");
  } catch {
    return [];
  }
}

/** Uptime % over the trailing 24h window; null when no samples exist. */
export function getUptimePercent(serviceId: string): number | null {
  try {
    const db = getDb();
    const since = new Date(Date.now() - UPTIME_WINDOW_MS).toISOString();
    const rows = db
      .select()
      .from(serviceChecks)
      .where(and(eq(serviceChecks.serviceId, serviceId), gte(serviceChecks.ts, since)))
      .orderBy(asc(serviceChecks.id))
      .all();
    return computeUptime(rows.map((r) => r.status as Service["status"]));
  } catch {
    return null;
  }
}

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
        uptimePercent: getUptimePercent(row.id),
        lastCheck: row.lastCheck,
        error: "checks disabled",
        enabled: false,
        recentChecks: getRecentChecks(row.id),
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
    recordCheck(row.id, r.status, r.ms, now);
    if (prev !== r.status && (r.status === "down" || prev === "down")) {
      const message =
        r.status === "down"
          ? `Service ${row.name} is unreachable`
          : `Service ${row.name} recovered`;
      bus.publish({
        category: "service",
        resource: row.name,
        message,
        severity: r.status === "down" ? "critical" : "info",
      });
      notifyServiceTransition({
        serviceName: row.name,
        url: row.url,
        status: r.status,
        previousStatus: prev,
        message,
      });
    }
    out.push({
      id: row.id,
      name: row.name,
      url: row.url,
      status: r.status,
      httpStatus: r.http,
      responseTimeMs: r.ms,
      uptimePercent: getUptimePercent(row.id),
      lastCheck: now,
      error: r.error,
      enabled: true,
      recentChecks: getRecentChecks(row.id),
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
      uptimePercent: getUptimePercent(row.id),
      lastCheck: row.lastCheck,
      error: row.lastError,
      enabled: row.enabled,
      recentChecks: getRecentChecks(row.id),
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
