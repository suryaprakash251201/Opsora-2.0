import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

// Isolate history writes to a temp database — never the dev DB.
const tmpDb = `${process.cwd()}/data/.test-uptimereport-${process.pid}.db`;
process.env.DATABASE_URL = `file:${tmpDb}`;

import { applyMigrations } from "../db/migrate.js";
import { closeDb, getDb } from "../db/client.js";
import { services } from "../db/schema.js";
import { bucketize, deriveIncidents, getUptimeReport } from "./uptime.js";
import { recordCheck } from "./serviceChecker.js";

/** ISO timestamp `ms` in the past. */
const ago = (ms: number): string => new Date(Date.now() - ms).toISOString();

beforeAll(() => {
  applyMigrations();
});

afterAll(() => {
  closeDb();
  for (const suffix of ["", "-shm", "-wal", "-journal"]) {
    try {
      fs.unlinkSync(`${tmpDb}${suffix}`);
    } catch {
      /* already gone */
    }
  }
});

describe("bucketize", () => {
  it("maps checks to 30 buckets with worst-status + mean latency", () => {
    const now = Date.now();
    const start = now - 3_600_000; // window start (1h → 2-minute buckets)
    const t = (offsetMs: number): string => new Date(start + offsetMs).toISOString();
    const rows = [
      { ts: t(10_000), status: "up", latencyMs: 10 },
      { ts: t(20_000), status: "down", latencyMs: null },
      { ts: t(30_000), status: "up", latencyMs: 30 },
    ];
    const buckets = bucketize(rows, "1h", now);
    expect(buckets).toHaveLength(30);
    // First bucket holds all three: worst status = down, mean of real latencies.
    // The untouched second bucket stays honestly empty.
    expect(buckets.slice(0, 2)).toMatchObject([
      { status: "down", avgMs: 20, count: 3 },
      { status: "unknown", avgMs: null, count: 0 },
    ]);
  });

  it("uses 48 buckets for 24h and 56 for 7d", () => {
    expect(bucketize([], "24h")).toHaveLength(48);
    expect(bucketize([], "7d")).toHaveLength(56);
  });
});

describe("deriveIncidents", () => {
  it("opens on the first bad sample and closes on recovery", () => {
    const rows = [
      { ts: ago(100_000), status: "up", latencyMs: 5 },
      { ts: ago(90_000), status: "down", latencyMs: null },
      { ts: ago(80_000), status: "down", latencyMs: null },
      { ts: ago(70_000), status: "up", latencyMs: 5 },
    ];
    const incidents = deriveIncidents("s1", "Svc", rows);
    expect(incidents).toHaveLength(1);
    // Down at -90s, recovered at -70s → 20s duration, closed.
    expect(incidents).toMatchObject([
      { status: "down", ongoing: false, durationMs: 20_000 },
    ]);
  });

  it("keeps an incident open when checks never recover", () => {
    const rows = [
      { ts: ago(50_000), status: "up", latencyMs: 5 },
      { ts: ago(40_000), status: "down", latencyMs: null },
    ];
    const incidents = deriveIncidents("s1", "Svc", rows);
    expect(incidents).toHaveLength(1);
    expect(incidents).toMatchObject([
      { ongoing: true, endedAt: null, durationMs: null },
    ]);
  });

  it("reports nothing when every sample is healthy", () => {
    const rows = [
      { ts: ago(30_000), status: "up", latencyMs: 5 },
      { ts: ago(20_000), status: "up", latencyMs: 6 },
    ];
    expect(deriveIncidents("s1", "Svc", rows)).toEqual([]);
  });
});

describe("getUptimeReport", () => {
  it("answers windows, buckets and incidents from recorded checks", () => {
    const id = randomUUID();
    const now = new Date().toISOString();
    getDb()
      .insert(services)
      .values({
        id,
        name: "report-svc",
        url: "http://example.test",
        expectedStatus: 200,
        checkIntervalMs: 30_000,
        enabled: true,
        lastStatus: "up",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    recordCheck(id, "up", 10, ago(30_000));
    recordCheck(id, "down", null, ago(20_000));
    recordCheck(id, "up", 12, ago(10_000));

    const report = getUptimeReport("1h");
    const svc = report.services.find((s) => s.id === id);
    expect(svc).toBeDefined();
    // Optional chaining: a missing row turns these into visible failures too.
    expect(svc?.uptime["1h"]).toBeCloseTo((2 / 3) * 100);
    expect(svc?.uptime["24h"]).toBeCloseTo((2 / 3) * 100);
    expect(svc?.buckets).toHaveLength(30);
    expect(svc?.incidentCount).toBe(1);
    expect(svc?.avgLatencyMs).toBe(11); // mean of 10 and 12
    expect(report.incidents.some((i) => i.serviceId === id)).toBe(true);
    expect(report.window).toBe("1h");
    expect(report.overallUptime).not.toBeNull();
  });
});
