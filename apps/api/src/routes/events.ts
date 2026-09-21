import { Hono } from "hono";
import { bus } from "../realtime/bus.js";

const router = new Hono();

// SSE stream ( §17 ): alerts, docker events, service state changes, activity.
router.get("/stream", () => {
  let unsub: (() => void) | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown): void => {
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* client gone */
        }
      };
      send("hello", { ts: new Date().toISOString() });
      unsub = bus.subscribe((e) => send("infra-event", e));
      timer = setInterval(() => send("ping", { ts: new Date().toISOString() }), 25_000);
    },
    cancel() {
      if (timer) clearInterval(timer);
      unsub?.();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

router.get("/", (c) => {
  const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") ?? 50)));
  return c.json({
    events: bus.recent(Number.isFinite(limit) ? limit : 50),
    updatedAt: new Date().toISOString(),
  });
});

export default router;
