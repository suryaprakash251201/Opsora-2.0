import { describe, expect, it } from "vitest";
import type { NetworkConnection, NetworkDevice } from "./types";
import {
  applyNetworkPush,
  autoLayout,
  coerceNetworkPush,
  deviceConnectionTypes,
  filterConnections,
  filterDevices,
  formatBytes,
  formatDuration,
  isP2PConnection,
  timeAgo,
} from "./utils";

function dev(id: string, extra: Partial<NetworkDevice> = {}): NetworkDevice {
  return {
    id,
    hostname: id,
    displayName: id,
    type: "unknown",
    status: "online",
    ipAddresses: ["10.0.0.1"],
    primaryIp: "10.0.0.1",
    os: "Ubuntu 24.04",
    platform: null,
    iface: "eth0",
    lastSeen: new Date().toISOString(),
    latencyMs: 8,
    packetLossPercent: 0,
    cpuPercent: null,
    memoryPercent: null,
    diskPercent: null,
    source: "static",
    ...extra,
  };
}

function link(id: string, sourceId: string, targetId: string, extra: Partial<NetworkConnection> = {}): NetworkConnection {
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

describe("device connection types", () => {
  it("collects types for a device across edges", () => {
    const conns = [link("c1", "a", "b", { type: "p2p" }), link("c2", "a", "c", { type: "relay" })];
    expect(deviceConnectionTypes("a", conns)).toEqual(new Set(["p2p", "relay"]));
    expect(deviceConnectionTypes("zzz", conns)).toEqual(new Set());
  });

  it("classifies p2p and direct as P2P", () => {
    expect(isP2PConnection({ type: "p2p" })).toBe(true);
    expect(isP2PConnection({ type: "direct" })).toBe(true);
    expect(isP2PConnection({ type: "relay" })).toBe(false);
    expect(isP2PConnection({ type: "unknown" })).toBe(false);
  });
});

describe("filterDevices", () => {
  const devices = [
    dev("srv", { type: "server", status: "online", hostname: "pms2" }),
    dev("lap", { type: "laptop", status: "online", hostname: "field-laptop", primaryIp: "100.64.0.2", ipAddresses: ["100.64.0.2"] }),
    dev("nas", { type: "server", status: "offline", hostname: "vault-nas" }),
    dev("cam", { type: "network", status: "degraded", hostname: "porch-cam" }),
    dev("ctr", { type: "container", status: "online", hostname: "docker-host" }),
  ];
  const conns = [link("c1", "srv", "lap", { type: "p2p" })];

  it("matches hostname, ip, os, type, and id", () => {
    expect(filterDevices(devices, conns, "pms2", "all")).toHaveLength(1);
    expect(filterDevices(devices, conns, "100.64.0.2", "all")).toHaveLength(1);
    expect(filterDevices(devices, conns, "ubuntu", "all")).toHaveLength(5);
    expect(filterDevices(devices, conns, "container", "all")).toHaveLength(1);
    expect(filterDevices(devices, conns, "nothing-here", "all")).toHaveLength(0);
  });

  it("filters by status", () => {
    expect(filterDevices(devices, conns, "", "online").map((d) => d.id).sort()).toEqual(["ctr", "lap", "srv"]);
    expect(filterDevices(devices, conns, "", "offline").map((d) => d.id)).toEqual(["nas"]);
    expect(filterDevices(devices, conns, "", "degraded").map((d) => d.id)).toEqual(["cam"]);
  });

  it("filters by role and connection kind", () => {
    expect(filterDevices(devices, conns, "", "servers").map((d) => d.id).sort()).toEqual(["nas", "srv"]);
    expect(filterDevices(devices, conns, "", "clients").map((d) => d.id)).toEqual(["lap"]);
    expect(filterDevices(devices, conns, "", "network").map((d) => d.id)).toEqual(["cam"]);
    expect(filterDevices(devices, conns, "", "containers").map((d) => d.id)).toEqual(["ctr"]);
    expect(filterDevices(devices, conns, "", "p2p").map((d) => d.id).sort()).toEqual(["lap", "srv"]);
    expect(filterDevices(devices, conns, "", "relay")).toHaveLength(0);
  });
});

describe("filterConnections", () => {
  const devices = [dev("a", { hostname: "alpha" }), dev("b", { hostname: "beta" })];
  const conns = [
    link("c1", "a", "b", { type: "p2p", latencyMs: 8 }),
    link("c2", "b", "a", { type: "relay" }),
  ];
  it("narrows by kind and free text", () => {
    expect(filterConnections(conns, devices, "", "p2p").map((c) => c.id)).toEqual(["c1"]);
    expect(filterConnections(conns, devices, "", "relay").map((c) => c.id)).toEqual(["c2"]);
    expect(filterConnections(conns, devices, "beta", "all")).toHaveLength(2);
  });
});

describe("autoLayout", () => {
  const devices = [
    dev("net", { type: "network" }),
    dev("gw", { type: "gateway" }),
    dev("srv", { type: "server" }),
    dev("lap", { type: "laptop" }),
    dev("ctr", { type: "container" }),
  ];
  const conns = [link("c1", "net", "gw"), link("c2", "gw", "srv"), link("c3", "srv", "lap"), link("c4", "srv", "ctr")];

  it("is deterministic and layers infrastructure above clients", () => {
    const a = autoLayout(devices, conns);
    const b = autoLayout(devices, conns);
    expect([...a.entries()]).toEqual([...b.entries()]);
    const y = (m: Map<string, { x: number; y: number }>, id: string): number => {
      const p = m.get(id);
      expect(p).toBeDefined();
      return (p as { x: number; y: number }).y;
    };
    expect(y(a, "net")).toBeLessThan(y(a, "gw"));
    expect(y(a, "gw")).toBeLessThan(y(a, "srv"));
    expect(y(a, "srv")).toBeLessThan(y(a, "lap"));
  });

  it("places disconnected nodes instead of dropping them", () => {
    const lone = [...devices, dev("orphan")];
    const pos = autoLayout(lone, conns);
    expect(pos.has("orphan")).toBe(true);
    expect(pos.size).toBe(lone.length);
  });
});

describe("applyNetworkPush", () => {
  const devices = [dev("a"), dev("b", { status: "offline" })];
  const conns = [link("c1", "a", "b", { type: "relay", status: "inactive" })];

  it("flips device status online→offline", () => {
    const out = applyNetworkPush(devices, conns, {
      type: "network.device.status",
      deviceId: "a",
      status: "offline",
    });
    expect(out?.devices.find((d) => d.id === "a")?.status).toBe("offline");
  });

  it("restores offline→online", () => {
    const out = applyNetworkPush(devices, conns, {
      type: "network.device.status",
      deviceId: "b",
      status: "online",
    });
    expect(out?.devices.find((d) => d.id === "b")?.status).toBe("online");
  });

  it("rejects unknown ids and invalid statuses", () => {
    expect(
      applyNetworkPush(devices, conns, { type: "network.device.status", deviceId: "nope", status: "online" }),
    ).toBeNull();
    expect(
      applyNetworkPush(devices, conns, { type: "network.device.status", deviceId: "a", status: "bogus" }),
    ).toBeNull();
  });

  it("updates latency and degrades on high RTT", () => {
    const out = applyNetworkPush(devices, conns, {
      type: "network.device.latency",
      deviceId: "a",
      latencyMs: 240,
    });
    const updated = out?.devices.find((d) => d.id === "a");
    expect(updated?.latencyMs).toBe(240);
    expect(updated?.status).toBe("degraded");
  });

  it("transitions relay→p2p on connection updates", () => {
    const out = applyNetworkPush(devices, conns, {
      type: "network.connection.updated",
      connectionId: "c1",
      status: "active",
      connectionType: "p2p",
      latencyMs: 9,
    });
    expect(out?.connections[0]).toMatchObject({ status: "active", type: "p2p", latencyMs: 9 });
  });
});

describe("coerceNetworkPush", () => {
  it("parses structured pushes and ignores plain text", () => {
    const structured = {
      id: "1",
      ts: new Date().toISOString(),
      category: "network",
      resource: "a",
      message: JSON.stringify({ type: "network.device.status", deviceId: "a", status: "offline" }),
      severity: "warning" as const,
    };
    expect(coerceNetworkPush(structured)).toMatchObject({ deviceId: "a", status: "offline" });
    expect(coerceNetworkPush({ ...structured, message: "pms2 came online" })).toBeNull();
    expect(coerceNetworkPush({ ...structured, category: "docker" })).toBeNull();
  });
});

describe("formatting", () => {
  it("formats bytes, durations, and relative time", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2_400_000)).toBe("2.3 MB");
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(300)).toBe("5m");
    expect(formatDuration(4 * 3600 + 12 * 60)).toBe("4h 12m");
    const now = Date.now();
    expect(timeAgo(new Date(now - 3000).toISOString(), now)).toBe("just now");
    expect(timeAgo(new Date(now - 90_000).toISOString(), now)).toBe("1m ago");
    expect(timeAgo(null)).toBe("unknown");
  });
});
