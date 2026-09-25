import type { InfraEvent } from "@opsora/types";
import type {
  DeviceFilter,
  LiveFeedEntry,
  NetworkConnection,
  NetworkConnectionStatus,
  NetworkConnectionType,
  NetworkDevice,
  NetworkDeviceStatus,
  NodePosition,
} from "./types";

// ── Status presentation (icon + text; never color alone) ────────────────────

export const DEVICE_STATUS_LABEL: Record<NetworkDeviceStatus, string> = {
  online: "Online",
  degraded: "Degraded",
  offline: "Offline",
  unknown: "Unknown",
};

export const CONNECTION_STATUS_LABEL: Record<NetworkConnectionStatus, string> = {
  active: "Active",
  degraded: "Degraded",
  inactive: "Inactive",
  unknown: "Unknown",
};

export const CONNECTION_TYPE_LABEL: Record<NetworkConnectionType, string> = {
  p2p: "P2P",
  direct: "Direct",
  relay: "Relay",
  routed: "Routed",
  unknown: "Unknown",
};

export function deviceDotClass(status: NetworkDeviceStatus): string {
  switch (status) {
    case "online":
      return "bg-emerald-500 dark:bg-emerald-400";
    case "degraded":
      return "bg-amber-500 dark:bg-amber-400";
    case "offline":
      return "bg-rose-500 dark:bg-rose-400";
    default:
      return "bg-zinc-500";
  }
}

export function deviceTextClass(status: NetworkDeviceStatus): string {
  switch (status) {
    case "online":
      return "text-emerald-700 dark:text-emerald-400";
    case "degraded":
      return "text-amber-700 dark:text-amber-400";
    case "offline":
      return "text-rose-700 dark:text-rose-400";
    default:
      return "text-zinc-600 dark:text-zinc-400";
  }
}

/** Edge stroke color class for a connection state. */
export function connectionStrokeClass(status: NetworkConnectionStatus): string {
  switch (status) {
    case "active":
      return "stroke-emerald-400/60";
    case "degraded":
      return "stroke-amber-400/70";
    case "inactive":
      return "stroke-zinc-600/60";
    default:
      return "stroke-zinc-500/50";
  }
}

export function isP2PConnection(c: Pick<NetworkConnection, "type">): boolean {
  return c.type === "p2p" || c.type === "direct";
}

// ── Filtering ───────────────────────────────────────────────────────────────

const CLIENT_TYPES = new Set(["desktop", "laptop", "mobile"]);

export function deviceConnectionTypes(
  deviceId: string,
  connections: NetworkConnection[],
): Set<NetworkConnectionType> {
  const out = new Set<NetworkConnectionType>();
  for (const c of connections) {
    if (c.sourceId === deviceId || c.targetId === deviceId) out.add(c.type);
  }
  return out;
}

export function filterDevices(
  devices: NetworkDevice[],
  connections: NetworkConnection[],
  query: string,
  filter: DeviceFilter,
): NetworkDevice[] {
  const q = query.trim().toLowerCase();
  return devices.filter((d) => {
    if (q) {
      const hay = [
        d.hostname,
        d.displayName ?? "",
        d.primaryIp ?? "",
        ...d.ipAddresses,
        d.os ?? "",
        d.type,
        d.id,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    switch (filter) {
      case "all":
        return true;
      case "online":
        return d.status === "online";
      case "offline":
        return d.status === "offline";
      case "degraded":
        return d.status === "degraded";
      case "servers":
        return d.type === "server" || d.type === "vm";
      case "clients":
        return CLIENT_TYPES.has(d.type);
      case "network":
        return d.type === "router" || d.type === "gateway" || d.type === "network";
      case "containers":
        return d.type === "container";
      case "p2p": {
        const types = deviceConnectionTypes(d.id, connections);
        return types.has("p2p") || types.has("direct");
      }
      case "relay": {
        return deviceConnectionTypes(d.id, connections).has("relay");
      }
      default:
        return true;
    }
  });
}

export function filterConnections(
  connections: NetworkConnection[],
  devices: NetworkDevice[],
  query: string,
  filter: DeviceFilter,
): NetworkConnection[] {
  const byId = new Map(devices.map((d) => [d.id, d]));
  const q = query.trim().toLowerCase();
  return connections.filter((c) => {
    if (filter === "p2p" && !isP2PConnection(c)) return false;
    if (filter === "relay" && c.type !== "relay") return false;
    if (q) {
      const a = byId.get(c.sourceId)?.hostname ?? c.sourceId;
      const b = byId.get(c.targetId)?.hostname ?? c.targetId;
      if (!`${a} ${b} ${c.id} ${c.type}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

// ── Deterministic layered layout ────────────────────────────────────────────
// Layers: internet/network → gateway/router → servers → clients → containers.
// Nodes unreachable from roots fall back to a stable grid (sorted by id).

const LAYER_OF: Record<string, number> = {
  network: 0,
  gateway: 1,
  router: 1,
  server: 2,
  vm: 2,
  desktop: 3,
  laptop: 3,
  mobile: 3,
  unknown: 3,
  container: 4,
};

export const LAYOUT_WIDTH = 1100;
export const LAYOUT_HEIGHT = 700;

export function autoLayout(
  devices: NetworkDevice[],
  connections: NetworkConnection[],
  width = LAYOUT_WIDTH,
  height = LAYOUT_HEIGHT,
): Map<string, NodePosition> {
  const out = new Map<string, NodePosition>();
  const adjacency = new Map<string, Set<string>>();
  for (const c of connections) {
    if (!adjacency.has(c.sourceId)) adjacency.set(c.sourceId, new Set());
    if (!adjacency.has(c.targetId)) adjacency.set(c.targetId, new Set());
    adjacency.get(c.sourceId)?.add(c.targetId);
    adjacency.get(c.targetId)?.add(c.sourceId);
  }

  // BFS depth from infrastructure roots (internet/network nodes first).
  const roots = devices
    .filter((d) => d.type === "network" || d.id === "opsora-internet")
    .map((d) => d.id);
  const seeds =
    roots.length > 0 ? roots : devices.filter((d) => (LAYER_OF[d.type] ?? 3) <= 1).map((d) => d.id);
  const depth = new Map<string, number>();
  const queue: string[] = [];
  for (const s of seeds) {
    if (!depth.has(s)) {
      depth.set(s, 0);
      queue.push(s);
    }
  }
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    for (const next of adjacency.get(cur) ?? []) {
      if (!depth.has(next)) {
        depth.set(next, (depth.get(cur) ?? 0) + 1);
        queue.push(next);
      }
    }
  }

  const layers = new Map<number, NetworkDevice[]>();
  const orphans: NetworkDevice[] = [];
  const sorted = [...devices].sort((a, b) => a.id.localeCompare(b.id));
  for (const d of sorted) {
    const dep = depth.get(d.id);
    if (dep == null) {
      orphans.push(d);
      continue;
    }
    const layer = Math.min(4, Math.max(LAYER_OF[d.type] ?? 3, Math.min(dep, 4)));
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)?.push(d);
  }

  const padX = 110;
  const padTop = 80;
  const usableH = height - padTop - 70;
  for (const [layer, members] of layers) {
    const y = padTop + (usableH * layer) / 4;
    members.forEach((d, i) => {
      const x =
        members.length === 1 ? width / 2 : padX + ((width - padX * 2) * i) / (members.length - 1);
      out.set(d.id, { x, y });
    });
  }
  // Stable grid fallback for disconnected nodes.
  const cols = Math.max(1, Math.ceil(Math.sqrt(orphans.length)));
  orphans.forEach((d, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    out.set(d.id, {
      x: padX + col * ((width - padX * 2) / Math.max(1, cols - 1 || 1)),
      y: height - 60 - row * 90,
    });
  });
  return out;
}

// ── Formatting ──────────────────────────────────────────────────────────────

export function formatBytes(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = value / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${v.toFixed(1)} ${units[u]}`;
}

export function formatDuration(secs: number | null | undefined): string {
  if (secs == null || !Number.isFinite(secs)) return "—";
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "unknown";
  const diff = now - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "unknown";
  if (diff < 10_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ── Realtime event processing ───────────────────────────────────────────────
// Apply a structured network push to cached topology without refetching.
// Returns null when the event does not map onto known nodes/edges.

export interface NetworkPush {
  type: "network.device.status" | "network.connection.updated" | "network.device.latency";
  deviceId?: string;
  connectionId?: string;
  status?: string;
  latencyMs?: number | null;
  connectionType?: string;
}

const VALID_DEVICE_STATUSES: NetworkDeviceStatus[] = ["online", "degraded", "offline", "unknown"];
const VALID_CONN_STATUSES: NetworkConnectionStatus[] = [
  "active",
  "degraded",
  "inactive",
  "unknown",
];
const VALID_CONN_TYPES: NetworkConnectionType[] = ["p2p", "direct", "relay", "routed", "unknown"];

export function applyNetworkPush(
  devices: NetworkDevice[],
  connections: NetworkConnection[],
  push: NetworkPush,
): { devices: NetworkDevice[]; connections: NetworkConnection[] } | null {
  if (push.type === "network.device.status" && push.deviceId && push.status) {
    if (!VALID_DEVICE_STATUSES.includes(push.status as NetworkDeviceStatus)) return null;
    let touched = false;
    const next = devices.map((d) => {
      if (d.id !== push.deviceId) return d;
      touched = true;
      return {
        ...d,
        status: push.status as NetworkDeviceStatus,
        lastSeen: new Date().toISOString(),
      };
    });
    return touched ? { devices: next, connections } : null;
  }
  if (push.type === "network.device.latency" && push.deviceId && push.latencyMs != null) {
    let touched = false;
    const next = devices.map((d) => {
      if (d.id !== push.deviceId) return d;
      touched = true;
      const latencyMs = push.latencyMs as number;
      const status: NetworkDeviceStatus =
        latencyMs >= 150 || d.status === "offline"
          ? d.status === "offline"
            ? d.status
            : "degraded"
          : d.status;
      return { ...d, latencyMs, status };
    });
    return touched ? { devices: next, connections } : null;
  }
  if (push.type === "network.connection.updated" && push.connectionId) {
    let touched = false;
    const next = connections.map((c) => {
      if (c.id !== push.connectionId) return c;
      touched = true;
      return {
        ...c,
        status:
          push.status && VALID_CONN_STATUSES.includes(push.status as NetworkConnectionStatus)
            ? (push.status as NetworkConnectionStatus)
            : c.status,
        type:
          push.connectionType &&
          VALID_CONN_TYPES.includes(push.connectionType as NetworkConnectionType)
            ? (push.connectionType as NetworkConnectionType)
            : c.type,
        latencyMs: push.latencyMs ?? c.latencyMs,
        lastActivity: new Date().toISOString(),
      };
    });
    return touched ? { devices, connections: next } : null;
  }
  return null;
}

/** Coerce a raw SSE InfraEvent payload into a structured push (null when unrelated). */
export function coerceNetworkPush(evt: InfraEvent): NetworkPush | null {
  if (evt.category !== "network") return null;
  try {
    const data = JSON.parse(evt.message) as Partial<NetworkPush> & { type?: string };
    if (
      data.type === "network.device.status" ||
      data.type === "network.connection.updated" ||
      data.type === "network.device.latency"
    ) {
      return data as NetworkPush;
    }
  } catch {
    /* plain-text network message — feed only */
  }
  return null;
}

export function toFeedEntries(events: InfraEvent[]): LiveFeedEntry[] {
  const out: LiveFeedEntry[] = [];
  for (const e of events) {
    if (e.category !== "network") continue;
    out.push({ id: e.id, ts: e.ts, title: e.message, severity: e.severity, deviceId: e.resource });
  }
  return out;
}
