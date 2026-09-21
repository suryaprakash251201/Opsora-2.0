import type { MiddlewareHandler } from "hono";
import type { ZodType } from "zod";

/**
 * Minimal zod validator for hono (avoids an extra dep for a small problem).
 * Parsed payloads are stashed on the context; read them with validBody/validQuery.
 */
export function zValidator<T extends ZodType>(
  target: "json" | "query",
  schema: T,
): MiddlewareHandler {
  return async (c, next) => {
    let raw: unknown;
    if (target === "json") {
      try {
        raw = await c.req.json();
      } catch {
        return c.json({ error: "invalid_json" }, 400);
      }
    } else {
      raw = Object.fromEntries(new URL(c.req.url).searchParams.entries());
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: "validation_error", message: "invalid input" }, 400);
    }
    const setter = c as unknown as { set: (k: string, v: unknown) => void };
    setter.set(target === "json" ? "validatedBody" : "validatedQuery", parsed.data);
    await next();
  };
}

type CtxLike = { get: (k: string) => unknown };

export function validBody<T>(c: unknown): T {
  return (c as unknown as CtxLike).get("validatedBody") as T;
}

export function validQuery<T>(c: unknown): T {
  return (c as unknown as CtxLike).get("validatedQuery") as T;
}
