import type * as React from "react";
import { Link } from "react-router";
import { Activity, ArrowUpRight, Ban, Clock, ShieldCheck } from "lucide-react";
import { useDns } from "../lib/queries";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { ProgressBar } from "../components/ui/progress-bar";
import { MetricCard } from "../components/ui/metric-card";
import { ErrorState, OfflineState } from "../components/ui/states";
import { PageHeader } from "../components/ui/page-header";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";

function RankedList({
  items,
  empty,
}: {
  items: { label: string; value: number }[];
  empty: string;
}): React.JSX.Element {
  if (items.length === 0) return <p className="text-[13px] leading-relaxed text-ink-3">{empty}</p>;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ol className="grid gap-3">
      {items.slice(0, 8).map((item, index) => (
        <li key={item.label} className="grid gap-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="num w-4 text-ink-3">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate font-medium text-ink-2">{item.label}</span>
            <span className="num font-semibold text-ink">{item.value.toLocaleString()}</span>
          </div>
          <ProgressBar value={(item.value / max) * 100} tone="accent" size="xs" />
        </li>
      ))}
    </ol>
  );
}

export function DnsPage(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useDns();
  if (isLoading)
    return (
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="DNS · Pi-hole"
          description="Query statistics and blocking from your Pi-hole resolver."
        />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (isError || !data)
    return (
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="DNS · Pi-hole"
          description="Query statistics and blocking from your Pi-hole resolver."
        />
        <ErrorState message="Could not load DNS stats." onRetry={() => void refetch()} />
      </div>
    );
  if (data.status !== "connected") {
    return (
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="DNS · Pi-hole"
          description="Query statistics and blocking from your Pi-hole resolver."
        />
        <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
          <OfflineState
            title={
              data.status === "not_connected" ? "Pi-hole not connected" : "Pi-hole unavailable"
            }
            hint={data.error ?? "Set PIHOLE_URL and PIHOLE_API_TOKEN server-side."}
            onRetry={() => void refetch()}
          />
          <Card>
            <CardHeader>
              <CardTitle>Connect Pi-hole</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-[13px] leading-relaxed text-ink-2">
              <p>
                Credentials stay server-side. Configure the resolver URL and API token, then retry
                this view to expose real query and block data.
              </p>
              <Link
                to="/integrations/pihole"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong hover:underline"
              >
                Open integration guide
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="DNS · Pi-hole"
        description="Query statistics and blocking from your Pi-hole resolver."
        badge={<StatusBadge status="connected" />}
      />
      <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total queries"
          icon={<Activity className="size-3.5" />}
          value={data.totalQueries?.toLocaleString() ?? "—"}
          sub="Resolver queries observed"
        />
        <MetricCard
          label="Blocked"
          icon={<Ban className="size-3.5" />}
          value={data.blockedQueries?.toLocaleString() ?? "—"}
          sub="Queries filtered by Pi-hole"
          tone="warn"
        />
        <MetricCard
          label="Block %"
          icon={<ShieldCheck className="size-3.5" />}
          value={data.blockPercent != null ? `${data.blockPercent.toFixed(1)}%` : "—"}
          sub="Share of total queries"
          tone="accent"
        />
        <MetricCard
          label="Latency"
          icon={<Clock className="size-3.5" />}
          value={data.latencyMs != null ? `${data.latencyMs} ms` : "—"}
          sub="Resolver response time"
          tone={data.latencyMs != null && data.latencyMs < 50 ? "ok" : "default"}
        />
      </div>
      <div className="grid gap-2.5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top domains</CardTitle>
          </CardHeader>
          <CardBody>
            <RankedList
              items={data.topDomains.map((item) => ({ label: item.domain, value: item.count }))}
              empty="Per-domain breakdown requires Pi-hole API extended permissions."
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top clients</CardTitle>
          </CardHeader>
          <CardBody>
            <RankedList
              items={data.topClients.map((item) => ({ label: item.client, value: item.count }))}
              empty="Per-client breakdown requires Pi-hole API extended permissions."
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
