import type * as React from "react";
import { formatBytes, formatPercent } from "@opsora/utils";
import { useStorage } from "../lib/queries";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { ErrorState, OfflineState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";

export function StoragePage(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useStorage();
  if (isLoading)
    return (
      <div className="p-3 md:p-4">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (isError || !data)
    return (
      <div className="p-3 md:p-4">
        <ErrorState message="Could not load storage." onRetry={() => void refetch()} />
      </div>
    );
  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">Storage</h1>
      <Card>
        <CardHeader>
          <CardTitle>Local disks · {data.local.length}</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-2.5">
          {data.local.map((d) => (
            <div key={d.id} className="rounded-md border border-edge/70 bg-panel-2 px-3 py-2.5">
              <div className="flex items-center gap-2 text-[13px]">
                <span className="font-medium text-ink">{d.label}</span>
                <span className="num text-xs text-ink-3">{d.mount}</span>
                <span className="ml-auto">
                  <StatusBadge status={d.health} />
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-edge"
                role="progressbar"
                aria-valuenow={d.percent ?? undefined}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${d.label} usage`}
              >
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, d.percent ?? 0)}%` }}
                />
              </div>
              <p className="num mt-1 text-xs text-ink-2">
                {d.usedBytes != null ? formatBytes(d.usedBytes) : "—"} /{" "}
                {d.totalBytes != null ? formatBytes(d.totalBytes) : "—"} (
                {d.percent != null ? formatPercent(d.percent) : "—"})
              </p>
            </div>
          ))}
          {data.local.length === 0 ? (
            <OfflineState
              title="No disk data"
              hint="The API could not read local disk usage on this host."
              onRetry={() => void refetch()}
            />
          ) : null}
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>S3 / cloud storage</CardTitle>
          <StatusBadge status={data.s3Status} />
        </CardHeader>
        <CardBody>
          {data.s3Status !== "connected" ? (
            <OfflineState
              title={data.s3Status === "not_connected" ? "S3 not connected" : "S3 unavailable"}
              hint={
                data.s3Error ??
                "Configure S3_ENDPOINT and credentials server-side to monitor buckets."
              }
            />
          ) : data.s3Buckets.length === 0 ? (
            <p className="text-xs text-ink-2">
              Endpoint reachable. Bucket enumeration is provider-specific — counts are shown only
              when the provider reports them.
            </p>
          ) : (
            <ul className="grid gap-1.5 text-[13px]">
              {data.s3Buckets.map((b) => (
                <li key={b.id} className="flex items-center gap-2">
                  <span className="text-ink">{b.label}</span>
                  <StatusBadge status="unknown" label="usage unknown" className="ml-auto" />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
