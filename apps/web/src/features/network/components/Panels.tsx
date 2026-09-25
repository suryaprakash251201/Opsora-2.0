import * as React from "react";
import { Activity, ArrowDownUp, Clock, Network as NetworkGlyph, Server, Wifi } from "lucide-react";
import { cn } from "../../../lib/cn";
import { Input } from "../../../components/ui/input";
import type { DeviceFilter, LiveState, NetworkView, TopologySummary } from "../types";

// ── LIVE badge ──────────────────────────────────────────────────────────────

const LIVE_META: Record<LiveState, { label: string; cls: string; pulse: boolean }> = {
  live: {
    label: "Live",
    cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    pulse: true,
  },
  paused: {
    label: "Paused",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    pulse: false,
  },
  reconnecting: {
    label: "Reconnecting",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    pulse: true,
  },
  offline: {
    label: "Offline",
    cls: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    pulse: false,
  },
};

export function LiveBadge({
  state,
  deviceCount,
  mock,
}: {
  state: LiveState;
  deviceCount: number;
  mock?: boolean;
}): React.JSX.Element {
  const meta = LIVE_META[state];
  return (
    <span
      className="flex items-center gap-2"
      role="status"
      aria-label={`Stream ${meta.label}, ${deviceCount} devices`}
    >
      {mock ? (
        <span className="inline-flex items-center rounded-full border border-edge bg-void px-2 py-0.5 text-[11px] font-semibold text-ink-3">
          Mock data
        </span>
      ) : null}
      <span
        data-testid="live-badge"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
          meta.cls,
        )}
      >
        <span className="relative flex size-1.5">
          {meta.pulse ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
          ) : null}
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
        {meta.label.toUpperCase()}
      </span>
      <span className="text-xs text-ink-3">{deviceCount} devices</span>
    </span>
  );
}

// ── Summary strip ───────────────────────────────────────────────────────────

export function NetworkSummary({ summary }: { summary: TopologySummary }): React.JSX.Element {
  const items = [
    { icon: Server, label: "Devices", value: `${summary.total}`, sub: `${summary.online} online` },
    {
      icon: NetworkGlyph,
      label: "Connections",
      value: `${summary.connectionsTotal}`,
      sub: `${summary.connectionsActive} active`,
    },
    { icon: Wifi, label: "P2P", value: `${summary.p2pCount}`, sub: `${summary.relayCount} relay` },
    {
      icon: Clock,
      label: "Avg latency",
      value: summary.avgLatencyMs != null ? `${summary.avgLatencyMs} ms` : "—",
      sub: "measured",
    },
    {
      icon: Activity,
      label: "Packet loss",
      value: summary.packetLossPercent != null ? `${summary.packetLossPercent}%` : "—",
      sub: "active probe",
    },
    {
      icon: ArrowDownUp,
      label: "Health",
      value: `${summary.online}/${summary.total}`,
      sub: summary.offline > 0 ? `${summary.offline} offline` : "all reporting",
    },
  ];
  return (
    <dl
      data-testid="network-summary"
      aria-label="Live network summary"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-edge/80 bg-edge shadow-sm sm:grid-cols-3 lg:grid-cols-6"
    >
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-2.5 bg-panel px-3.5 py-3 transition-colors hover:bg-hover/50"
        >
          <it.icon className="size-4 shrink-0 text-ink-3" aria-hidden />
          <div className="min-w-0">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-ink-3">
              {it.label}
            </dt>
            <dd className="num text-sm font-semibold text-ink">
              {it.value} <span className="text-[11px] font-normal text-ink-3">{it.sub}</span>
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

// ── Filters + search + view tabs ────────────────────────────────────────────

const FILTERS: { id: DeviceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "offline", label: "Offline" },
  { id: "degraded", label: "Degraded" },
  { id: "p2p", label: "P2P" },
  { id: "relay", label: "Relay" },
  { id: "servers", label: "Servers" },
  { id: "clients", label: "Clients" },
  { id: "network", label: "Network" },
  { id: "containers", label: "Containers" },
];

export function FilterBar({
  query,
  filter,
  onQuery,
  onFilter,
  counts,
}: {
  query: string;
  filter: DeviceFilter;
  onQuery: (q: string) => void;
  onFilter: (f: DeviceFilter) => void;
  counts: Record<string, number>;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="w-full lg:max-w-64">
        <Input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search hostname, IP, OS, type…"
          aria-label="Search devices"
          className="h-8 text-xs"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Topology filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilter(f.id)}
            aria-pressed={filter === f.id}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium transition-colors",
              filter === f.id
                ? "border border-accent/30 bg-accent/15 text-accent-strong"
                : "border border-transparent text-ink-2 hover:bg-hover hover:text-ink",
            )}
          >
            {f.label}
            {counts[f.id] != null ? (
              <span className="num ml-1 text-[10px] opacity-70">{counts[f.id]}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ViewTabs({
  view,
  onView,
}: {
  view: NetworkView;
  onView: (v: NetworkView) => void;
}): React.JSX.Element {
  const tabs: { id: NetworkView; label: string }[] = [
    { id: "topology", label: "Topology" },
    { id: "devices", label: "Devices" },
    { id: "connections", label: "Connections" },
  ];
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-xl border border-edge/80 bg-panel/90 p-1 shadow-sm"
      role="tablist"
      aria-label="Network views"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={view === t.id}
          onClick={() => onView(t.id)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            view === t.id ? "bg-hover text-ink" : "text-ink-3 hover:text-ink-2",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
