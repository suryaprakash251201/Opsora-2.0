import { dockerAdapter } from "./docker.js";
import { githubAdapter } from "./github.js";
import { piholeAdapter } from "./pihole.js";
import { s3Adapter } from "./s3.js";
import { tailscaleAdapter } from "./tailscale.js";
import { registry } from "./types.js";

let initialised = false;

export function initAdapters(): void {
  if (initialised) return;
  registry.register(dockerAdapter);
  registry.register(piholeAdapter);
  registry.register(githubAdapter);
  registry.register(tailscaleAdapter);
  registry.register({
    id: "linux_agent",
    name: "Linux Agent",
    type: "linux_agent",
    capabilities: ["host.metrics", "host.processes"],
    async healthCheck() {
      return { status: "connected", error: null };
    },
  });
  registry.register(s3Adapter);
  initialised = true;
}
