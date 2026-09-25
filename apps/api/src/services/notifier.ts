/**
 * Outbound alert delivery ( §reliability ).
 * Disabled unless ALERT_WEBHOOK_URL is set server-side. Best-effort and
 * fire-and-forget: delivery failures are swallowed, never thrown, so alert
 * creation and health checks can never break because a webhook is down.
 */

export interface AlertPayload {
  title: string;
  text: string;
  severity: string;
  resource: string | null;
  url?: string | null;
  at: string;
}

/** Pure payload builder — the unit-tested part of delivery. */
export function buildAlertPayload(input: {
  title: string;
  severity: string;
  resource?: string | null;
  detail?: string | null;
  url?: string | null;
  at?: string;
}): AlertPayload {
  const lines = [input.title];
  if (input.detail) lines.push(input.detail);
  if (input.url) lines.push(input.url);
  const text = lines.join("\n");
  return {
    title: input.title,
    text,
    severity: input.severity,
    resource: input.resource ?? null,
    url: input.url ?? null,
    at: input.at ?? new Date().toISOString(),
  };
}

function endpoint(): string | null {
  const raw = process.env.ALERT_WEBHOOK_URL ?? "";
  return raw.trim() ? raw.trim() : null;
}

/** Fire-and-forget POST. Never throws, never awaits. */
export function notifyAlert(input: {
  title: string;
  severity: string;
  resource?: string | null;
  detail?: string | null;
  url?: string | null;
}): void {
  const target = endpoint();
  if (!target) return;
  const payload = buildAlertPayload(input);
  // `content` alias keeps Discord-style receivers working with one payload.
  void fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, content: payload.text }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => {
    /* delivery is best-effort */
  });
}

/** Down/recovered transitions from the service checker. */
export function notifyServiceTransition(input: {
  serviceName: string;
  url: string | null;
  status: string;
  previousStatus: string;
  message: string;
}): void {
  notifyAlert({
    title: input.message,
    severity: input.status === "down" ? "critical" : "info",
    resource: input.serviceName,
    detail: `status: ${input.previousStatus} → ${input.status}`,
    url: input.url,
  });
}
