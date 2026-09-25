import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";

// Isolate history writes to a temp database — never the dev DB.
const tmpDb = `${process.cwd()}/data/.test-uptime-${process.pid}.db`;
process.env.DATABASE_URL = `file:${tmpDb}`;

import { applyMigrations } from "../db/migrate.js";
import { closeDb } from "../db/client.js";
import {
  computeUptime,
  getRecentChecks,
  getUptimePercent,
  recordCheck,
} from "./serviceChecker.js";

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

describe("computeUptime", () => {
  it("returns null when there is nothing to score", () => {
    expect(computeUptime([])).toBeNull();
    expect(computeUptime(["unknown", "unknown"])).toBeNull();
  });

  it("scores up=1, degraded=0.5, down=0", () => {
    expect(computeUptime(["up", "up"])).toBe(100);
    expect(computeUptime(["down"])).toBe(0);
    expect(computeUptime(["up", "up", "degraded", "down"])).toBeCloseTo(62.5);
  });

  it("ignores unknown samples instead of inventing them", () => {
    expect(computeUptime(["up", "unknown"])).toBe(100);
  });
});

describe("check-history round trip", () => {
  it("records checks and serves recent ticks + 24h uptime", () => {
    const id = `svc-${Date.now()}`;
    recordCheck(id, "up", 12);
    recordCheck(id, "down", 40);
    recordCheck(id, "up", 9);

    expect(getRecentChecks(id)).toEqual(["up", "down", "up"]);
    expect(getUptimePercent(id)).toBeCloseTo((2 / 3) * 100);
  });

  it("answers empty history honestly", () => {
    const id = `svc-absent-${Date.now()}`;
    expect(getRecentChecks(id)).toEqual([]);
    expect(getUptimePercent(id)).toBeNull();
  });
});
