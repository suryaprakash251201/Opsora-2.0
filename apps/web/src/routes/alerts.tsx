import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAlerts } from "../lib/queries";
import { keys } from "../lib/query";
import { apiPost } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardBody, CardHeader, CardAction } from "../components/ui/card";
import { MetricCard } from "../components/ui/metric-card";
import { PageHeader } from "../components/ui/page-header";
import { Input } from "../components/ui/input";
import { Table, THead, TRow, TH, TD } from "../components/ui/table";
import { compareBy, useSort } from "../lib/sort";
import { EmptyState, ErrorState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";
import { SegmentedControl } from "../components/ui/segmented";
import { useUi } from "../stores/ui";
import { timeAgo } from "@opsora/utils";
import { AlertCircle, AlertTriangle, Bell, Check, CheckCheck } from "lucide-react";

const statusFilters = ["all", "active", "acknowledged", "resolved", "muted"] as const;
const severityFilters = ["all", "critical", "warning", "info"] as const;

export function AlertsPage(): React.JSX.Element {
  const [status, setStatus] = React.useState<(typeof statusFilters)[number]>("all");
  const [severity, setSeverity] = React.useState<(typeof severityFilters)[number]>("all");
  const [q, setQ] = React.useState("");
  const { data, isLoading, isError, refetch } = useAlerts(status === "all" ? undefined : status);
  const qc = useQueryClient();
  const addToast = useUi((s) => s.addToast);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function act(id: string, action: "acknowledge" | "resolve" | "mute"): Promise<void> {
    setBusy(id);
    try {
      await apiPost(`/api/alerts/${id}`, { action });
      await qc.invalidateQueries({ queryKey: keys.alerts() });
      addToast({
        title: `Alert ${action}d`,
        message: `Alert was marked as ${action}d.`,
        type: "success",
      });
    } catch {
      addToast({
        title: "Alert update failed",
        message: "The alert could not be updated. Try again.",
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function bulkAct(action: "acknowledge" | "resolve" | "mute"): Promise<void> {
    setBusy("bulk");
    try {
      await apiPost("/api/alerts/bulk", { action });
      await qc.invalidateQueries({ queryKey: keys.alerts() });
      addToast({
        title: `Bulk Action Completed`,
        message: `All active alerts have been marked as ${action}d.`,
        type: "success",
      });
    } catch {
      addToast({
        title: "Bulk action failed",
        message: "No alerts were changed. Try again.",
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  const allAlerts = data?.alerts ?? [];
  const criticalCount = allAlerts.filter(
    (a) => a.severity === "critical" && a.status === "active",
  ).length;
  const warningCount = allAlerts.filter(
    (a) => a.severity === "warning" && a.status === "active",
  ).length;
  const ackCount = allAlerts.filter((a) => a.status === "acknowledged").length;

  const filtered = allAlerts.filter((a) => {
    if (severity !== "all" && a.severity !== severity) return false;
    if (q) {
      const match =
        a.title.toLowerCase().includes(q.toLowerCase()) ||
        (a.resource && a.resource.toLowerCase().includes(q.toLowerCase())) ||
        (a.description && a.description.toLowerCase().includes(q.toLowerCase()));
      if (!match) return false;
    }
    return true;
  });
  const sort = useSort("createdAt", "desc");
  const sorted = compareBy(filtered, sort.key, sort.dir, {
    // Severity sorts by weight, not alphabetically.
    severity: (a) =>
      a.severity === "critical" ? 0 : a.severity === "warning" ? 1 : a.severity === "info" ? 2 : 3,
    title: (a) => a.title,
    resource: (a) => a.resource ?? "System",
    createdAt: (a) => a.createdAt,
    status: (a) => a.status,
  });

  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="Alert Center"
        description="Infrastructure alarms, threshold violations, and incident management."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={
                busy !== null || allAlerts.filter((a) => a.status === "active").length === 0
              }
              onClick={() => void bulkAct("acknowledge")}
              className="gap-1.5 text-xs font-medium"
            >
              <Check className="size-3.5" />
              Ack all active
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={
                busy !== null || allAlerts.filter((a) => a.status === "active").length === 0
              }
              onClick={() => void bulkAct("resolve")}
              className="gap-1.5 text-xs font-medium"
            >
              <CheckCheck className="size-3.5" />
              Resolve all active
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Incidents"
          icon={<Bell className="size-3.5" />}
          value={allAlerts.length}
          sub="Recorded alerts"
        />
        <MetricCard
          label="Critical Active"
          icon={<AlertCircle className="size-3.5" />}
          value={criticalCount}
          sub="Requires immediate attention"
          tone={criticalCount > 0 ? "crit" : "ok"}
        />
        <MetricCard
          label="Active Warnings"
          icon={<AlertTriangle className="size-3.5" />}
          value={warningCount}
          sub="Elevated resource thresholds"
          tone={warningCount > 0 ? "warn" : "default"}
        />
        <MetricCard
          label="Acknowledged"
          icon={<Check className="size-3.5" />}
          value={ackCount}
          sub="Silenced / Under investigation"
        />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="flex-wrap gap-y-2 border-b border-edge/40 bg-panel-2/30 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              Status
            </span>
            <SegmentedControl
              ariaLabel="Filter alerts by status"
              value={status}
              onChange={setStatus}
              options={statusFilters.map((f) => ({ value: f, label: f }))}
              size="sm"
            />

            <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              Severity
            </span>
            <SegmentedControl
              ariaLabel="Filter alerts by severity"
              value={severity}
              onChange={setSeverity}
              options={severityFilters.map((s) => ({ value: s, label: s }))}
              size="sm"
            />
          </div>

          <CardAction>
            <div className="w-full sm:w-60">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search alerts by name or resource…"
                className="h-8 text-xs"
              />
            </div>
          </CardAction>
        </CardHeader>

        <CardBody className="p-0">
          {isLoading ? <Skeleton className="h-64 w-full" /> : null}
          {isError ? (
            <div className="p-4">
              <ErrorState message="Could not load alerts." onRetry={() => void refetch()} />
            </div>
          ) : null}
          {!isLoading && !isError && filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No alerts found"
                hint={
                  q
                    ? "No alerts match the active filter criteria."
                    : "Infrastructure is calm — no threshold breaches or adapter errors recorded."
                }
              />
            </div>
          ) : null}

          {!isLoading && !isError && filtered.length > 0 ? (
            <Table aria-label="Alerts">
              <THead>
                <TRow>
                  <TH
                    sortable
                    active={sort.key === "severity"}
                    dir={sort.dir}
                    onSort={() => sort.onSort("severity")}
                  >
                    Severity
                  </TH>
                  <TH
                    sortable
                    active={sort.key === "title"}
                    dir={sort.dir}
                    onSort={() => sort.onSort("title")}
                  >
                    Incident Title
                  </TH>
                  <TH
                    sortable
                    active={sort.key === "resource"}
                    dir={sort.dir}
                    onSort={() => sort.onSort("resource")}
                  >
                    Resource Target
                  </TH>
                  <TH>Metric Value</TH>
                  <TH>Violated Threshold</TH>
                  <TH
                    sortable
                    active={sort.key === "createdAt"}
                    dir={sort.dir}
                    onSort={() => sort.onSort("createdAt")}
                  >
                    Reported
                  </TH>
                  <TH
                    sortable
                    active={sort.key === "status"}
                    dir={sort.dir}
                    onSort={() => sort.onSort("status")}
                  >
                    Status
                  </TH>
                  <TH>
                    <span className="sr-only">Actions</span>
                  </TH>
                </TRow>
              </THead>
              <tbody>
                {sorted.map((a) => (
                  <TRow key={a.id}>
                    <TD>
                      <StatusBadge status={a.severity} />
                    </TD>
                    <TD className="max-w-72 text-ink">
                      <div className="font-semibold text-[13px]">{a.title}</div>
                      {a.description ? (
                        <div className="text-[11px] text-ink-3 truncate mt-0.5">
                          {a.description}
                        </div>
                      ) : null}
                    </TD>
                    <TD className="font-mono text-xs text-ink-2">{a.resource ?? "System"}</TD>
                    <TD className="num font-mono text-xs">{a.value ?? "—"}</TD>
                    <TD className="num font-mono text-xs text-ink-3">{a.threshold ?? "—"}</TD>
                    <TD className="num text-xs text-ink-3">{timeAgo(a.createdAt)}</TD>
                    <TD>
                      <StatusBadge status={a.status} />
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {a.status !== "acknowledged" && a.status !== "resolved" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy === a.id}
                            onClick={() => void act(a.id, "acknowledge")}
                            className="text-xs h-7"
                          >
                            Ack
                          </Button>
                        ) : null}
                        {a.status !== "muted" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy === a.id}
                            onClick={() => void act(a.id, "mute")}
                            className="text-xs h-7"
                          >
                            Mute
                          </Button>
                        ) : null}
                        {a.status !== "resolved" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy === a.id}
                            onClick={() => void act(a.id, "resolve")}
                            className="text-xs h-7 text-emerald-600 dark:text-emerald-400"
                          >
                            Resolve
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TRow>
                ))}
              </tbody>
            </Table>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
