import * as React from "react";
import { Suspense, lazy } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UptimeBucket, UptimeWindow } from "@opsora/types";
import { timeAgo } from "@opsora/utils";
import {
  Activity,
  CheckCircle2,
  Power,
  PowerOff,
  RefreshCw,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { setServiceEnabled, triggerServiceCheck, useUptime } from "../lib/queries";
import { keys } from "../lib/query";
import { cn } from "../lib/cn";
import { PageHeader } from "../components/ui/page-header";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { MetricCard } from "../components/ui/metric-card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";
import { SegmentedControl } from "../components/ui/segmented";
import { EmptyState, ErrorState } from "../components/ui/states";
import { useUi } from "../stores/ui";

const WINDOWS: { id: UptimeWindow; label: string }[] = [
  { id: "1h", label: "Last hour" },
  { id: "24h", label: "Last 24h" },
  { id: "7d", label: "Last 7 days" },
];

const BAR_TONES: Record<UptimeBucket["status"], string> = {
  up: "bg-emerald-500/85",
  degraded: "bg-amber-400/85",
  down: "bg-rose-500/90",
  unknown: "bg-edge/70",
};

const SERIES_COLORS = ["#38bdf8", "#34d399", "#a78bfa", "#fbbf24", "#fb7185", "#22d3ee"];

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  if (v === 100) return "100%";
  return `${v.toFixed(2)}%`;
}

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function bucketTip(b: UptimeBucket): string {
  const when = new Date(b.t).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const lat = b.avgMs != null ? ` · ${b.avgMs}ms` : "";
  const n = b.count > 0 ? ` · ${b.count} check${b.count === 1 ? "" : "s"}` : " · no checks";
  return `${when} · ${b.status}${lat}${n}`;
}

function LegendDot({ cls, label }: { cls: string; label: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("size-2 rounded-[3px]", cls)} aria-hidden />
      {label}
    </span>
  );
}

const ResponseChart = lazy(() =>
  import("../components/charts/echart").then((m) => ({
    default: function ResponseChart({
      services,
    }: {
      services: { name: string; buckets: UptimeBucket[] }[];
    }): React.JSX.Element {
      const theme = useUi((s) => s.theme);
      const axis = theme === "dark" ? "#5f6e8c" : "#94a3b8";
      const legend = theme === "dark" ? "#9aa8c4" : "#475569";
      const split = theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.08)";
      const labels = (services[0]?.buckets ?? []).map((b) =>
        new Date(b.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
      return (
        <m.EChart
          ariaLabel="Response time chart for monitored services"
          height={240}
          option={{
            grid: { left: 44, right: 12, top: 30, bottom: 26 },
            legend: { textStyle: { color: legend }, top: 0, type: "scroll" },
            tooltip: { trigger: "axis", valueFormatter: (v: number) => `${v} ms` },
            xAxis: {
              type: "category",
              data: labels,
              axisLabel: { color: axis, fontSize: 10 },
              axisLine: { lineStyle: { color: split } },
            },
            yAxis: {
              type: "value",
              name: "ms",
              nameTextStyle: { color: axis },
              axisLabel: { color: axis, fontSize: 10 },
              splitLine: { lineStyle: { color: split } },
            },
            series: services.map((s, i) => ({
              name: s.name,
              type: "line",
              smooth: true,
              showSymbol: false,
              connectNulls: true,
              data: s.buckets.map((b) => b.avgMs),
              lineStyle: { width: 2, color: SERIES_COLORS[i % SERIES_COLORS.length] },
              itemStyle: { color: SERIES_COLORS[i % SERIES_COLORS.length] },
            })),
          }}
        />
      );
    },
  })),
);

export function UptimePage(): React.JSX.Element {
  const [win, setWin] = React.useState<UptimeWindow>("24h");
  const { data, isLoading, isError, isFetching, refetch } = useUptime(win);
  const qc = useQueryClient();
  const addToast = useUi((s) => s.addToast);
  const [checking, setChecking] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  async function toggleService(id: string, name: string, enabled: boolean): Promise<void> {
    setTogglingId(id);
    try {
      await setServiceEnabled(id, enabled);
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.uptime(win) }),
        qc.invalidateQueries({ queryKey: keys.services }),
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

  async function runChecks(): Promise<void> {
    setChecking(true);
    try {
      await triggerServiceCheck();
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.uptime(win) }),
        qc.invalidateQueries({ queryKey: keys.services }),
      ]);
      addToast({
        title: "Uptime checks complete",
        message: "The latest results are now reflected across the monitor.",
        type: "success",
      });
    } catch {
      addToast({
        title: "Uptime check failed",
        message: "No results were saved. Try again in a moment.",
        type: "error",
      });
    } finally {
      setChecking(false);
    }
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        ariaLabel="Uptime window"
        value={win}
        onChange={setWin}
        options={WINDOWS.map((w) => ({ value: w.id, label: w.id }))}
        size="sm"
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => void refetch()}
        disabled={isFetching}
        className="gap-1.5 text-xs"
      >
        <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
        Refresh
      </Button>
      <Button
        size="sm"
        onClick={() => void runChecks()}
        disabled={checking}
        className="gap-1.5 text-xs"
      >
        <Activity className={cn("size-3.5", checking && "animate-pulse")} />
        Check now
      </Button>
    </div>
  );

  if (isLoading)
    return (
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="Uptime Monitor"
          description="Built-in HTTP checks, uptime windows, and incident history."
          actions={actions}
        />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );

  if (isError || !data)
    return (
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="Uptime Monitor"
          description="Built-in HTTP checks, uptime windows, and incident history."
          actions={actions}
        />
        <ErrorState message="Couldn't load the uptime report." onRetry={() => void refetch()} />
      </div>
    );

  const list = data.services;
  const incidents = data.incidents;
  const ongoing = incidents.filter((i) => i.ongoing);
  const enabledServices = list.filter((s) => s.enabled);
  const enabledCount = enabledServices.length;
  const upCount = enabledServices.filter((s) => s.status === "up").length;
  const latencies = enabledServices
    .map((s) => s.avgLatencyMs)
    .filter((v): v is number => v != null);
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null;
  const enabledUptime = enabledServices
    .map((s) => s.uptime[win])
    .filter((v): v is number => v != null);
  const enabledOverallUptime =
    enabledUptime.length > 0
      ? enabledUptime.reduce((a, b) => a + b, 0) / enabledUptime.length
      : null;
  const label = WINDOWS.find((w) => w.id === win)?.label ?? "";
  const chartSeries = enabledServices
    .map((s) => ({ name: s.name, buckets: s.buckets }))
    .filter((s) => s.buckets.some((b) => b.avgMs != null));
  const bannerTone =
    enabledCount === 0
      ? "border-edge/70 bg-surface-muted/60 text-ink-2"
      : ongoing.length > 0
        ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
        : upCount < enabledCount
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  const bannerText =
    enabledCount === 0
      ? "Uptime monitoring is paused"
      : ongoing.length > 0
        ? `${ongoing.length} ongoing incident${ongoing.length === 1 ? "" : "s"}`
        : upCount < enabledCount
          ? `${enabledCount - upCount} enabled service${enabledCount - upCount === 1 ? "" : "s"} need attention`
          : `All enabled systems operational — ${upCount}/${enabledCount} up`;

  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="Uptime Monitor"
        description={`Built-in HTTP checks — ${label.toLowerCase()}, binned timeline, and incidents derived from recorded samples.`}
        actions={actions}
      />

      {list.length === 0 ? (
        <EmptyState
          title="No services yet"
          hint="Add a service on the Services page — checks run every 30s and timeline bars appear right after the first samples."
        />
      ) : (
        <>
          {/* Overall banner — derived, never assumed */}
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium",
              bannerTone,
            )}
            role="status"
          >
            {enabledCount === 0 ? (
              <PowerOff className="size-4 shrink-0" />
            ) : ongoing.length > 0 ? (
              <TriangleAlert className="size-4 shrink-0" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0" />
            )}
            {bannerText}
            <span className="num ml-auto text-[11px] font-normal opacity-70">
              report {timeAgo(data.updatedAt)}
            </span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              label={`Uptime ${win}`}
              icon={<Timer className="size-3.5" />}
              value={fmtPct(enabledOverallUptime)}
              sub={`mean across ${enabledCount} enabled service${enabledCount === 1 ? "" : "s"}`}
              tone={enabledOverallUptime == null ? "default" : "ok"}
            />
            <MetricCard
              label="Services up"
              icon={<CheckCircle2 className="size-3.5" />}
              value={enabledCount > 0 ? `${upCount}/${enabledCount}` : "—"}
              sub={
                enabledCount === 0
                  ? "monitoring paused"
                  : upCount === enabledCount
                    ? "all healthy"
                    : "needs attention"
              }
              tone={enabledCount === 0 ? "default" : upCount === enabledCount ? "ok" : "crit"}
            />
            <MetricCard
              label="Checks enabled"
              icon={<Power className="size-3.5" />}
              value={`${enabledCount}/${list.length}`}
              sub="scheduled monitors"
              tone={enabledCount === list.length ? "ok" : enabledCount === 0 ? "default" : "warn"}
            />
            <MetricCard
              label="Ongoing incidents"
              icon={<TriangleAlert className="size-3.5" />}
              value={ongoing.length}
              sub={`${incidents.length} in this window`}
              tone={ongoing.length > 0 ? "crit" : "ok"}
            />
            <MetricCard
              label="Avg response"
              icon={<Activity className="size-3.5" />}
              value={avgLatency != null ? `${avgLatency}ms` : "—"}
              sub="mean of real samples"
            />
          </div>

          {/* Per-service timelines */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Monitored services</CardTitle>
                  <CardDescription>
                    One bar per time bucket — hover for exact samples. Worst status wins a bucket.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-ink-3">
                  <LegendDot cls="bg-emerald-500" label="up" />
                  <LegendDot cls="bg-amber-400" label="degraded" />
                  <LegendDot cls="bg-rose-500" label="down" />
                  <LegendDot cls="bg-edge" label="no data" />
                </div>
              </div>
            </CardHeader>
            <CardBody className="grid gap-0">
              {list.map((s) => (
                <div
                  key={s.id}
                  className="grid gap-2 border-b border-edge/40 py-3 last:border-0 last:pb-0 md:grid-cols-[minmax(0,240px)_1fr_auto] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-ink">{s.name}</span>
                      <StatusBadge status={s.status} />
                      {!s.enabled ? (
                        <span className="shrink-0 rounded-full border border-edge px-1.5 py-0.5 text-[10px] text-ink-3">
                          checks off
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate font-mono text-[11px] text-ink-3">{s.url ?? "no URL"}</p>
                    <p className="truncate text-[11px] text-ink-3">
                      {s.lastCheck ? `checked ${timeAgo(s.lastCheck)}` : "never checked"}
                      {s.error ? ` · ${s.error}` : ""}
                    </p>
                  </div>
                  <div
                    className="flex h-8 gap-px overflow-hidden rounded-md bg-void/60 p-0.5"
                    role="img"
                    aria-label={`${s.name} ${label} history`}
                  >
                    {s.buckets.map((b) => (
                      <div
                        key={b.t}
                        title={bucketTip(b)}
                        className={cn(
                          "min-w-0 flex-1 rounded-[2px] transition-opacity hover:opacity-60",
                          BAR_TONES[b.status],
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 md:justify-end">
                    <div className="text-right">
                      <p className="num text-sm font-bold text-ink">{fmtPct(s.uptime[win])}</p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-3">
                        uptime {win}
                      </p>
                    </div>
                    <div className="w-16 text-right">
                      <p className="num text-sm font-semibold text-ink-2">
                        {s.avgLatencyMs != null ? `${s.avgLatencyMs}ms` : "—"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-3">avg resp</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={s.enabled ? "secondary" : "default"}
                      onClick={() => void toggleService(s.id, s.name, !s.enabled)}
                      disabled={togglingId !== null}
                      aria-pressed={s.enabled}
                      aria-label={`${s.enabled ? "Disable" : "Enable"} uptime checks for ${s.name}`}
                      title={s.enabled ? "Pause uptime checks" : "Enable uptime checks"}
                      className="min-w-[92px] gap-1.5 text-[11px]"
                    >
                      {s.enabled ? (
                        <Power className="size-3.5" />
                      ) : (
                        <PowerOff className="size-3.5" />
                      )}
                      <span>{togglingId === s.id ? "Saving…" : s.enabled ? "On" : "Off"}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Response-time chart */}
          {chartSeries.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Response time</CardTitle>
                <CardDescription>
                  Mean latency per bucket for {label.toLowerCase()} — real samples only, gaps left
                  empty.
                </CardDescription>
              </CardHeader>
              <CardBody>
                <Suspense fallback={<Skeleton className="h-60 w-full" />}>
                  <ResponseChart services={chartSeries} />
                </Suspense>
              </CardBody>
            </Card>
          ) : null}

          {/* Incidents */}
          {incidents.length === 0 ? (
            <EmptyState
              title="No incidents in this window"
              hint="No down or degraded samples were recorded — nothing to report."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Incidents</CardTitle>
                <CardDescription>
                  Derived from down/degraded transitions in recorded checks — ongoing first.
                </CardDescription>
              </CardHeader>
              <CardBody className="grid gap-2">
                {incidents.map((i) => (
                  <div
                    key={i.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-edge/50 bg-void/40 px-3 py-2.5"
                  >
                    <StatusBadge status={i.status} />
                    <span className="min-w-0 truncate text-[13px] font-medium text-ink">
                      {i.serviceName}
                    </span>
                    <span className="text-xs text-ink-2">
                      {i.ongoing ? (
                        <span className="text-rose-700 dark:text-rose-300">
                          ongoing — started {timeAgo(i.startedAt)}
                        </span>
                      ) : (
                        <>
                          started {timeAgo(i.startedAt)} · recovered{" "}
                          {timeAgo(i.endedAt ?? i.startedAt)}
                        </>
                      )}
                    </span>
                    <span className="num ml-auto text-[11px] text-ink-3">
                      {i.ongoing
                        ? `${fmtDuration(Date.now() - Date.parse(i.startedAt))} so far`
                        : fmtDuration(i.durationMs ?? 0)}
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
