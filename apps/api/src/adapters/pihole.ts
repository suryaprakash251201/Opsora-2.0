import type { ConnectionStatus, DnsSummary } from "@opsora/types";
import { z } from "zod";
import type { IntegrationAdapter } from "./types.js";

const summaryResponse = z.object({
  dns_queries_all_types: z.number().optional(),
  ads_blocked_today: z.number().optional(),
  ads_percentage_today: z.number().optional(),
});

function baseUrl(): string | null {
  const raw = (process.env.PIHOLE_URL ?? "").trim().replace(/\/$/, "");
  return raw.length > 0 ? raw : null;
}

export async function getDnsSummary(): Promise<DnsSummary> {
  const updatedAt = new Date().toISOString();
  const base = baseUrl();
  if (!base) {
    return {
      status: "not_connected",
      totalQueries: null,
      blockedQueries: null,
      blockPercent: null,
      latencyMs: null,
      topDomains: [],
      topClients: [],
      error: "PIHOLE_URL is not configured",
      updatedAt,
    };
  }
  const token = process.env.PIHOLE_API_TOKEN ?? "";
  const started = Date.now();
  try {
    // Pi-hole v6: GET /api/stats/summary with X-FTL-SID auth or password header.
    // Try v6 first, fall back to v5 summaryRaw endpoint honestly reporting failure.
    const headers: Record<string, string> = token ? { "X-FTL-SID": token } : {};
    let res = await fetch(`${base}/api/stats/summary`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok && res.status === 404) {
      res = await fetch(`${base}/admin/api.php?summaryRaw`, { signal: AbortSignal.timeout(5000) });
    }
    if (!res.ok) throw new Error(`pi-hole http ${res.status}`);
    const json: unknown = await res.json();
    const parsed = summaryResponse.safeParse(json);
    const latencyMs = Date.now() - started;
    if (!parsed.success) {
      return {
        status: "connected",
        totalQueries: null,
        blockedQueries: null,
        blockPercent: null,
        latencyMs,
        topDomains: [],
        topClients: [],
        error: "unexpected pi-hole response shape",
        updatedAt,
      };
    }
    return {
      status: "connected",
      totalQueries: parsed.data.dns_queries_all_types ?? null,
      blockedQueries: parsed.data.ads_blocked_today ?? null,
      blockPercent: parsed.data.ads_percentage_today ?? null,
      latencyMs,
      topDomains: [],
      topClients: [],
      error: null,
      updatedAt,
    };
  } catch (err) {
    return {
      status: "unavailable",
      totalQueries: null,
      blockedQueries: null,
      blockPercent: null,
      latencyMs: null,
      topDomains: [],
      topClients: [],
      error: err instanceof Error ? err.message : "pi-hole unavailable",
      updatedAt,
    };
  }
}

export const piholeAdapter: IntegrationAdapter = {
  id: "pihole",
  name: "Pi-hole",
  type: "pihole",
  capabilities: ["dns.summary"],
  async healthCheck(): Promise<{ status: ConnectionStatus; error?: string | null }> {
    const s = await getDnsSummary();
    return { status: s.status, error: s.error };
  },
};
