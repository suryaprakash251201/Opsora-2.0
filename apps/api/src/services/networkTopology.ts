import type {
  NetworkConnection,
  NetworkConnectionStatus,
  NetworkConnectionType,
  NetworkDevice,
  NetworkDeviceStatus,
  NetworkDeviceType,
} from "@opsora/types";
import { getTailscaleDevices } from "../adapters/tailscale.js";
import { getDb } from "../db/client.js";
import { devices, hosts } from "../db/schema.js";
import { sampleHost } from "./metrics.js";
import { getNetworkSummary } from "./network.js";

const STALE_AGENT_MS = 90_000;
const TAILSCALE_ONLINE_MS = 5 * 60_000;

function mapLooseType(raw: string | null | undefined): NetworkDeviceType {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("server")) return "server";
  if (v.includes("laptop")) return "laptop";
  if (v.includes("desktop") || v.includes("workstation")) return "desktop";
  if (v.includes("phone") || v.includes("mobile") || v.includes("android") || v.includes("iphone"))
    return "mobile";
  if (v.includes("router")) return "router";
  if (v.includes("gateway")) return "gateway";
  if (v.includes("container") || v.includes("docker")) return "container";
  if (v.includes("vm") || v.includes("virtual")) return "vm";
  if (v.includes("switch") || v.includes("network")) return "network";
  return "unknown";
}

export function deriveDeviceStatus(input: {
  online: boolean;
  latencyMs?: number | null;
  packetLossPercent?: number | null;
}): NetworkDeviceStatus {
  if (!input.online) return "offline";
  if (
    (input.latencyMs != null && input.latencyMs >= 150) ||
    (input.packetLossPercent != null && input.packetLossPercent >= 2)
  )
    return "degraded";
  return "online";
}

export function deriveConnectionStatus(input: {
  sourceOnline: boolean;
  targetOnline: boolean;
  latencyMs?: number | null;
  packetLossPercent?: number | null;
}): NetworkConnectionStatus {
  if (!input.sourceOnline || !input.targetOnline) return "inactive";
  if (
    (input.latencyMs != null && input.latencyMs >= 150) ||
    (input.packetLossPercent != null && input.packetLossPercent >= 2)
  )
    return "degraded";
  return "active";
}

interface Collector {
  devices: NetworkDevice[];
  connections: NetworkConnection[];
  tailscaleStatus: string;
}

/** Build the normalized live topology from real sources only. Unknown metrics stay null. */
export async function buildLiveTopology(): Promise<Collector> {
  const updatedAt = new Date().toISOString();
  const deviceList: NetworkDevice[] = [];
  const connections: NetworkConnection[] = [];
  const byId = new Map<string, NetworkDevice>();

  const push = (d: NetworkDevice): void => {
    if (!byId.has(d.id)) {
      byId.set(d.id, d);
      deviceList.push(d);
    }
  };

  const [summary, tail] = await Promise.all([getNetworkSummary(), getTailscaleDevices()]);

  // Internet + LAN gateway infrastructure nodes (status reflects measured reachability).
  const internetOnline = summary.status === "connected";
  push({
    id: "opsora-internet",
    hostname: "internet",
    displayName: "Internet",
    type: "network",
    status: internetOnline ? "online" : "unknown",
    ipAddresses: [],
    primaryIp: summary.wanIp,
    os: null,
    platform: null,
    iface: null,
    lastSeen: updatedAt,
    latencyMs: summary.latencyMs,
    packetLossPercent: summary.packetLossPercent,
    cpuPercent: null,
    memoryPercent: null,
    diskPercent: null,
    source: "system",
  });
  push({
    id: "opsora-gateway",
    hostname: "lan-gateway",
    displayName: "LAN Gateway",
    type: "gateway",
    status: "online",
    ipAddresses: [],
    primaryIp: null,
    os: null,
    platform: null,
    iface: null,
    lastSeen: updatedAt,
    latencyMs: null,
    packetLossPercent: null,
    cpuPercent: null,
    memoryPercent: null,
    diskPercent: null,
    source: "system",
  });

  // Local host + agent hosts (direct check-in channel → type "direct" to gateway).
  const local = await sampleHost();
  const db = getDb();
  const rows = db.select().from(hosts).all();
  const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
  const hostNodes: NetworkDevice[] = [
    {
      id: `opsora-host-${local.id}`,
      hostname: local.hostname,
      displayName: local.hostname,
      type: "server",
      status: deriveDeviceStatus({ online: local.online }),
      ipAddresses: local.ip ? [local.ip] : [],
      primaryIp: local.ip,
      os: local.os,
      platform: null,
      iface: null,
      lastSeen: local.lastSeen,
      latencyMs: null,
      packetLossPercent: null,
      cpuPercent: local.cpuPercent,
      memoryPercent: local.memPercent,
      diskPercent: local.diskPercent,
      source: "local",
    },
    ...rows.map((r) => {
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(r.metaJson) as Record<string, unknown>;
      } catch {
        meta = {};
      }
      const online = Date.now() - new Date(r.lastSeen).getTime() < STALE_AGENT_MS;
      return {
        id: `opsora-host-${r.id}`,
        hostname: r.hostname,
        displayName: r.hostname,
        type: "server" as NetworkDeviceType,
        status: deriveDeviceStatus({ online }),
        ipAddresses: r.ip ? [r.ip] : [],
        primaryIp: r.ip,
        os: r.os,
        platform: null,
        iface: null,
        lastSeen: r.lastSeen,
        latencyMs: null,
        packetLossPercent: null,
        cpuPercent: num(meta.cpuPercent),
        memoryPercent: num(meta.memPercent),
        diskPercent: num(meta.diskPercent),
        source: "agent" as const,
      };
    }),
  ];
  for (const h of hostNodes) push(h);

  // Static / discovered devices (LAN-routed attachment to gateway).
  const staticRows = db.select().from(devices).all();
  for (const d of staticRows) {
    push({
      id: `opsora-device-${d.id}`,
      hostname: d.name,
      displayName: d.name,
      type: mapLooseType(d.type),
      status: deriveDeviceStatus({ online: d.online, latencyMs: null }),
      ipAddresses: d.ip && d.ip !== "unknown" ? [d.ip] : [],
      primaryIp: d.ip === "unknown" ? null : d.ip,
      os: null,
      platform: d.vendor,
      iface: null,
      lastSeen: d.lastSeen,
      latencyMs: null,
      packetLossPercent: null,
      cpuPercent: null,
      memoryPercent: null,
      diskPercent: null,
      source: d.source === "tailscale" ? "tailscale" : "static",
    });
  }

  // Tailscale mesh members. Membership is confirmed by the tailnet API, so
  // inter-mesh attachment is classified p2p; path metrics stay null (unmeasured).
  let tailnetNode = false;
  if (tail.status === "connected") {
    push({
      id: "opsora-tailnet",
      hostname: "tailnet",
      displayName: "Tailnet Mesh",
      type: "network",
      status: "online",
      ipAddresses: [],
      primaryIp: null,
      os: null,
      platform: "tailscale",
      iface: null,
      lastSeen: updatedAt,
      latencyMs: null,
      packetLossPercent: null,
      cpuPercent: null,
      memoryPercent: null,
      diskPercent: null,
      source: "tailscale",
    });
    tailnetNode = true;
    for (const t of tail.devices.slice(0, 100)) {
      const lastSeenMs = Date.now() - new Date(t.lastSeen).getTime();
      const online = Number.isFinite(lastSeenMs) ? lastSeenMs < TAILSCALE_ONLINE_MS : t.online;
      push({
        id: `opsora-tail-${t.id}`,
        hostname: t.name,
        displayName: t.name,
        type: mapLooseType(t.type),
        status: deriveDeviceStatus({ online, latencyMs: t.latencyMs }),
        ipAddresses: t.ip && t.ip !== "unknown" ? [t.ip] : [],
        primaryIp: t.ip === "unknown" ? null : t.ip,
        os: null,
        platform: "tailscale",
        iface: null,
        lastSeen: t.lastSeen,
        latencyMs: t.latencyMs,
        packetLossPercent: null,
        cpuPercent: null,
        memoryPercent: null,
        diskPercent: null,
        source: "tailscale",
      });
    }
  }

  const link = (
    id: string,
    sourceId: string,
    targetId: string,
    type: NetworkConnectionType,
  ): void => {
    const a = byId.get(sourceId);
    const b = byId.get(targetId);
    if (!a || !b) return;
    const sourceOnline = a.status === "online" || a.status === "degraded";
    const targetOnline = b.status === "online" || b.status === "degraded";
    const latency = a.latencyMs ?? b.latencyMs ?? null;
    connections.push({
      id,
      sourceId,
      targetId,
      status: deriveConnectionStatus({
        sourceOnline,
        targetOnline,
        latencyMs: latency,
        packetLossPercent: null,
      }),
      type,
      latencyMs: latency,
      packetLossPercent: null,
      bytesSent: null,
      bytesReceived: null,
      durationSecs: null,
      iface: null,
      localEndpoint: a.primaryIp,
      remoteEndpoint: b.primaryIp,
      lastActivity: a.lastSeen ?? b.lastSeen ?? null,
    });
  };

  link("conn-internet-gateway", "opsora-internet", "opsora-gateway", "routed");
  for (const h of hostNodes) link(`conn-gw-${h.id}`, "opsora-gateway", h.id, "direct");
  for (const d of staticRows)
    link(`conn-gw-opsora-device-${d.id}`, "opsora-gateway", `opsora-device-${d.id}`, "routed");
  if (tailnetNode) {
    link("conn-gw-tailnet", "opsora-gateway", "opsora-tailnet", "routed");
    for (const t of tail.devices.slice(0, 100))
      link(`conn-tail-${t.id}`, "opsora-tailnet", `opsora-tail-${t.id}`, "p2p");
  }

  return { devices: deviceList, connections, tailscaleStatus: tail.status };
}

export function summarizeTopology(devices: NetworkDevice[], connections: NetworkConnection[]): {
  total: number;
  online: number;
  degraded: number;
  offline: number;
  unknown: number;
  connectionsTotal: number;
  connectionsActive: number;
  p2pCount: number;
  relayCount: number;
  avgLatencyMs: number | null;
  packetLossPercent: number | null;
} {
  let online = 0;
  let degraded = 0;
  let offline = 0;
  let unknown = 0;
  const latencies: number[] = [];
  for (const d of devices) {
    if (d.status === "online") online += 1;
    else if (d.status === "degraded") degraded += 1;
    else if (d.status === "offline") offline += 1;
    else unknown += 1;
    if (d.latencyMs != null) latencies.push(d.latencyMs);
  }
  for (const c of connections) if (c.latencyMs != null) latencies.push(c.latencyMs);
  return {
    total: devices.length,
    online,
    degraded,
    offline,
    unknown,
    connectionsTotal: connections.length,
    connectionsActive: connections.filter((c) => c.status === "active").length,
    p2pCount: connections.filter((c) => c.type === "p2p" || c.type === "direct").length,
    relayCount: connections.filter((c) => c.type === "relay").length,
    avgLatencyMs:
      latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
    packetLossPercent: null,
  };
}
