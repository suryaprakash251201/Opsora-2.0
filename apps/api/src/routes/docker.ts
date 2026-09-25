import { Hono } from "hono";
import {
  clampTail,
  dockerAction,
  getContainerLogs,
  getDockerSummary,
} from "../adapters/docker.js";
import { bus } from "../realtime/bus.js";

const docker = new Hono();

const LOG_ID_RE = /^[A-Za-z0-9_.-]{1,128}$/;

// Real container logs — honest 4xx/5xx when the daemon or container is
// unavailable, never fabricated output (data-honesty rule).
docker.get("/containers/:id/logs", async (c) => {
  const id = c.req.param("id");
  if (!id || !LOG_ID_RE.test(id)) {
    return c.json({ error: "invalid_id" }, 400);
  }
  const tail = clampTail(c.req.query("tail"));
  try {
    const logs = await getContainerLogs(id, tail);
    return c.json({ id, logs, tail, updatedAt: new Date().toISOString() });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const message = err instanceof Error ? err.message : "failed";
    if (code === "not_connected") {
      return c.json({ error: "docker_not_connected", message }, 503);
    }
    if (code === "not_found") {
      return c.json({ error: "container_not_found", message }, 404);
    }
    return c.json({ error: "docker_unavailable", message }, 502);
  }
});

docker.get("/containers", async (c) => {
  return c.json(await getDockerSummary());
});

docker.get("/summary", async (c) => {
  const s = await getDockerSummary();
  return c.json({
    status: s.status,
    running: s.running,
    stopped: s.stopped,
    unhealthy: s.unhealthy,
    updatedAt: s.updatedAt,
    error: s.error,
  });
});

// Controlled actions only — never arbitrary commands ( §11, §39 ).
docker.post("/containers/:id/:action", async (c) => {
  const id = c.req.param("id");
  const action = c.req.param("action");
  if (action !== "start" && action !== "stop" && action !== "restart") {
    return c.json({ error: "unsupported_action" }, 400);
  }
  const confirm = c.req.header("x-confirm");
  if (confirm !== "true") {
    return c.json(
      { error: "confirmation_required", message: "Send X-Confirm: true to execute" },
      428,
    );
  }
  try {
    await dockerAction(id, action);
    bus.publish({
      category: "docker",
      resource: id,
      message: `Container ${id} ${action}`,
      severity: "info",
    });
    return c.json({ ok: true, id, action });
  } catch (err) {
    return c.json(
      { error: "action_failed", message: err instanceof Error ? err.message : "failed" },
      502,
    );
  }
});

export default docker;
