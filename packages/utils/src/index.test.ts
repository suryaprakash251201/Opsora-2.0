import { describe, expect, it } from "vitest";
import { formatBytes, formatUptime, isStale, timeAgo } from "./index.js";

describe("formatBytes", () => {
  it("handles null/undefined", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
  });
  it("formats known values", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KiB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MiB");
  });
});

describe("formatUptime", () => {
  it("handles unknown", () => {
    expect(formatUptime(null)).toBe("—");
  });
  it("formats durations", () => {
    expect(formatUptime(90)).toBe("1m");
    expect(formatUptime(3700)).toBe("1h 1m");
    expect(formatUptime(90000)).toBe("1d 1h");
  });
});

describe("isStale", () => {
  it("flags old timestamps", () => {
    expect(isStale(new Date(Date.now() - 60_000).toISOString(), 30_000)).toBe(true);
    expect(isStale(new Date().toISOString(), 30_000)).toBe(false);
  });
  it("treats invalid dates as stale", () => {
    expect(isStale("not-a-date")).toBe(true);
  });
});

describe("timeAgo", () => {
  it("handles invalid", () => {
    expect(timeAgo("nope")).toBe("unknown");
  });
});
