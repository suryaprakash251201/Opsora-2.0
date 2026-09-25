import type { LiveTopology, NetworkConnection, NetworkDevice } from "./types";

/**
 * Development-only mock topology. Never used in production builds unless
 * explicitly enabled via `?mock=1` or VITE_NETWORK_MOCK=1 — the page always
 * badges mock data as "Mock".
 */
function device(
  id: string,
  hostname: string,
  extra: Partial<NetworkDevice> = {},
): NetworkDevice {
  return {
    id,
    hostname,
    displayName: hostname,
    type: "unknown",
    status: "online",
    ipAddresses: [],
    primaryIp: null,
    os: null,
    platform: null,
    iface: "eth0",
    lastSeen: new Date().toISOString(),
    latencyMs: null,
    packetLossPercent: null,
    cpuPercent: null,
    memoryPercent: null,
    diskPercent: null,
    source: "static",
    ...extra,
  };
}

function conn(
  id: string,
  sourceId: string,
  targetId: string,
  extra: Partial<NetworkConnection> = {},
): NetworkConnection {
  return {
    id,
    sourceId,
    targetId,
    status: "active",
    type: "routed",
    latencyMs: null,
    packetLossPercent: null,
    bytesSent: null,
    bytesReceived: null,
    durationSecs: null,
    iface: null,
    localEndpoint: null,
    remoteEndpoint: null,
    lastActivity: new Date().toISOString(),
    ...extra,
  };
}

export function buildMockTopology(): LiveTopology {
  const now = Date.now();
  const ago = (mins: number): string => new Date(now - mins * 60_000).toISOString();
  const devices: NetworkDevice[] = [
    device("mock-internet", "internet", {
      displayName: "Internet",
      type: "network",
      source: "static",
      latencyMs: 12,
    }),
    device("mock-gateway", "edge-router", {
      displayName: "Edge Router",
      type: "router",
      source: "static",
      primaryIp: "10.10.0.1",
      ipAddresses: ["10.10.0.1"],
      latencyMs: 2,
    }),
    device("mock-pms2", "pms2", {
      displayName: "pms2",
      type: "server",
      os: "Ubuntu 24.04",
      platform: "linux/x86_64",
      primaryIp: "10.10.10.12",
      ipAddresses: ["10.10.10.12", "fd7a:115c::12"],
      latencyMs: 8,
      packetLossPercent: 0,
      cpuPercent: 12,
      memoryPercent: 48,
      diskPercent: 63,
      lastSeen: ago(0),
      source: "agent",
    }),
    device("mock-laptop", "field-laptop", {
      displayName: "Field Laptop",
      type: "laptop",
      os: "macOS 15",
      platform: "darwin/arm64",
      primaryIp: "100.64.10.21",
      ipAddresses: ["100.64.10.21"],
      latencyMs: 8,
      packetLossPercent: 0,
      lastSeen: ago(0),
      source: "tailscale",
    }),
    device("mock-desktop", "studio-desktop", {
      displayName: "Studio Desktop",
      type: "desktop",
      os: "Windows 11",
      primaryIp: "10.10.10.30",
      ipAddresses: ["10.10.10.30"],
      latencyMs: 3,
      lastSeen: ago(1),
      source: "discovery",
    }),
    device("mock-phone", "pixel-8", {
      displayName: "Pixel 8",
      type: "mobile",
      os: "Android 15",
      primaryIp: "100.64.10.44",
      ipAddresses: ["100.64.10.44"],
      latencyMs: 42,
      packetLossPercent: 0.4,
      lastSeen: ago(0),
      source: "tailscale",
    }),
    device("mock-nas", "vault-nas", {
      displayName: "Vault NAS",
      type: "server",
      os: "Synology DSM",
      primaryIp: "10.10.10.50",
      ipAddresses: ["10.10.10.50"],
      status: "offline",
      lastSeen: ago(182),
      source: "static",
    }),
    device("mock-cam", "porch-cam", {
      displayName: "Porch Cam",
      type: "network",
      os: null,
      primaryIp: "10.10.20.8",
      ipAddresses: ["10.10.20.8"],
      status: "degraded",
      latencyMs: 210,
      packetLossPercent: 3.1,
      lastSeen: ago(2),
      source: "discovery",
    }),
    device("mock-docker", "docker-host-01", {
      displayName: "docker-host-01",
      type: "container",
      os: "Ubuntu 24.04",
      primaryIp: "172.18.0.2",
      ipAddresses: ["172.18.0.2"],
      latencyMs: 1,
      lastSeen: ago(0),
      source: "docker",
    }),
  ];
  const connections: NetworkConnection[] = [
    conn("mock-c1", "mock-internet", "mock-gateway", { latencyMs: 12 }),
    conn("mock-c2", "mock-gateway", "mock-pms2", { type: "direct", latencyMs: 2, iface: "eth0" }),
    conn("mock-c3", "mock-pms2", "mock-laptop", {
      type: "p2p",
      latencyMs: 8,
      packetLossPercent: 0,
      bytesSent: 412_000_000,
      bytesReceived: 1_240_000_000,
      durationSecs: 4 * 3600 + 12 * 60,
      iface: "tailscale0",
      localEndpoint: "10.10.10.12:41641",
      remoteEndpoint: "100.64.10.21:41641",
      lastActivity: ago(0),
    }),
    conn("mock-c4", "mock-gateway", "mock-desktop", { latencyMs: 3, iface: "eth0" }),
    conn("mock-c5", "mock-pms2", "mock-phone", {
      type: "relay",
      latencyMs: 42,
      packetLossPercent: 0.4,
      bytesSent: 88_000_000,
      bytesReceived: 210_000_000,
      durationSecs: 3600 + 5 * 60,
      iface: "tailscale0",
      lastActivity: ago(1),
    }),
    conn("mock-c6", "mock-gateway", "mock-nas", { status: "inactive", type: "routed" }),
    conn("mock-c7", "mock-gateway", "mock-cam", {
      status: "degraded",
      latencyMs: 210,
      packetLossPercent: 3.1,
    }),
    conn("mock-c8", "mock-pms2", "mock-docker", { type: "direct", latencyMs: 1, iface: "docker0" }),
    conn("mock-c9", "mock-laptop", "mock-desktop", {
      type: "p2p",
      latencyMs: 11,
      lastActivity: ago(4),
    }),
  ];
  const online = devices.filter((d) => d.status === "online").length;
  return {
    devices,
    connections,
    summary: {
      total: devices.length,
      online,
      degraded: devices.filter((d) => d.status === "degraded").length,
      offline: devices.filter((d) => d.status === "offline").length,
      unknown: 0,
      connectionsTotal: connections.length,
      connectionsActive: connections.filter((c) => c.status === "active").length,
      p2pCount: connections.filter((c) => c.type === "p2p" || c.type === "direct").length,
      relayCount: connections.filter((c) => c.type === "relay").length,
      avgLatencyMs: 24,
      packetLossPercent: 0.2,
    },
    tailscaleStatus: "connected",
    updatedAt: new Date().toISOString(),
  };
}
