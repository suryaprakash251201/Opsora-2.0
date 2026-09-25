import { describe, expect, it } from "vitest";
import {
  integrationCreateSchema,
  serviceCreateSchema,
  serviceUpdateSchema,
} from "./validation/schemas.js";
import { redactSecrets } from "./adapters/types.js";

describe("validation schemas", () => {
  it("rejects invalid service payloads", () => {
    expect(serviceCreateSchema.safeParse({ name: "" }).success).toBe(false);
    expect(serviceCreateSchema.safeParse({ name: "ok", url: "not-a-url" }).success).toBe(false);
  });
  it("validates the uptime enabled toggle", () => {
    expect(serviceUpdateSchema.safeParse({ enabled: false }).success).toBe(true);
    expect(serviceUpdateSchema.safeParse({ enabled: "false" }).success).toBe(false);
  });
  it("accepts minimal integration payload", () => {
    expect(integrationCreateSchema.safeParse({ name: "x", type: "docker" }).success).toBe(true);
  });
});

describe("redactSecrets", () => {
  it("masks credential fields", () => {
    const out = redactSecrets({
      apiToken: "abc",
      url: "http://x",
      nested: { secretAccessKey: "s" },
    });
    expect(out.apiToken).toBe("•••redacted•••");
    expect(out.url).toBe("http://x");
    expect((out.nested as Record<string, unknown>).secretAccessKey).toBe("•••redacted•••");
  });
});
