import type * as React from "react";
import { useNetwork } from "../lib/queries";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { OfflineState, ErrorState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { MetricCard } from "../components/ui/metric-card";

export function NetworkPage(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useNetwork();
  if (isLoading)
    return (
      <div className="p-3 md:p-4">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (isError || !data)
    return (
      <div className="p-3 md:p-4">
        <ErrorState message="Could not load network state." onRetry={() => void refetch()} />
      </div>
    );
  const s = data.summary;
  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">Network</h1>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricCard
          label="Latency"
          value={s.latencyMs != null ? `${s.latencyMs} ms` : "—"}
          sub={s.status}
        />
        <MetricCard
          label="Download"
          value={s.downloadBps != null ? `${(s.downloadBps / 1e6).toFixed(1)} Mb/s` : "Unavailable"}
          sub="speed tests not run automatically"
        />
        <MetricCard
          label="Upload"
          value={s.uploadBps != null ? `${(s.uploadBps / 1e6).toFixed(1)} Mb/s` : "Unavailable"}
          sub="speed tests not run automatically"
        />
        <MetricCard
          label="Packet loss"
          value={s.packetLossPercent != null ? `${s.packetLossPercent}%` : "—"}
          sub="requires loss probe"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Topology — {data.topology.nodes.length} nodes</CardTitle>
        </CardHeader>
        <CardBody>
          {data.topology.nodes.length <= 2 ? (
            <OfflineState
              title="No discovered devices"
              hint="Connect Tailscale or configure discovery to populate the topology. Only real nodes are shown."
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.topology.nodes.map((n) => (
                <span
                  key={n.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-void px-2.5 py-1.5 text-[13px]"
                >
                  <span
                    className={
                      n.online
                        ? "size-2 rounded-full bg-emerald-400"
                        : "size-2 rounded-full bg-red-400"
                    }
                    aria-hidden
                  />
                  <span className="text-ink">{n.label}</span>
                  <span className="text-[11px] text-ink-3">{n.kind}</span>
                </span>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
