import { Hono } from "hono";
import { dockerAction, getDockerSummary } from "../adapters/docker.js";
import { bus } from "../realtime/bus.js";

const docker = new Hono();

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
