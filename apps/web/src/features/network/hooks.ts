import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { keys } from "../../lib/query";
import { useEventsStream } from "../../lib/sse";
import type { LiveTopology, LiveFeedEntry, LiveState } from "./types";
import { toFeedEntry } from "./types";
import { applyNetworkPush, coerceNetworkPush } from "./utils";

interface RealtimeResult {
  liveState: LiveState;
  feed: LiveFeedEntry[];
  setFeed: React.Dispatch<React.SetStateAction<LiveFeedEntry[]>>;
}

/**
 * Realtime bridge: SSE drives the LIVE badge, throttled query invalidation,
 * surgical cache updates for structured pushes, and the event feed.
 * `paused` reflects user pause (badge shows PAUSED, stream stays connected).
 */
export function useNetworkRealtime(paused: boolean): RealtimeResult {
  const qc = useQueryClient();
  const { connected, lastEvent } = useEventsStream(true);
  const [feed, setFeed] = React.useState<LiveFeedEntry[]>([]);
  const lastInvalidated = React.useRef(0);
  const [streamDown, setStreamDown] = React.useState(false);

  React.useEffect(() => {
    if (!connected) {
      const t = setTimeout(() => setStreamDown(true), 8000);
      return () => clearTimeout(t);
    }
    setStreamDown(false);
    return undefined;
  }, [connected]);

  React.useEffect(() => {
    if (!lastEvent || paused) return;
    const entry = toFeedEntry(lastEvent);
    if (entry) setFeed((prev) => [entry, ...prev].slice(0, 100));

    const push = coerceNetworkPush(lastEvent);
    if (push) {
      qc.setQueryData<LiveTopology>(keys.networkLive, (old) => {
        if (!old) return old;
        const merged = applyNetworkPush(old.devices, old.connections, push);
        return merged ? { ...old, ...merged } : old;
      });
      return;
    }
    // Unstructured but network-relevant → throttled refetch (≥5s between).
    if (lastEvent.category === "network" || lastEvent.category === "service") {
      const now = Date.now();
      if (now - lastInvalidated.current > 5000) {
        lastInvalidated.current = now;
        void qc.invalidateQueries({ queryKey: keys.networkLive });
      }
    }
  }, [lastEvent, paused, qc]);

  let liveState: LiveState;
  if (paused) liveState = "paused";
  else if (connected) liveState = "live";
  else if (streamDown) liveState = "offline";
  else liveState = "reconnecting";

  return { liveState, feed, setFeed };
}
