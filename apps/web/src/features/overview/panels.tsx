import type * as React from "react";
import { Link } from "react-router";
import { useDocker, useNetwork, useServices } from "../../lib/queries";
import { Card, CardBody, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, OfflineState } from "../../components/ui/states";
import { Skeleton } from "../../components/ui/skeleton";
import { StatusBadge } from "../../components/ui/status";

export function ServicesMini(): React.JSX.Element {
  const { data, isLoading } = useServices();
  if (isLoading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardBody>
          <Skeleton className="h-20 w-full" />
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
            hint="Add a service to start real HTTP health checks."
          />
        </CardBody>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Services · {data?.services.length}</CardTitle>
        <Link to="/services" className="text-xs text-accent-strong hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardBody className="grid gap-1.5">
        {list.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-[13px]">
            <StatusBadge status={s.status} />
            <span className="truncate text-ink">{s.name}</span>
            <span className="num ml-auto text-xs text-ink-3">
              {s.responseTimeMs != null ? `${s.responseTimeMs} ms` : "—"}
            </span>
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
          <CardTitle>Docker</CardTitle>
        </CardHeader>
        <CardBody>
          <Skeleton className="h-20 w-full" />
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
      <CardHeader>
        <CardTitle>Docker · {data.running} running</CardTitle>
        <Link to="/docker" className="text-xs text-accent-strong hover:underline">
          Manage
        </Link>
      </CardHeader>
      <CardBody className="grid gap-1.5">
        {data.containers.slice(0, 6).map((c) => (
          <div key={c.id} className="flex items-center gap-2 text-[13px]">
            <StatusBadge status={c.state === "running" ? "running" : "unknown"} label={c.state} />
            <span className="truncate text-ink">{c.name}</span>
            <span className="ml-auto truncate text-xs text-ink-3">{c.image}</span>
          </div>
        ))}
        {data.containers.length === 0 ? (
          <EmptyState
            title="No containers"
            hint="The Docker daemon is reachable but reports no containers."
          />
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
          <CardTitle>Network</CardTitle>
        </CardHeader>
        <CardBody>
          <Skeleton className="h-24 w-full" />
        </CardBody>
      </Card>
    );
  const nodes = data?.topology.nodes ?? [];
  const online = nodes.filter((n) => n.online).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Network · {online}/{nodes.length} online
        </CardTitle>
        <Link to="/network" className="text-xs text-accent-strong hover:underline">
          Topology
        </Link>
      </CardHeader>
      <CardBody>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {nodes.slice(0, 12).map((n) => (
            <span
              key={n.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-void px-2 py-1"
            >
              <span
                className={
                  n.online
                    ? "size-1.5 rounded-full bg-emerald-400"
                    : "size-1.5 rounded-full bg-red-400"
                }
                aria-hidden
              />
              <span className="max-w-28 truncate text-ink-2">{n.label}</span>
            </span>
          ))}
        </div>
        <p className="num mt-2 text-xs text-ink-3">
          Latency {data?.summary.latencyMs != null ? `${data.summary.latencyMs} ms` : "—"} ·
          topology shows only real discovered nodes.
        </p>
      </CardBody>
    </Card>
  );
}
