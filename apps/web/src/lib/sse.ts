import type { InfraEvent } from "@opsora/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { sseUrl } from "./api";
import { keys } from "./query";

/** SSE subscription ( §17 ). Invalidates affected queries on push; polls otherwise. */
export function useEventsStream(enabled = true): {
  connected: boolean;
  lastEvent: InfraEvent | null;
} {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<InfraEvent | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const src = new EventSource(sseUrl("/api/events/stream"));
    src.onopen = () => setConnected(true);
    src.onerror = () => setConnected(false);
    const onInfra = (e: MessageEvent): void => {
      try {
        const evt = JSON.parse(e.data) as InfraEvent;
        setLastEvent(evt);
        if (evt.category === "alert") void qc.invalidateQueries({ queryKey: keys.alerts() });
        if (evt.category === "service") void qc.invalidateQueries({ queryKey: keys.services });
        if (evt.category === "docker") void qc.invalidateQueries({ queryKey: keys.docker });
        void qc.invalidateQueries({ queryKey: keys.events });
        void qc.invalidateQueries({ queryKey: keys.activity });
        void qc.invalidateQueries({ queryKey: keys.overview });
      } catch {
        /* ignore malformed pushes */
      }
    };
    src.addEventListener("infra-event", onInfra as EventListener);
    return () => {
      src.removeEventListener("infra-event", onInfra as EventListener);
      src.close();
      setConnected(false);
    };
  }, [enabled, qc]);

  return { connected, lastEvent };
}
