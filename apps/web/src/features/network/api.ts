import { queryPolicy } from "@opsora/config";
import type { InfraEvent } from "@opsora/types";
import { NetworkConnectionSchema, NetworkDeviceSchema } from "@opsora/types";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiGet, apiPost } from "../../lib/api";
import { keys } from "../../lib/query";
import { buildMockTopology } from "./mockLiveNetwork";
import type { LiveTopology } from "./types";

const topologyResponseSchema = z.object({
  devices: z.array(NetworkDeviceSchema),
  connections: z.array(NetworkConnectionSchema),
  summary: z.object({
    total: z.number(),
    online: z.number(),
    degraded: z.number(),
    offline: z.number(),
    unknown: z.number(),
    connectionsTotal: z.number(),
    connectionsActive: z.number(),
    p2pCount: z.number(),
    relayCount: z.number(),
    avgLatencyMs: z.number().nullable(),
    packetLossPercent: z.number().nullable(),
  }),
  tailscaleStatus: z.string().default("unknown"),
  updatedAt: z.string(),
});

/** Explicit opt-in only: `?mock=1` or VITE_NETWORK_MOCK=1. Production defaults to real data. */
export function isMockEnabled(): boolean {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mock") === "1")
    return true;
  return (import.meta.env.VITE_NETWORK_MOCK as string | undefined) === "1";
}

async function fetchRealTopology(): Promise<LiveTopology> {
  const raw = await apiGet<unknown>("/api/network/topology");
  const parsed = topologyResponseSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Unexpected topology response");
  return parsed.data;
}

export async function fetchLiveTopology(): Promise<LiveTopology> {
  if (isMockEnabled()) {
    // Keep the async boundary so callers treat mock like the real adapter.
    await new Promise((r) => setTimeout(r, 150));
    return buildMockTopology();
  }
  return fetchRealTopology();
}

export function useLiveTopology() {
  return useQuery({
    queryKey: keys.networkLive,
    queryFn: fetchLiveTopology,
    staleTime: queryPolicy.discovery.staleTime,
    // SSE invalidations drive freshness; interval refetch is a slow backstop, not polling.
    refetchInterval: queryPolicy.discovery.refetchInterval,
  });
}

export function useNetworkEventHistory() {
  return useQuery({
    queryKey: keys.networkEvents,
    queryFn: () =>
      apiGet<{ events: InfraEvent[]; updatedAt: string }>("/api/network/events?limit=50"),
    staleTime: queryPolicy.serviceHealth.staleTime,
  });
}

export interface PingResult {
  host: string;
  latencyMs: number | null;
  ok: boolean;
  timestamp: string;
}

export function pingHost(host: string): Promise<PingResult> {
  return apiPost<PingResult>("/api/network/ping", { host });
}
