import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("GET /api/network/topology", () => {
  it("returns normalized devices and connections", async () => {
    const app = createApp();
    const res = await app.request("/api/network/topology");
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      devices: { id: string; hostname: string; status: string; type: string }[];
      connections: { id: string; sourceId: string; targetId: string; status: string; type: string }[];
      summary: { total: number };
      updatedAt: string;
    };
    expect(Array.isArray(json.devices)).toBe(true);
    expect(Array.isArray(json.connections)).toBe(true);
    expect(json.summary.total).toBe(json.devices.length);
    for (const d of json.devices) {
      expect(["online", "degraded", "offline", "unknown"]).toContain(d.status);
    }
    const ids = new Set(json.devices.map((d) => d.id));
    for (const c of json.connections) {
      expect(ids.has(c.sourceId)).toBe(true);
      expect(ids.has(c.targetId)).toBe(true);
      expect(["active", "degraded", "inactive", "unknown"]).toContain(c.status);
      expect(["p2p", "direct", "relay", "routed", "unknown"]).toContain(c.type);
    }
  });
});

describe("GET /api/network/devices and /connections", () => {
  it("lists devices and connections separately", async () => {
    const app = createApp();
    const d = await app.request("/api/network/devices");
    expect(d.status).toBe(200);
    const c = await app.request("/api/network/connections");
    expect(c.status).toBe(200);
  });

  it("404s on unknown ids and 400s on overlong ids", async () => {
    const app = createApp();
    const missing = await app.request("/api/network/devices/no-such-device");
    expect(missing.status).toBe(404);
    const bad = await app.request(`/api/network/devices/${"x".repeat(300)}`);
    expect(bad.status).toBe(400);
    const missingConn = await app.request("/api/network/connections/no-such-conn");
    expect(missingConn.status).toBe(404);
  });

  it("resolves known device detail", async () => {
    const app = createApp();
    const topo = (await (await app.request("/api/network/topology")).json()) as {
      devices: { id: string }[];
    };
    expect(topo.devices.length).toBeGreaterThan(0);
    const res = await app.request(`/api/network/devices/${topo.devices[0]?.id}`);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/network/events", () => {
  it("returns recent network events with a bounded limit", async () => {
    const app = createApp();
    const res = await app.request("/api/network/events?limit=10");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { events: unknown[] };
    expect(Array.isArray(json.events)).toBe(true);
    expect(json.events.length).toBeLessThanOrEqual(10);
  });
});
