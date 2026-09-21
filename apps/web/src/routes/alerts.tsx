import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAlerts } from "../lib/queries";
import { keys } from "../lib/query";
import { apiPost } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { Table, THead, TRow, TH, TD } from "../components/ui/table";
import { EmptyState, ErrorState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";
import { timeAgo } from "@opsora/utils";

const filters = ["all", "active", "acknowledged", "resolved", "muted"] as const;

export function AlertsPage(): React.JSX.Element {
  const [status, setStatus] = React.useState<(typeof filters)[number]>("all");
  const { data, isLoading, isError, refetch } = useAlerts(status === "all" ? undefined : status);
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function act(id: string, action: "acknowledge" | "resolve" | "mute"): Promise<void> {
    setBusy(id);
    try {
      await apiPost(`/api/alerts/${id}`, { action });
      await qc.invalidateQueries({ queryKey: keys.alerts() });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">Alert center</h1>
      <Card>
        <CardHeader>
          <CardTitle>Status filter</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={status === f ? "default" : "ghost"}
              onClick={() => setStatus(f)}
            >
              {f}
            </Button>
          ))}
          {data ? (
            <span className="num ml-auto text-xs text-ink-3">
              {data.counts.critical} critical active
            </span>
          ) : null}
        </CardBody>
      </Card>
      {isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {isError ? (
        <ErrorState message="Could not load alerts." onRetry={() => void refetch()} />
      ) : null}
      {!isLoading && !isError && (data?.alerts.length ?? 0) === 0 ? (
        <EmptyState
          title="No alerts"
          hint="Threshold breaches and integration failures will land here with severity, resource, and value."
        />
      ) : null}
      {!isLoading && !isError && (data?.alerts.length ?? 0) > 0 ? (
        <Table aria-label="Alerts">
          <THead>
            <TRow>
              <TH>Severity</TH>
              <TH>Title</TH>
              <TH>Resource</TH>
              <TH>Value</TH>
              <TH>Created</TH>
              <TH>Status</TH>
              <TH>
                <span className="sr-only">Actions</span>
              </TH>
            </TRow>
          </THead>
          <tbody>
            {(data?.alerts ?? []).map((a) => (
              <TRow key={a.id}>
                <TD>
                  <StatusBadge status={a.severity} />
                </TD>
                <TD className="max-w-64 text-ink">
                  {a.title}
                  <div className="truncate text-[11px] text-ink-3">{a.description ?? ""}</div>
                </TD>
                <TD>{a.resource ?? "—"}</TD>
                <TD className="num">{a.value ?? "—"}</TD>
                <TD className="num text-xs">{timeAgo(a.createdAt)}</TD>
                <TD>
                  <StatusBadge status={a.status} />
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === a.id}
                      onClick={() => void act(a.id, "acknowledge")}
                    >
                      Ack
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === a.id}
                      onClick={() => void act(a.id, "mute")}
                    >
                      Mute
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === a.id}
                      onClick={() => void act(a.id, "resolve")}
                    >
                      Resolve
                    </Button>
                  </div>
                </TD>
              </TRow>
            ))}
          </tbody>
        </Table>
      ) : null}
    </div>
  );
}
