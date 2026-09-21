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
