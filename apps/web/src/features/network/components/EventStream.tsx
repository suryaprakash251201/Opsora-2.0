import * as React from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../../lib/cn";
import type { LiveFeedEntry } from "../types";
import { timeAgo } from "../utils";

const SEV_CLS: Record<LiveFeedEntry["severity"], string> = {
  info: "bg-emerald-500 dark:bg-emerald-400",
  warning: "bg-amber-500 dark:bg-amber-400",
  critical: "bg-rose-500 dark:bg-rose-400",
};

export function EventStream({
  entries,
  open,
  onToggle,
  filter,
}: {
  entries: LiveFeedEntry[];
  open: boolean;
  onToggle: () => void;
  filter: string;
}): React.JSX.Element {
  const [severity, setSeverity] = React.useState<"all" | LiveFeedEntry["severity"]>("all");
  const visible = entries.filter((e) => {
    if (severity !== "all" && e.severity !== severity) return false;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      if (!`${e.title} ${e.deviceId ?? ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <section
      data-testid="event-stream"
      aria-label="Connection activity"
      className="overflow-hidden rounded-2xl border border-edge/80 bg-panel/90 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex items-center gap-2 text-left"
        >
          <Activity className="size-3.5 text-ink-3" aria-hidden />
          <span className="text-xs font-semibold text-ink">Activity</span>
          <span className="num rounded bg-void px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
            {visible.length}
          </span>
          {open ? (
            <ChevronDown className="size-3.5 text-ink-3" aria-hidden />
          ) : (
            <ChevronUp className="size-3.5 text-ink-3" aria-hidden />
          )}
        </button>
        {open ? (
          <div className="flex items-center gap-1" role="group" aria-label="Severity filter">
            {(["all", "info", "warning", "critical"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                aria-pressed={severity === s}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[11px] capitalize transition-colors",
                  severity === s ? "bg-hover text-ink" : "text-ink-3 hover:text-ink-2",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {open ? (
        <ul className="max-h-44 divide-y divide-edge/50 overflow-y-auto border-t border-edge/60">
          {visible.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-ink-3">
              No network events yet — probes, status changes, and P2P transitions appear here.
            </li>
          ) : (
            visible.slice(0, 40).map((e) => (
              <li key={e.id} className="flex items-start gap-2 px-3 py-1.5 text-xs">
                <span
                  className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", SEV_CLS[e.severity])}
                  aria-hidden
                />
                <span className="sr-only">{e.severity} event: </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink-2">{e.title}</p>
                  {e.deviceId ? (
                    <p className="truncate font-mono text-[10px] text-ink-3">{e.deviceId}</p>
                  ) : null}
                </div>
                <span className="num shrink-0 text-[10px] text-ink-3">{timeAgo(e.ts)}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </section>
  );
}
