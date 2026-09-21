import { Hono } from "hono";
import { getNetworkSummary } from "../services/network.js";
import { getTailscaleDevices } from "../adapters/tailscale.js";

const router = new Hono();

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

export default router;
