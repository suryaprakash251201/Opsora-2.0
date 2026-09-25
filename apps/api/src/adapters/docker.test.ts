import { describe, expect, it } from "vitest";
import { clampTail, demuxDockerStream } from "./docker.js";

function frame(stream: 1 | 2, payload: string): Buffer {
  const body = Buffer.from(payload, "utf8");
  const header = Buffer.alloc(8);
  header[0] = stream;
  header.writeUInt32BE(body.length, 4);
  return Buffer.concat([header, body]);
}

describe("clampTail", () => {
  it("defaults to 100 for missing or garbage input", () => {
    expect(clampTail(null)).toBe(100);
    expect(clampTail(undefined)).toBe(100);
    expect(clampTail("abc")).toBe(100);
  });

  it("clamps to the 10–500 range", () => {
    expect(clampTail("1")).toBe(10);
    expect(clampTail("200")).toBe(200);
    expect(clampTail("9999")).toBe(500);
  });
});

describe("demuxDockerStream", () => {
  it("returns empty string for empty input", () => {
    expect(demuxDockerStream(Buffer.alloc(0))).toBe("");
  });

  it("joins multiplexed stdout/stderr frames", () => {
    const buf = Buffer.concat([frame(1, "hello\n"), frame(2, "oops\n")]);
    expect(demuxDockerStream(buf)).toBe("hello\noops\n");
  });

  it("passes TTY-style raw text through untouched", () => {
    const raw = Buffer.from("plain log line\nanother\n", "utf8");
    expect(demuxDockerStream(raw)).toBe("plain log line\nanother\n");
  });

  it("keeps framed content and never throws on truncated input", () => {
    const full = frame(1, "complete\n");
    const truncated = Buffer.concat([full, Buffer.from([0x01, 0x00])]);
    expect(demuxDockerStream(truncated)).toContain("complete\n");
  });
});
