import * as React from "react";
import { formatBytes, formatPercent } from "@opsora/utils";
import { useStorage } from "../lib/queries";
import { Card, CardBody, CardHeader, CardTitle, CardAction } from "../components/ui/card";
import { MetricCard } from "../components/ui/metric-card";
import { ProgressBar } from "../components/ui/progress-bar";
import { Button } from "../components/ui/button";
import { PageHeader } from "../components/ui/page-header";
import { ErrorState, OfflineState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";
import { useUi } from "../stores/ui";
import { Cloud, Database, HardDrive, RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "../lib/cn";

export function StoragePage(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useStorage();
  const addToast = useUi((s) => s.addToast);
  const [testingS3, setTestingS3] = React.useState(false);

  if (isLoading)
    return (
      <div className="grid gap-3.5 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="Storage & Volumes"
          description="Physical disk partitions, filesystem health, and cloud object buckets."
        />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (isError || !data)
    return (
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="Storage & Volumes"
          description="Physical disk partitions, filesystem health, and cloud object buckets."
        />
        <ErrorState message="Could not load storage." onRetry={() => void refetch()} />
      </div>
    );

  const localDisks = data.local ?? [];
  const totalBytes = localDisks.reduce((acc, d) => acc + (d.totalBytes ?? 0), 0);
  const usedBytes = localDisks.reduce((acc, d) => acc + (d.usedBytes ?? 0), 0);
  const freeBytes = Math.max(0, totalBytes - usedBytes);
  const overallPercent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
  const healthyCount = localDisks.filter(
    (d) => d.health === "healthy" || d.health === "unknown",
  ).length;

  const refreshS3 = async (): Promise<void> => {
    setTestingS3(true);
    try {
      const result = await refetch();
      const status = result.data?.s3Status ?? data.s3Status;
      if (status === "connected") {
        addToast({
          title: "S3 status refreshed",
          message: "The API reports a reachable object storage endpoint.",
          type: "success",
        });
      } else {
        addToast({
          title: "S3 not configured",
          message: data.s3Error || "Configure S3_ENDPOINT in the environment to connect.",
          type: "warning",
        });
      }
    } finally {
      setTestingS3(false);
    }
  };

  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="Storage & Volumes"
        description="Physical disk partitions, filesystem health, and cloud object buckets."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Capacity"
          icon={<HardDrive className="size-3.5" />}
          value={totalBytes > 0 ? formatBytes(totalBytes) : "—"}
          sub={`${localDisks.length} local volumes`}
        />
        <MetricCard
          label="Space Used"
          icon={<Database className="size-3.5" />}
          value={usedBytes > 0 ? formatBytes(usedBytes) : "—"}
          sub={`${Math.round(overallPercent)}% pool saturation`}
          progress={{
            value: overallPercent,
            tone: "auto",
          }}
          tone={overallPercent > 85 ? "warn" : "default"}
        />
        <MetricCard
          label="Free Space"
          icon={<ShieldCheck className="size-3.5" />}
          value={freeBytes > 0 ? formatBytes(freeBytes) : "—"}
          sub="Available for workloads"
          tone="ok"
        />
        <MetricCard
          label="Volume Health"
          icon={<HardDrive className="size-3.5" />}
          value={`${healthyCount}/${localDisks.length}`}
          sub="Healthy filesystems"
          tone={healthyCount === localDisks.length ? "ok" : "warn"}
        />
      </div>

      {/* Local Disks */}
      <Card>
        <CardHeader className="border-b border-edge/40 bg-panel-2/30 py-3">
          <CardTitle>
            <HardDrive className="size-4 text-accent-strong" />
            <span>Local Disks & Partitions</span>
            <span className="text-[11px] font-normal text-ink-3">({localDisks.length})</span>
          </CardTitle>
        </CardHeader>
        <CardBody className="p-4 grid gap-3 sm:grid-cols-2">
          {localDisks.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-edge/70 bg-panel-2/50 p-3.5 transition-all hover:border-accent/40 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-ink text-[13px]">{d.label}</h3>
                  <p className="num font-mono text-[11px] text-ink-3">
                    {d.mount ?? "/"} {d.filesystem ? `(${d.filesystem})` : ""}
                  </p>
                </div>
                <StatusBadge status={d.health} />
              </div>

              <div>
                <ProgressBar value={d.percent} size="sm" tone="auto" />
              </div>

              <div className="flex items-center justify-between text-xs text-ink-2 font-mono">
                <span>
                  {d.usedBytes != null ? formatBytes(d.usedBytes) : "—"} /{" "}
                  {d.totalBytes != null ? formatBytes(d.totalBytes) : "—"}
                </span>
                <span className="font-bold text-ink">
                  {d.percent != null ? formatPercent(d.percent) : "—"}
                </span>
              </div>
            </div>
          ))}
          {localDisks.length === 0 ? (
            <div className="col-span-2">
              <OfflineState
                title="No disk telemetry"
                hint="Opsora could not read local disk usage on this host."
                onRetry={() => void refetch()}
              />
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* Cloud S3 Storage */}
      <Card>
        <CardHeader className="border-b border-edge/40 bg-panel-2/30 py-3">
          <div className="flex items-center gap-2">
            <Cloud className="size-4 text-accent-strong" />
            <CardTitle>S3 & Cloud Object Storage</CardTitle>
            <StatusBadge status={data.s3Status} />
          </div>
          <CardAction>
            <Button
              size="sm"
              variant="secondary"
              disabled={testingS3}
              onClick={() => void refreshS3()}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={cn("size-3", testingS3 && "animate-spin")} />
              Refresh status
            </Button>
          </CardAction>
        </CardHeader>
        <CardBody className="p-4">
          {data.s3Status !== "connected" ? (
            <OfflineState
              title={
                data.s3Status === "not_connected"
                  ? "S3 Storage Not Configured"
                  : "S3 Storage Unavailable"
              }
              hint={
                data.s3Error ??
                "Set S3_ENDPOINT, S3_ACCESS_KEY, and S3_SECRET_KEY server-side to monitor bucket storage."
              }
            />
          ) : data.s3Buckets.length === 0 ? (
            <p className="text-xs text-ink-2">
              Endpoint reachable. Bucket enumeration is provider-specific — counts are shown only
              when the provider reports them.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.s3Buckets.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border border-edge bg-void px-3 py-2 text-xs"
                >
                  <span className="font-medium text-ink">{b.label}</span>
                  <StatusBadge status="unknown" label="active" />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
