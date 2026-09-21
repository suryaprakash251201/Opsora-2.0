import type { ConnectionStatus, IntegrationType } from "@opsora/types";

/**
 * Common adapter abstraction ( §10 ).
 * Every integration normalises to Opsora domain models and reports
 * honest connection status — never fabricated data.
 */
export interface IntegrationAdapter {
  readonly id: string;
  readonly name: string;
  readonly type: IntegrationType;
  readonly capabilities: string[];
  healthCheck(): Promise<{ status: ConnectionStatus; error?: string | null }>;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
}

export interface AdapterRegistry {
  register(adapter: IntegrationAdapter): void;
  get(id: string): IntegrationAdapter | undefined;
  list(): IntegrationAdapter[];
}

class Registry implements AdapterRegistry {
  private map = new Map<string, IntegrationAdapter>();
  register(adapter: IntegrationAdapter): void {
    this.map.set(adapter.id, adapter);
  }
  get(id: string): IntegrationAdapter | undefined {
    return this.map.get(id);
  }
  list(): IntegrationAdapter[] {
    return [...this.map.values()];
  }
}

export const registry: AdapterRegistry = new Registry();

export function redactSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const secretKeys = [
    "token",
    "apiToken",
    "api_token",
    "password",
    "secret",
    "pat",
    "accessKey",
    "secretKey",
    "secretAccessKey",
    "privateKey",
    "auth",
  ];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    if (secretKeys.some((s) => lower.includes(s.toLowerCase()))) {
      out[k] = v ? "•••redacted•••" : null;
    } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redactSecrets(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}
