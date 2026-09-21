import type { MiddlewareHandler } from "hono";

const hits = new Map<string, { count: number; resetAt: number }>();

/** Tiny in-memory rate limiter (per-IP, per-minute). */
export function rateLimit(maxPerMinute = 300): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "local";
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || entry.resetAt < now) {
      hits.set(ip, { count: 1, resetAt: now + 60_000 });
      await next();
      return;
    }
    entry.count++;
    if (entry.count > maxPerMinute) {
      return c.json({ error: "rate_limited" }, 429);
    }
    await next();
  };
}

/** Secure defaults ( §39 ). */
export function secureHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "no-referrer");
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  };
}
