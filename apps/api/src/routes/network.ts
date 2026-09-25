import { Hono } from "hono";
import { z } from "zod";
import { getNetworkSummary, pingHost } from "../services/network.js";
import { buildLiveTopology, summarizeTopology } from "../services/networkTopology.js";
import { getTailscaleDevices } from "../adapters/tailscale.js";
import { bus } from "../realtime/bus.js";

const router = new Hono();

const idParam = z.object({ id: z.string().min(1).max(200) });
const eventsQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });

// Legacy summary endpoint (kept for the existing /network page).
router.get("/", async (c) => {
  const [summary, tail] = await Promise.all([getNetworkSummary(), getTailscaleDevices()]);
  // Honest topology: only nodes backed by real data.
  const nodes = [
    { id: "internet", label: "Internet", kind: "wan", online: summary.status === "connected" },
    { id: "lan", label: "LAN", kind: "lan", online: true },
    ...(tail.status === "connected"
      ? tail.devices
          .slice(0, 50)
          .map((d) => ({ id: d.id, label: d.name, kind: "device", online: d.online }))
      : []),
  ];
  return c.json({
    summary,
    topology: { nodes, links: [] },
    tailscaleStatus: tail.status,
    updatedAt: summary.updatedAt,
  });
});

// ── Live network domain ─────────────────────────────────────────────────────

router.get("/topology", async (c) => {
  const built = await buildLiveTopology();
  const summary = summarizeTopology(built.devices, built.connections);
  return c.json({
    devices: built.devices,
    connections: built.connections,
    summary,
    tailscaleStatus: built.tailscaleStatus,
    updatedAt: new Date().toISOString(),
  });
});

router.get("/devices", async (c) => {
  const built = await buildLiveTopology();
  return c.json({ devices: built.devices, updatedAt: new Date().toISOString() });
});

router.get("/connections", async (c) => {
  const built = await buildLiveTopology();
  return c.json({ connections: built.connections, updatedAt: new Date().toISOString() });
});

router.get("/devices/:id", async (c) => {
  const parsed = idParam.safeParse({ id: c.req.param("id") });
  if (!parsed.success) return c.json({ error: "invalid_device_id" }, 400);
  const built = await buildLiveTopology();
  const device = built.devices.find((d) => d.id === parsed.data.id);
  if (!device) return c.json({ error: "device_not_found" }, 404);
  const connections = built.connections.filter(
    (x) => x.sourceId === device.id || x.targetId === device.id,
  );
  return c.json({ device, connections, updatedAt: new Date().toISOString() });
});

router.get("/connections/:id", async (c) => {
  const parsed = idParam.safeParse({ id: c.req.param("id") });
  if (!parsed.success) return c.json({ error: "invalid_connection_id" }, 400);
  const built = await buildLiveTopology();
  const connection = built.connections.find((x) => x.id === parsed.data.id);
  if (!connection) return c.json({ error: "connection_not_found" }, 404);
  return c.json({ connection, updatedAt: new Date().toISOString() });
});

router.get("/events", (c) => {
  const parsed = eventsQuery.safeParse(Object.fromEntries(new URL(c.req.url).searchParams.entries()));
  const limit = parsed.success ? parsed.data.limit : 50;
  const events = bus.recent(200).filter((e) => e.category === "network").slice(0, limit);
  return c.json({ events, updatedAt: new Date().toISOString() });
});

router.post("/ping", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { host?: string };
  const target = typeof body?.host === "string" && body.host.trim() ? body.host.trim() : "1.1.1.1";
  const result = await pingHost(target);
  bus.publish({
    category: "network",
    resource: result.host,
    message: result.ok
      ? `Probe to ${result.host} succeeded (${result.latencyMs} ms)`
      : `Probe to ${result.host} failed (unreachable)`,
    severity: result.ok ? "info" : "warning",
  });
  return c.json(result);
});

export default router;
