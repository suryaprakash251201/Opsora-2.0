import { Hono } from "hono";
import { getTailscaleDevices } from "../adapters/tailscale.js";
import { getDb } from "../db/client.js";
import { devices } from "../db/schema.js";

const router = new Hono();

router.get("/", async (c) => {
  const q = (c.req.query("q") ?? "").toLowerCase();
  const status = c.req.query("status") ?? "all";
  const tail = await getTailscaleDevices();
  const db = getDb();
  const staticDevices = db
    .select()
    .from(devices)
    .all()
    .map((d) => ({
      id: d.id,
      name: d.name,
      ip: d.ip,
      mac: d.mac,
      type: d.type,
      vendor: d.vendor,
      online: d.online,
      lastSeen: d.lastSeen,
      latencyMs: null as number | null,
      source: d.source as "static",
    }));
  let all = [...staticDevices, ...tail.devices];
  if (q) all = all.filter((d) => d.name.toLowerCase().includes(q) || d.ip.includes(q));
  if (status === "online") all = all.filter((d) => d.online);
  if (status === "offline") all = all.filter((d) => !d.online);
  return c.json({
    devices: all,
    tailscaleStatus: tail.status,
    updatedAt: new Date().toISOString(),
  });
});

export default router;
