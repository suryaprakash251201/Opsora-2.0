import type * as React from "react";
import { Link } from "react-router";
import { ArrowUpRight, Container, Globe, Network, Wifi } from "lucide-react";
import { useDocker, useNetwork, useServices } from "../../lib/queries";
import { Card, CardBody, CardHeader, CardTitle, CardAction } from "../../components/ui/card";
import { EmptyState, OfflineState } from "../../components/ui/states";
import { Skeleton } from "../../components/ui/skeleton";
import { StatusBadge } from "../../components/ui/status";
import { cn } from "../../lib/cn";

const miniTickTones: Record<string, string> = {
  up: "bg-emerald-500/80",
  degraded: "bg-amber-500/80",
  down: "bg-rose-500/80",
  unknown: "bg-edge",
};

function miniTicks(recent: readonly string[] | undefined): string[] {
  const out = [...(recent ?? []).slice(-5)];
  while (out.length < 5) out.unshift("unknown");
  return out;
}

export function ServicesMini(): React.JSX.Element {
  const { data, isLoading } = useServices();

  if (isLoading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Services & Health Checks</CardTitle>
        </CardHeader>
        <CardBody>
          <Skeleton className="h-32 w-full" />
        </CardBody>
      </Card>
    );

  const list = data?.services.slice(0, 6) ?? [];

  if (list.length === 0)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardBody>
          <EmptyState
            title="No services configured"
            hint="Add HTTP health check targets to monitor endpoints and uptime."
          />
        </CardBody>
      </Card>
    );

  const operationalCount = list.filter((s) => s.status === "up").length;

  return (
    <Card>
      <CardHeader className="border-b border-edge/40 bg-panel-2/30 py-3">
        <CardTitle>
          <Globe className="size-4 text-accent-strong" />
          <span>Services</span>
          <span className="text-[11px] font-normal text-ink-3">
            ({operationalCount}/{data?.services.length} operational)
          </span>
        </CardTitle>
        <CardAction>
          <Link
            to="/services"
            className="flex items-center gap-1 text-xs font-medium text-accent-strong hover:underline"
          >
            View all
            <ArrowUpRight className="size-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardBody className="divide-y divide-edge/40 p-0">
        {list.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-hover"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <StatusBadge status={s.status} />
              <div className="min-w-0">
                <span className="truncate text-[13px] font-medium text-ink block">{s.name}</span>
                <span className="truncate text-[11px] text-ink-3 block">
                  {s.url ?? "Internal endpoint"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Real check history (5 latest); gray = no data yet */}
              <div
                className="hidden sm:flex items-center gap-1"
                title={
                  s.uptimePercent != null
                    ? `${s.uptimePercent.toFixed(1)}% up over the trailing 24h`
                    : "No check history yet"
                }
              >
                {miniTicks(s.recentChecks).map((t, idx) => (
                  <span
                    key={idx}
                    className={cn("h-3.5 w-1 rounded-xs transition-colors", miniTickTones[t])}
                  />
                ))}
              </div>
              <span
                className={cn(
                  "num rounded px-1.5 py-0.5 text-[11px] font-mono font-medium",
                  s.responseTimeMs != null && s.responseTimeMs < 100
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : s.responseTimeMs != null && s.responseTimeMs < 300
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-void text-ink-3",
                )}
              >
                {s.responseTimeMs != null ? `${s.responseTimeMs} ms` : "—"}
              </span>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

export function DockerMini(): React.JSX.Element {
  const { data, isLoading } = useDocker();

  if (isLoading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Docker Containers</CardTitle>
        </CardHeader>
        <CardBody>
          <Skeleton className="h-32 w-full" />
        </CardBody>
      </Card>
    );

  if (!data || data.status !== "connected") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Docker</CardTitle>
        </CardHeader>
        <CardBody>
          <OfflineState
            title={data?.status === "not_connected" ? "Docker not connected" : "Docker unavailable"}
            hint={data?.error ?? "No Docker socket reachable from the API."}
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-edge/40 bg-panel-2/30 py-3">
        <CardTitle>
          <Container className="size-4 text-accent-strong" />
          <span>Containers</span>
          <span className="text-[11px] font-normal text-ink-3">
            ({data.running} running · {data.stopped} stopped)
          </span>
        </CardTitle>
        <CardAction>
          <Link
            to="/docker"
            className="flex items-center gap-1 text-xs font-medium text-accent-strong hover:underline"
          >
            Manage
            <ArrowUpRight className="size-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardBody className="divide-y divide-edge/40 p-0">
        {data.containers.slice(0, 6).map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-hover"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <StatusBadge status={c.state === "running" ? "running" : "unknown"} label={c.state} />
              <div className="min-w-0">
                <span className="truncate text-[13px] font-medium text-ink block">{c.name}</span>
                <span className="truncate text-[11px] text-ink-3 block font-mono">{c.image}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {c.ports.length > 0 ? (
                <span className="num hidden sm:inline rounded bg-void border border-edge/60 px-1.5 py-0.5 font-mono text-[10px] text-ink-2">
                  {c.ports[0]}
                </span>
              ) : null}
            </div>
          </div>
        ))}
        {data.containers.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No containers found"
              hint="Docker daemon is connected, but reports no container workloads."
            />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

export function NetworkMini(): React.JSX.Element {
  const { data, isLoading } = useNetwork();

  if (isLoading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network & Topology</CardTitle>
        </CardHeader>
        <CardBody>
          <Skeleton className="h-28 w-full" />
        </CardBody>
      </Card>
    );

  const nodes = data?.topology.nodes ?? [];
  const online = nodes.filter((n) => n.online).length;
  const lat = data?.summary.latencyMs;

  return (
    <Card>
      <CardHeader className="border-b border-edge/40 bg-panel-2/30 py-3">
        <CardTitle>
          <Network className="size-4 text-accent-strong" />
          <span>Network & Topology</span>
          <span className="text-[11px] font-normal text-ink-3">
            ({online}/{nodes.length} online)
          </span>
        </CardTitle>
        <CardAction>
          <Link
            to="/network"
            className="flex items-center gap-1 text-xs font-medium text-accent-strong hover:underline"
          >
            Topology
            <ArrowUpRight className="size-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardBody className="p-4 space-y-3">
        {/* Latency rating indicator */}
        <div className="flex items-center justify-between rounded-xl border border-edge/60 bg-void/50 p-2.5">
          <div className="flex items-center gap-2 text-xs">
            <Wifi className="size-3.5 text-accent-strong" />
            <span className="text-ink-2">Gateway Latency:</span>
            <span className="num font-bold text-ink">{lat != null ? `${lat} ms` : "—"}</span>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
              lat == null || lat < 25
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : lat < 80
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
            )}
          >
            {lat == null || lat < 25 ? "Optimal" : lat < 80 ? "Stable" : "Degraded"}
          </span>
        </div>

        {/* Discovered nodes visual cloud */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {nodes.slice(0, 10).map((n) => (
            <span
              key={n.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-edge/70 bg-panel-2/60 px-2.5 py-1 transition-colors hover:border-accent/40"
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  n.online ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-rose-400",
                )}
                aria-hidden
              />
              <span className="max-w-28 truncate font-medium text-ink-2">{n.label}</span>
              <span className="sr-only">{n.online ? "online" : "offline"}</span>
            </span>
          ))}
          {nodes.length > 10 ? (
            <span className="text-[11px] text-ink-3 pl-1 font-medium">
              +{nodes.length - 10} more
            </span>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
