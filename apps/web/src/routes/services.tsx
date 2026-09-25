import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setServiceEnabled, triggerServiceCheck, useServices } from "../lib/queries";
import { keys } from "../lib/query";
import { apiDelete, apiPost } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, CardAction } from "../components/ui/card";
import { ConfirmDialog } from "../components/ui/confirm";
import { MetricCard } from "../components/ui/metric-card";
import { PageHeader } from "../components/ui/page-header";
import { Input, Field } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Table, THead, TRow, TH, TD } from "../components/ui/table";
import { compareBy, useSort } from "../lib/sort";
import { EmptyState, ErrorState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";
import { SegmentedControl } from "../components/ui/segmented";
import { useUi } from "../stores/ui";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "../lib/cn";

const presets = [
  { name: "Nextcloud", url: "http://localhost:8080" },
  { name: "Pi-hole Admin", url: "http://localhost:80/admin" },
  { name: "Home Assistant", url: "http://localhost:8123" },
  { name: "Plex Media Server", url: "http://localhost:32400/web" },
  { name: "Vaultwarden", url: "http://localhost:8000" },
  { name: "Grafana", url: "http://localhost:3000" },
  { name: "Portainer", url: "http://localhost:9000" },
  { name: "Jellyfin", url: "http://localhost:8096" },
];

const tickTones: Record<string, string> = {
  up: "bg-emerald-500/85",
  degraded: "bg-amber-500/85",
  down: "bg-rose-500/85",
  unknown: "bg-edge",
};

/**
 * Real check history oldest→newest, left-padded with "unknown" so a service
 * with no recorded checks renders gray ticks instead of invented history.
 */
function ticksFor(recent: readonly string[] | undefined, count: number): string[] {
  const hist = (recent ?? []).slice(-count);
  const out = [...hist];
  while (out.length < count) out.unshift("unknown");
  return out;
}

export function ServicesPage(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useServices();
  const qc = useQueryClient();
  const addToast = useUi((s) => s.addToast);
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [enabledOnCreate, setEnabledOnCreate] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "up" | "issues" | "paused">("all");
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  const services = data?.services ?? [];
  const total = services.length;
  const enabledServices = services.filter((s) => s.enabled);
  const enabledCount = enabledServices.length;
  const upCount = enabledServices.filter((s) => s.status === "up").length;
  const issueCount = enabledServices.filter(
    (s) => s.status === "down" || s.status === "degraded",
  ).length;
  const pausedCount = services.filter((s) => !s.enabled).length;
  const latencies = enabledServices
    .map((s) => s.responseTimeMs)
    .filter((v): v is number => v != null);
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null;

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/services", { name, url: url || null, enabled: enabledOnCreate });
      setName("");
      setUrl("");
      setEnabledOnCreate(true);
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.services }),
        qc.invalidateQueries({ queryKey: ["uptime"] }),
      ]);
      addToast({
        title: "Service Added",
        message: enabledOnCreate
          ? `${name} registered for active health checks.`
          : `${name} registered with uptime checks paused.`,
        type: "success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "could not add service";
      setError(msg);
      addToast({
        title: "Add Failed",
        message: msg,
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function recheckAll(): Promise<void> {
    setBusy(true);
    try {
      await triggerServiceCheck();
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.services }),
        qc.invalidateQueries({ queryKey: ["uptime"] }),
      ]);
      addToast({
        title: "Health Checks Executed",
        message: "Synchronized HTTP probe results across active services.",
        type: "success",
      });
    } catch {
      addToast({
        title: "Check Failed",
        message: "Could not complete check cycle.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleService(id: string, name: string, enabled: boolean): Promise<void> {
    setTogglingId(id);
    try {
      await setServiceEnabled(id, enabled);
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.services }),
        qc.invalidateQueries({ queryKey: ["uptime"] }),
      ]);
      addToast({
        title: enabled ? "Uptime checks enabled" : "Uptime checks paused",
        message: `${name} will ${enabled ? "resume" : "stop"} receiving scheduled checks.`,
        type: enabled ? "success" : "info",
      });
    } catch {
      addToast({
        title: "Could not update monitoring",
        message: `${name} stayed ${enabled ? "disabled" : "enabled"}.`,
        type: "error",
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function removeService(): Promise<void> {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/api/services/${deleteTarget.id}`, true);
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.services }),
        qc.invalidateQueries({ queryKey: ["uptime"] }),
      ]);
      addToast({
        title: "Service Removed",
        message: `${deleteTarget.name} was removed from monitoring.`,
        type: "info",
      });
    } catch {
      addToast({
        title: "Remove failed",
        message: `${deleteTarget.name} is still being monitored.`,
        type: "error",
      });
    } finally {
      setDeleteTarget(null);
    }
  }

  const filtered = services.filter((s) => {
    if (statusFilter === "up" && (!s.enabled || s.status !== "up")) return false;
    if (statusFilter === "issues" && (!s.enabled || s.status === "up")) return false;
    if (statusFilter === "paused" && s.enabled) return false;
    if (q) {
      const match =
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        (s.url && s.url.toLowerCase().includes(q.toLowerCase()));
      if (!match) return false;
    }
    return true;
  });
  const sort = useSort("name");
  const sorted = compareBy(filtered, sort.key, sort.dir, {
    name: (s) => s.name,
    // Healthiest first when sorting by status.
    status: (s) =>
      s.status === "up" ? 0 : s.status === "degraded" ? 1 : s.status === "down" ? 2 : 3,
    httpStatus: (s) => s.httpStatus,
    responseTimeMs: (s) => s.responseTimeMs,
  });

  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="Services & Uptime"
        description="HTTP endpoint health checking, latency tracking, and uptime metrics."
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void recheckAll()}
            disabled={busy}
            className="gap-1.5 font-medium"
          >
            <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
            {busy ? "Checking…" : "Run checks now"}
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Services"
          icon={<Globe className="size-3.5" />}
          value={total}
          sub={`${enabledCount} actively checking`}
        />
        <MetricCard
          label="Operational"
          icon={<CheckCircle2 className="size-3.5" />}
          value={upCount}
          sub={
            enabledCount === 0
              ? "monitoring paused"
              : `${upCount}/${enabledCount} active · ${Math.round((upCount / enabledCount) * 100)}%`
          }
          progress={{
            value: enabledCount > 0 ? (upCount / enabledCount) * 100 : 0,
            tone: enabledCount > 0 && upCount < enabledCount ? "warn" : "ok",
          }}
          tone={enabledCount === 0 ? "default" : upCount === enabledCount ? "ok" : "warn"}
        />
        <MetricCard
          label="Issues / Down"
          icon={<Zap className="size-3.5" />}
          value={issueCount}
          sub={
            issueCount > 0
              ? "Degraded endpoints"
              : enabledCount === 0
                ? "No active checks"
                : "Zero errors"
          }
          tone={issueCount > 0 ? "warn" : "default"}
        />
        <MetricCard
          label="Avg Latency"
          icon={<Clock className="size-3.5" />}
          value={avgLatency != null ? `${avgLatency} ms` : "—"}
          sub="Active check samples"
          tone={avgLatency != null && avgLatency < 100 ? "ok" : "default"}
        />
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {isError ? (
        <ErrorState message="Could not load services." onRetry={() => void refetch()} />
      ) : null}
      {!isLoading && !isError && total === 0 ? (
        <EmptyState
          title="No services configured"
          hint="Add a URL below — Opsora performs real HTTP health checks, never inferred status."
        />
      ) : null}

      {!isLoading && !isError && total > 0 ? (
        <Card>
          <CardHeader className="flex-wrap gap-y-2 border-b border-edge/40 bg-panel-2/30 py-3">
            <CardTitle>
              <span>Services</span>
              <span className="text-[11px] font-normal text-ink-3">({filtered.length})</span>
            </CardTitle>

            <CardAction className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                ariaLabel="Filter services by health"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All", count: total },
                  { value: "up", label: "Operational", count: upCount },
                  { value: "issues", label: "Issues", count: issueCount },
                  { value: "paused", label: "Paused", count: pausedCount },
                ]}
                size="sm"
              />

              {/* Search input */}
              <div className="w-full sm:w-56">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter name or URL…"
                  className="h-8 text-xs"
                />
              </div>
            </CardAction>
          </CardHeader>

          <CardBody className="p-0">
            <Table aria-label="Services">
              <THead>
                <TRow>
                  <TH
                    sortable
                    active={sort.key === "name"}
                    dir={sort.dir}
                    onSort={() => sort.onSort("name")}
                  >
                    Service
                  </TH>
                  <TH
                    sortable
                    active={sort.key === "status"}
                    dir={sort.dir}
                    onSort={() => sort.onSort("status")}
                  >
                    Status
                  </TH>
                  <TH>Recent Checks</TH>
                  <TH
                    sortable
                    active={sort.key === "httpStatus"}
                    dir={sort.dir}
                    onSort={() => sort.onSort("httpStatus")}
                  >
                    HTTP Status
                  </TH>
                  <TH
                    sortable
                    active={sort.key === "responseTimeMs"}
                    dir={sort.dir}
                    onSort={() => sort.onSort("responseTimeMs")}
                  >
                    Response Time
                  </TH>
                  <TH>Last Checked</TH>
                  <TH>
                    <span className="sr-only">Actions</span>
                  </TH>
                </TRow>
              </THead>
              <tbody>
                {sorted.map((s) => (
                  <TRow key={s.id}>
                    <TD className="text-ink">
                      <div className="font-semibold text-[13px] flex items-center gap-1.5">
                        {s.name}
                        {!s.enabled ? (
                          <span className="rounded-full border border-edge px-1.5 py-0.5 text-[10px] font-normal text-ink-3">
                            paused
                          </span>
                        ) : null}
                        {s.url ? (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ink-3 hover:text-accent-strong transition-colors"
                            title={`Open ${s.url}`}
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        ) : null}
                      </div>
                      <div className="truncate font-mono text-[11px] text-ink-3 max-w-64">
                        {s.url ?? "Internal endpoint (no URL)"}
                      </div>
                    </TD>
                    <TD>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge
                          status={s.enabled ? s.status : "paused"}
                          label={s.enabled ? undefined : "checks off"}
                        />
                        {!s.enabled && s.status !== "unknown" ? (
                          <span className="text-[10px] text-ink-3">last: {s.status}</span>
                        ) : null}
                      </div>
                    </TD>
                    {/* Real 8-tick check history; gray = no data yet */}
                    <TD>
                      <div
                        className="flex items-center gap-1.5"
                        title={
                          s.uptimePercent != null
                            ? `${s.uptimePercent.toFixed(1)}% up over the trailing 24h`
                            : "No check history yet"
                        }
                      >
                        <div className="flex items-center gap-1" aria-hidden>
                          {ticksFor(s.recentChecks, 8).map((t, i) => (
                            <span
                              key={i}
                              className={cn("h-4 w-1.5 rounded-xs transition-colors", tickTones[t])}
                            />
                          ))}
                        </div>
                        <span className="num text-[11px] text-ink-3">
                          {s.uptimePercent != null ? `${s.uptimePercent.toFixed(0)}%` : "—"}
                        </span>
                      </div>
                    </TD>
                    <TD className="num font-mono">
                      {s.httpStatus ? (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                            s.httpStatus >= 200 && s.httpStatus < 300
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                          )}
                        >
                          {s.httpStatus}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="num font-mono">
                      {s.responseTimeMs != null ? `${s.responseTimeMs} ms` : "—"}
                    </TD>
                    <TD className="num text-xs text-ink-3">
                      {s.lastCheck ? new Date(s.lastCheck).toLocaleTimeString() : "—"}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant={s.enabled ? "ghost" : "default"}
                          onClick={() => void toggleService(s.id, s.name, !s.enabled)}
                          disabled={togglingId !== null}
                          aria-pressed={s.enabled}
                          aria-label={`${s.enabled ? "Disable" : "Enable"} uptime checks for ${s.name}`}
                          title={s.enabled ? "Pause uptime checks" : "Enable uptime checks"}
                          className={s.enabled ? "text-ink-3 hover:text-accent-strong" : undefined}
                        >
                          {s.enabled ? (
                            <Power className="size-3.5" />
                          ) : (
                            <PowerOff className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                          className="h-7 w-7 p-0 text-ink-3 hover:text-rose-500"
                          title="Remove service"
                          aria-label={`Remove ${s.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TD>
                  </TRow>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      ) : null}

      {/* Add Service Card with Quick Presets */}
      <Card>
        <CardHeader className="border-b border-edge/40 bg-panel-2/30 py-3">
          <CardTitle>
            <Plus className="size-4 text-accent-strong" />
            <span>Add Monitored Service</span>
          </CardTitle>

          {/* Preset picker */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-ink-3 hidden sm:inline">Presets:</span>
            <Select
              onChange={(e) => {
                const p = presets.find((item) => item.name === e.target.value);
                if (p) {
                  setName(p.name);
                  setUrl(p.url);
                }
              }}
              defaultValue=""
              aria-label="Choose a service preset"
              className="h-8 min-w-44 text-xs"
            >
              <option value="" disabled>
                Choose preset…
              </option>
              {presets.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.url})
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardBody className="p-4">
          <form onSubmit={(e) => void add(e)} className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-56">
              <Field label="Service Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Nextcloud"
                />
              </Field>
            </div>
            <div className="w-full min-w-0 flex-1">
              <Field label="Healthcheck URL">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://localhost:8080/health"
                  inputMode="url"
                />
              </Field>
            </div>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-edge/70 bg-surface-muted/50 px-2.5 text-xs text-ink-2">
              <input
                type="checkbox"
                checked={enabledOnCreate}
                onChange={(e) => setEnabledOnCreate(e.target.checked)}
                className="size-3.5 accent-accent"
                aria-label="Enable uptime checks immediately"
              />
              Enable checks
            </label>
            <Button type="submit" disabled={busy || !name.trim()}>
              Add Service
            </Button>
          </form>
          {error ? <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p> : null}
        </CardBody>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove Service"
        description={
          deleteTarget ? (
            <>
              Are you sure you want to stop monitoring <strong>{deleteTarget.name}</strong>? Its
              health check probes will be terminated.
            </>
          ) : null
        }
        confirmLabel="Remove"
        onConfirm={removeService}
      />
    </div>
  );
}
