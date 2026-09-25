import { describe, expect, it } from "vitest";
import { buildAlertPayload } from "./notifier.js";

describe("buildAlertPayload", () => {
  it("joins title, detail and url into text", () => {
    const p = buildAlertPayload({
      title: "Service API is unreachable",
      severity: "critical",
      resource: "API",
      detail: "status: up → down",
      url: "http://localhost:4100/api/health",
    });
    expect(p.text).toContain("Service API is unreachable");
    expect(p.text).toContain("status: up → down");
    expect(p.text).toContain("http://localhost:4100/api/health");
    expect(p.severity).toBe("critical");
    expect(p.resource).toBe("API");
  });

  it("defaults missing fields honestly", () => {
    const p = buildAlertPayload({ title: "hi", severity: "info" });
    expect(p.text).toBe("hi");
    expect(p.resource).toBeNull();
    expect(p.url).toBeNull();
    expect(typeof p.at).toBe("string");
  });
});
