import type {
  InfraEvent,
  NetworkConnection,
  NetworkConnectionStatus,
  NetworkConnectionType,
  NetworkDevice,
  NetworkDeviceStatus,
  NetworkDeviceType,
} from "@opsora/types";

export type { NetworkConnection, NetworkConnectionStatus, NetworkConnectionType, NetworkDevice };
export type { NetworkDeviceStatus, NetworkDeviceType };

export interface TopologySummary {
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
}

export interface LiveTopology {
  devices: NetworkDevice[];
  connections: NetworkConnection[];
  summary: TopologySummary;
  tailscaleStatus: string;
  updatedAt: string;
}

export type LiveState = "live" | "paused" | "reconnecting" | "offline";

export type NetworkView = "topology" | "devices" | "connections";

export type DeviceFilter =
  | "all"
  | "online"
  | "offline"
  | "degraded"
  | "p2p"
  | "relay"
  | "servers"
  | "clients"
  | "network"
  | "containers";

export interface NodePosition {
  x: number;
  y: number;
}

export interface LiveFeedEntry {
  id: string;
  ts: string;
  title: string;
  detail?: string;
  severity: "info" | "warning" | "critical";
  deviceId?: string | null;
}

/** Normalize a bus InfraEvent into a feed entry (null when not network-relevant). */
export function toFeedEntry(evt: InfraEvent): LiveFeedEntry | null {
  if (evt.category !== "network") return null;
  return {
    id: evt.id,
    ts: evt.ts,
    title: evt.message,
    severity: evt.severity,
    deviceId: evt.resource,
  };
}
