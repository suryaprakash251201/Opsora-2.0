import type { InfraEvent } from "@opsora/types";
import { randomUUID } from "node:crypto";

type Listener = (event: InfraEvent) => void;

class EventBus {
  private listeners = new Set<Listener>();
  private log: InfraEvent[] = [];
  private readonly max = 500;

  publish(input: Omit<InfraEvent, "id" | "ts"> & { ts?: string }): InfraEvent {
    const event: InfraEvent = {
      id: randomUUID(),
      ts: input.ts ?? new Date().toISOString(),
      category: input.category,
      resource: input.resource ?? null,
      message: input.message,
      severity: input.severity ?? "info",
    };
    this.log.push(event);
    if (this.log.length > this.max) this.log.splice(0, this.log.length - this.max);
    for (const l of this.listeners) {
      try {
        l(event);
      } catch {
        /* listener errors must not break publishers */
      }
    }
    return event;
  }

  recent(limit = 100): InfraEvent[] {
    return this.log.slice(-limit).reverse();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

export const bus = new EventBus();
