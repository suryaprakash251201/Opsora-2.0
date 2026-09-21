import type * as React from "react";
import { formatBytes, formatPercent, formatUptime } from "@opsora/utils";
import { Link } from "react-router";
import { useServers } from "../../lib/queries";
import { Card, CardBody, CardHeader, CardTitle } from "../../components/ui/card";
import { ErrorState, OfflineState } from "../../components/ui/states";
import { Skeleton } from "../../components/ui/skeleton";
import { StatusBadge, StatusDot } from "../../components/ui/status";

export function ServerList({ compact = false }: { compact?: boolean }): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useServers();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Servers</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardBody>
      </Card>
    );
  }
  if (isError)
    return <ErrorState message="Could not load servers." onRetry={() => void refetch()} />;
  if (!data || data.servers.length === 0)
    return (
      <OfflineState
        title="No servers"
        hint="No hosts are reporting. Run the API on a host or connect a Linux agent."
      />
    );

  const list = compact ? data.servers.slice(0, 4) : data.servers;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Servers · {data.servers.length}</CardTitle>
        {compact ? (
          <Link to="/servers" className="text-xs text-sky-300 hover:underline">
            View all
          </Link>
        ) : null}
      </CardHeader>
      <CardBody className="grid gap-2">
        {list.map((s) => (
          <Link
            key={s.id}
            to="/servers"
            className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-edge/70 bg-void/60 px-3 py-2.5 hover:border-white/15"
          >
            <span className="flex min-w-36 items-center gap-2">
              <StatusDot status={s.online ? "online" : "offline"} />
              <span className="font-medium text-ink">{s.hostname}</span>
            </span>
            <span className="num hidden text-xs text-ink-3 sm:inline">{s.os ?? "—"}</span>
            <span className="num ml-auto flex items-center gap-3 text-xs text-ink-2">
              <span title="CPU">
                CPU {s.cpuPercent == null ? "—" : formatPercent(s.cpuPercent)}
              </span>
              <span title="Memory">
                RAM {s.memPercent == null ? "—" : formatPercent(s.memPercent)}
              </span>
              <span title="Disk">
                Disk {s.diskPercent == null ? "—" : formatPercent(s.diskPercent)}
              </span>
              <span title="Memory usage" className="hidden lg:inline">
                {s.memUsedBytes != null ? formatBytes(s.memUsedBytes) : ""}
              </span>
              <span title="Uptime" className="hidden lg:inline">
                up {formatUptime(s.uptimeSeconds)}
              </span>
              <StatusBadge status={s.online ? "online" : "offline"} />
            </span>
          </Link>
        ))}
      </CardBody>
    </Card>
  );
}
