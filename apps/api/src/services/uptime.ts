import { and, asc, eq, gte } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { serviceChecks, services } from "../db/schema.js";
import { computeUptime } from "./serviceChecker.js";
import type {
  ServiceStatus,
  ServiceUptime,
  UptimeBucket,
  UptimeIncident,
  UptimeReport,
  UptimeWindow,
} from "@opsora/types";

/** Window definitions — bucket counts keep timeline bars readable at any width. */
export const WINDOWS: Record<UptimeWindow, { ms: number; buckets: number }> = {
  "1h": { ms: 60 * 60 * 1000, buckets: 30 },
  "24h": { ms: 24 * 60 * 60 * 1000, buckets: 48 },
  "7d": { ms: 7 * 24 * 60 * 60 * 1000, buckets: 56 },
};

interface CheckRow {
  ts: string;
  status: string;
  latencyMs: number | null;
}

const STATUS_RANK: Record<ServiceStatus, number> = { unknown: 0, up: 1, degraded: 2, down: 3 };

/** Worst status wins inside a bucket; unknown never masks a real outcome. */
function worse(a: ServiceStatus, b: ServiceStatus): ServiceStatus {
  return STATUS_RANK[b] > STATUS_RANK[a] ? b : a;
}

/**
 * Split check history into N time buckets for the selected window.
 * Worst status wins per bucket; latency is the mean of real samples only.
 */
export function bucketize(
  rows: CheckRow[],
  window: UptimeWindow,
  now = Date.now(),
): UptimeBucket[] {
  const { ms, buckets: count } = WINDOWS[window];
  const start = now - ms;
  const size = ms / count;
  const acc = Array.from({ length: count }, () => ({
    status: "unknown" as ServiceStatus,
    sum: 0,
    latCount: 0,
    count: 0,
  }));
  for (const r of rows) {
    const idx = Math.floor((Date.parse(r.ts) - start) / size);
    if (idx < 0 || idx >= count) continue;
    const b = acc[idx];
    if (!b) continue;
    b.status = worse(b.status, r.status as ServiceStatus);
    b.count += 1;
    if (r.latencyMs != null) {
      b.sum += r.latencyMs;
      b.latCount += 1;
    }
  }
  return acc.map((b, i) => ({
    t: new Date(start + i * size).toISOString(),
    status: b.count === 0 ? "unknown" : b.status,
    avgMs: b.latCount > 0 ? Math.round(b.sum / b.latCount) : null,
    count: b.count,
  }));
}

/**
 * Derive incidents from real status transitions (ascending rows):
 * an incident opens on the first down/degraded sample and closes on the
 * first recovered sample. Still-bad at the end of the window = ongoing.
 */
export function deriveIncidents(
  serviceId: string,
  serviceName: string,
  rows: CheckRow[],
): UptimeIncident[] {
  type Open = { status: "down" | "degraded"; start: string };
  const out: UptimeIncident[] = [];
  let open: Open | null = null;

  const finish = (endedAt: string | null): void => {
    if (!open) return;
    const durationMs = endedAt === null ? null : Date.parse(endedAt) - Date.parse(open.start);
    out.push({
      id: `${serviceId}:${open.start}`,
      serviceId,
      serviceName,
      status: open.status,
      startedAt: open.start,
      endedAt,
      durationMs,
      ongoing: endedAt === null,
    });
    open = null;
  };

  for (const r of rows) {
    const bad = r.status === "down" || r.status === "degraded";
    if (bad) {
      if (open && open.status !== r.status) {
        // Severity flipped (down ↔ degraded): close old, open new.
        finish(r.ts);
      }
      if (!open) open = { status: r.status as "down" | "degraded", start: r.ts };
    } else if (open) {
      finish(r.ts);
    }
  }
  finish(null); // window ended while still bad → ongoing
  return out;
}

/**
 * Full uptime report: per-service windows (1h/24h/7d), timeline buckets for
 * the selected window, mean latency, and derived incidents across all services.
 * Everything comes from recorded checks — nothing is inferred.
 */
export function getUptimeReport(window: UptimeWindow = "24h"): UptimeReport {
  const db = getDb();
  const now = Date.now();
  const rows = db.select().from(services).all();
  const since7d = new Date(now - WINDOWS["7d"].ms).toISOString();
  const sinceWindow = new Date(now - WINDOWS[window].ms).toISOString();

  const list: ServiceUptime[] = [];
  const incidents: UptimeIncident[] = [];

  for (const row of rows) {
    const checks = db
      .select()
      .from(serviceChecks)
      .where(and(eq(serviceChecks.serviceId, row.id), gte(serviceChecks.ts, since7d)))
      .orderBy(asc(serviceChecks.id))
      .all();

    const statusesSince = (iso: string): ServiceStatus[] =>
      checks
        .filter((c) => c.ts >= iso)
        .map((c) => c.status as ServiceStatus)
        .filter((s) => s === "up" || s === "degraded" || s === "down" || s === "unknown");

    const winChecks = checks.filter((c) => c.ts >= sinceWindow);
    const latencies = winChecks.map((c) => c.latencyMs).filter((v): v is number => v != null);
    // A paused monitor cannot have a live incident; keep its historical samples
    // visible, but do not present an old last-down sample as ongoing.
    const svcIncidents = row.enabled ? deriveIncidents(row.id, row.name, winChecks) : [];
    incidents.push(...svcIncidents);

    list.push({
      id: row.id,
      name: row.name,
      url: row.url,
      status: (row.lastStatus as ServiceStatus) ?? "unknown",
      enabled: row.enabled,
      lastCheck: row.lastCheck,
      error: row.lastError,
      uptime: {
        "1h": computeUptime(statusesSince(new Date(now - WINDOWS["1h"].ms).toISOString())),
        "24h": computeUptime(statusesSince(new Date(now - WINDOWS["24h"].ms).toISOString())),
        "7d": computeUptime(statusesSince(since7d)),
      },
      avgLatencyMs:
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : null,
      buckets: bucketize(winChecks, window, now),
      incidentCount: svcIncidents.length,
    });
  }

  const windowUptimes = list
    .filter((s) => s.enabled)
    .map((s) => s.uptime[window])
    .filter((v): v is number => v != null);
  const overallUptime =
    windowUptimes.length > 0
      ? windowUptimes.reduce((a, b) => a + b, 0) / windowUptimes.length
      : null;

  incidents.sort(
    (a, b) => Number(b.ongoing) - Number(a.ongoing) || b.startedAt.localeCompare(a.startedAt),
  );

  return {
    window,
    services: list,
    incidents,
    overallUptime,
    updatedAt: new Date().toISOString(),
  };
}
