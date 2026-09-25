import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("GET /api/health", () => {
  it("returns ok with db check", async () => {
    const app = createApp();
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { status: string };
    expect(["ok", "degraded"]).toContain(json.status);
  });
});

describe("GET /api (index)", () => {
  it("identifies the service", async () => {
    const app = createApp();
    const res = await app.request("/api");
    expect(res.status).toBe(200);
  });
});

describe("docker destructive guard", () => {
  it("rejects actions without confirmation", async () => {
    const app = createApp();
    const res = await app.request("/api/docker/containers/abc/restart", { method: "POST" });
    expect([400, 428, 502]).toContain(res.status);
  });
});

describe("GET /api/services uptime shape", () => {
  it("exposes uptimePercent and recentChecks on every service", async () => {
    const app = createApp();
    const res = await app.request("/api/services");
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      services: { enabled: boolean; uptimePercent: number | null; recentChecks: unknown }[];
    };
    expect(Array.isArray(json.services)).toBe(true);
    for (const s of json.services) {
      expect(typeof s.enabled).toBe("boolean");
      expect(s.uptimePercent === null || typeof s.uptimePercent === "number").toBe(true);
      expect(Array.isArray(s.recentChecks)).toBe(true);
    }
  });
});

describe("GET /api/docker/containers/:id/logs honesty", () => {
  it("rejects malformed container ids without touching the daemon", async () => {
    const app = createApp();
    const res = await app.request("/api/docker/containers/..%2F..%2Fetc/logs");
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("invalid_id");
  });

  it("answers honestly when the daemon or container is unavailable", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/docker/containers/opsora-nonexistent-container-xyz/logs?tail=50",
    );
    // 200 only with a real daemon + real container; otherwise an honest error.
    expect([200, 404, 502, 503]).toContain(res.status);
    const json = (await res.json()) as { logs?: unknown; error?: string };
    if (res.status === 200) {
      expect(typeof json.logs).toBe("string");
    } else {
      expect(["container_not_found", "docker_not_connected", "docker_unavailable"]).toContain(
        json.error,
      );
    }
  });
});
