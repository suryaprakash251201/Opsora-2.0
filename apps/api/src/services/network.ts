import type { NetworkSummary } from "@opsora/types";
import dns from "node:dns/promises";

async function measureLatency(host = "1.1.1.1"): Promise<number | null> {
  const start = Date.now();
  try {
    await dns.lookup(host);
    return Date.now() - start;
  } catch {
    return null;
  }
}

/** Ping probe: measures real DNS lookup resolution time to target host or IP. */
export async function pingHost(host = "1.1.1.1"): Promise<{
  host: string;
  latencyMs: number | null;
  ok: boolean;
  timestamp: string;
}> {
  const clean =
    host
      .trim()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.split(":")[0] || "1.1.1.1";
  const start = Date.now();
  try {
    await dns.lookup(clean);
    return {
      host: clean,
      latencyMs: Date.now() - start,
      ok: true,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      host: clean,
      latencyMs: null,
      ok: false,
      timestamp: new Date().toISOString(),
    };
  }
}

/** Best-effort real network summary. Never fabricates bandwidth — null when unknown. */
export async function getNetworkSummary(): Promise<NetworkSummary> {
  const latencyMs = await measureLatency();
  const status = latencyMs === null ? "unavailable" : "connected";
  return {
    status,
    downloadBps: null,
    uploadBps: null,
    latencyMs,
    packetLossPercent: null,
    wanIp: null,
    updatedAt: new Date().toISOString(),
  };
}

