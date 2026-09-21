import type * as React from "react";
import { useDns } from "../lib/queries";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { MetricCard } from "../components/ui/metric-card";
import { ErrorState, OfflineState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";

export function DnsPage(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useDns();
  if (isLoading)
    return (
      <div className="p-3 md:p-4">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (isError || !data)
    return (
      <div className="p-3 md:p-4">
        <ErrorState message="Could not load DNS stats." onRetry={() => void refetch()} />
      </div>
    );
  if (data.status !== "connected") {
    return (
      <div className="grid gap-2.5 p-3 md:p-4">
        <h1 className="text-base font-semibold tracking-tight">DNS · Pi-hole</h1>
        <OfflineState
          title={data.status === "not_connected" ? "Pi-hole not connected" : "Pi-hole unavailable"}
          hint={data.error ?? "Set PIHOLE_URL and PIHOLE_API_TOKEN server-side."}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }
  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold tracking-tight">DNS · Pi-hole</h1>
        <StatusBadge status="connected" className="ml-auto" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricCard label="Total queries" value={data.totalQueries?.toLocaleString() ?? "—"} />
        <MetricCard label="Blocked" value={data.blockedQueries?.toLocaleString() ?? "—"} />
        <MetricCard
          label="Block %"
          value={data.blockPercent != null ? `${data.blockPercent.toFixed(1)}%` : "—"}
        />
        <MetricCard label="Latency" value={data.latencyMs != null ? `${data.latencyMs} ms` : "—"} />
      </div>
      <div className="grid gap-2.5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top domains</CardTitle>
          </CardHeader>
          <CardBody>
            {data.topDomains.length === 0 ? (
              <p className="text-xs text-ink-3">
                Per-domain breakdown requires Pi-hole API extended permissions.
              </p>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top clients</CardTitle>
          </CardHeader>
          <CardBody>
            {data.topClients.length === 0 ? (
              <p className="text-xs text-ink-3">
                Per-client breakdown requires Pi-hole API extended permissions.
              </p>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
