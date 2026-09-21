import type { ConnectionStatus, Device } from "@opsora/types";
import type { IntegrationAdapter } from "./types.js";

function configured(): boolean {
  return Boolean(process.env.TAILSCALE_API_KEY && process.env.TAILSCALE_TAILNET);
}

export async function getTailscaleDevices(): Promise<{
  status: ConnectionStatus;
  devices: Device[];
  error: string | null;
  updatedAt: string;
}> {
  const updatedAt = new Date().toISOString();
  if (!configured()) {
    return {
      status: "not_connected",
      devices: [],
      error: "TAILSCALE_API_KEY / TAILSCALE_TAILNET not configured",
      updatedAt,
    };
  }
  try {
    const tailnet = process.env.TAILSCALE_TAILNET ?? "";
    const res = await fetch(
      `https://api.tailscale.com/api/v2/tailnet/${encodeURIComponent(tailnet)}/devices`,
      {
        headers: { Authorization: `Bearer ${process.env.TAILSCALE_API_KEY ?? ""}` },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) throw new Error(`tailscale http ${res.status}`);
    const json = (await res.json()) as { devices?: Record<string, unknown>[] };
    const list = Array.isArray(json.devices) ? json.devices : [];
    const devices: Device[] = list.map((d) => {
      const r = d as Record<string, unknown>;
      const addresses = (r["addresses"] as string[] | undefined) ?? [];
      const lastSeen = typeof r["lastSeen"] === "string" ? (r["lastSeen"] as string) : updatedAt;
      const online = Date.now() - new Date(lastSeen).getTime() < 5 * 60_000;
      return {
        id: `tailscale-${String(r["id"] ?? r["hostname"] ?? Math.random())}`,
        name: String(r["hostname"] ?? r["name"] ?? "tailscale-device"),
        ip: addresses[0] ?? "unknown",
        mac: null,
        type: "tailscale",
        vendor: null,
        online,
        lastSeen,
        latencyMs: null,
        source: "tailscale" as const,
      };
    });
    return { status: "connected", devices, error: null, updatedAt };
  } catch (err) {
    return {
      status: "unavailable",
      devices: [],
      error: err instanceof Error ? err.message : "tailscale error",
      updatedAt,
    };
  }
}

export const tailscaleAdapter: IntegrationAdapter = {
  id: "tailscale",
  name: "Tailscale",
  type: "tailscale",
  capabilities: ["devices.list"],
  async healthCheck(): Promise<{ status: ConnectionStatus; error?: string | null }> {
    if (!configured()) return { status: "not_connected", error: "not configured" };
    const r = await getTailscaleDevices();
    return { status: r.status, error: r.error };
  },
};
