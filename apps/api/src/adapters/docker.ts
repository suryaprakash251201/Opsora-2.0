import type { ConnectionStatus, Container, DockerSummary } from "@opsora/types";
import http from "node:http";
import { existsSync } from "node:fs";
import type { IntegrationAdapter } from "./types.js";

const SOCKET = process.env.DOCKER_SOCKET ?? "/var/run/docker.sock";

function socketGet<T>(socketPath: string, apiPath: string, timeoutMs = 4_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath, path: apiPath, method: "GET" }, (res) => {
      let body = "";
      res.on("data", (c: Buffer) => (body += c.toString()));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`docker api ${res.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(body || "null") as T);
        } catch (e) {
          reject(e instanceof Error ? e : new Error("invalid docker json"));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("docker socket timeout"));
    });
    req.end();
  });
}

interface DockerPsItem {
  Id: string;
  Names?: string[];
  Image?: string;
  State?: string;
  Status?: string;
  Ports?: { PublicPort?: number; PrivatePort?: number; Type?: string }[];
}

function normalise(items: DockerPsItem[]): Container[] {
  return items.map((c) => {
    const state = (c.State ?? "unknown").toLowerCase();
    const mapped =
      state === "running"
        ? "running"
        : state === "exited"
          ? "exited"
          : state === "paused"
            ? "paused"
            : state === "restarting"
              ? "restarting"
              : state === "dead"
                ? "dead"
                : state === "created"
                  ? "created"
                  : state === "removing"
                    ? "removing"
                    : "unknown";
    return {
      id: c.Id.slice(0, 12),
      name: (c.Names?.[0] ?? c.Id.slice(0, 12)).replace(/^\//, ""),
      image: c.Image ?? "unknown",
      state: mapped,
      status: c.Status ?? null,
      health: "unknown",
      uptimeSeconds: null,
      cpuPercent: null,
      memBytes: null,
      memLimitBytes: null,
      restartCount: 0,
      ports: (c.Ports ?? []).map((p) =>
        p.PublicPort
          ? `${p.PublicPort}->${p.PrivatePort ?? ""}/${p.Type ?? "tcp"}`
          : `${p.PrivatePort ?? ""}/${p.Type ?? "tcp"}`,
      ),
    };
  });
}

export async function getDockerSummary(): Promise<DockerSummary> {
  const updatedAt = new Date().toISOString();
  if (!existsSync(SOCKET)) {
    return {
      status: "not_connected",
      running: 0,
      stopped: 0,
      unhealthy: 0,
      containers: [],
      error: `Docker socket not found at ${SOCKET}`,
      updatedAt,
    };
  }
  try {
    const items = await socketGet<DockerPsItem[]>(SOCKET, "/v1.43/containers/json?all=1");
    const containers = normalise(items);
    const running = containers.filter((c) => c.state === "running").length;
    return {
      status: "connected",
      running,
      stopped: containers.length - running,
      unhealthy: 0,
      containers,
      error: null,
      updatedAt,
    };
  } catch (err) {
    return {
      status: "unavailable",
      running: 0,
      stopped: 0,
      unhealthy: 0,
      containers: [],
      error: err instanceof Error ? err.message : "docker unavailable",
      updatedAt,
    };
  }
}

export const dockerAdapter: IntegrationAdapter = {
  id: "docker",
  name: "Docker Engine",
  type: "docker",
  capabilities: ["containers.list", "containers.inspect", "containers.logs"],
  async healthCheck(): Promise<{ status: ConnectionStatus; error?: string | null }> {
    const s = await getDockerSummary();
    return { status: s.status, error: s.error };
  },
};

async function socketPost(socketPath: string, apiPath: string, timeoutMs = 8_000): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = http.request({ socketPath, path: apiPath, method: "POST" }, (res) => {
      res.resume();
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode !== 304) {
          reject(new Error(`docker action failed: ${res.statusCode}`));
        } else resolve();
      });
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error("docker action timeout")));
    req.end();
  });
}

export async function dockerAction(
  id: string,
  action: "start" | "stop" | "restart",
): Promise<void> {
  await socketPost(SOCKET, `/v1.43/containers/${encodeURIComponent(id)}/${action}`);
}
