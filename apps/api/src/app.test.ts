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
