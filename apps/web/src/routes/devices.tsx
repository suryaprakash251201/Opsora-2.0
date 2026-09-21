import * as React from "react";
import { useDevices } from "../lib/queries";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Table, THead, TRow, TH, TD } from "../components/ui/table";
import { EmptyState, ErrorState, OfflineState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";
import { timeAgo } from "@opsora/utils";

export function DevicesPage(): React.JSX.Element {
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [sort, setSort] = React.useState<"name" | "seen">("name");

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, isError, refetch } = useDevices(debounced, status);

  const rows = [...(data?.devices ?? [])];
  rows.sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name) : +new Date(b.lastSeen) - +new Date(a.lastSeen),
  );

  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">Devices</h1>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-wrap items-center gap-2">
          <div className="w-64">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or IP…"
              aria-label="Search devices"
            />
          </div>
          {(["all", "online", "offline"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "ghost"}
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
          <div className="ml-auto flex gap-1">
            <Button
              size="sm"
              variant={sort === "name" ? "default" : "ghost"}
              onClick={() => setSort("name")}
            >
              Name
            </Button>
            <Button
              size="sm"
              variant={sort === "seen" ? "default" : "ghost"}
              onClick={() => setSort("seen")}
            >
              Last seen
            </Button>
          </div>
        </CardBody>
      </Card>
      {isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {isError ? (
        <ErrorState message="Could not load devices." onRetry={() => void refetch()} />
      ) : null}
      {!isLoading && !isError && rows.length === 0 ? (
        <EmptyState
          title="No devices match"
          hint={
            data?.tailscaleStatus !== "connected"
              ? "Tailscale is not connected — only static devices would appear here."
              : "Try widening the search."
          }
        />
      ) : null}
      {!isLoading && !isError && data?.tailscaleStatus !== "connected" && rows.length > 0 ? (
        <OfflineState
          title="Partial inventory"
          hint="Tailscale discovery is not connected; showing configured devices only."
        />
      ) : null}
      {!isLoading && !isError && rows.length > 0 ? (
        <Table aria-label="Devices">
          <THead>
            <TRow>
              <TH>Name</TH>
              <TH>IP</TH>
              <TH>Type</TH>
              <TH>Status</TH>
              <TH>Last seen</TH>
              <TH>Source</TH>
            </TRow>
          </THead>
          <tbody>
            {rows.slice(0, 200).map((d) => (
              <TRow key={d.id}>
                <TD className="text-ink">{d.name}</TD>
                <TD className="num">{d.ip}</TD>
                <TD>{d.type}</TD>
                <TD>
                  <StatusBadge status={d.online ? "online" : "offline"} />
                </TD>
                <TD className="num">{timeAgo(d.lastSeen)}</TD>
                <TD>{d.source}</TD>
              </TRow>
            ))}
          </tbody>
        </Table>
      ) : null}
    </div>
  );
}
