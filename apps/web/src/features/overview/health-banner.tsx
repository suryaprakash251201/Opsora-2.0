import * as React from "react";
import { timeAgo } from "@opsora/utils";
import { Activity, AlertTriangle, CheckCircle2, Play, RefreshCw, XCircle } from "lucide-react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { OverviewResponse } from "../../lib/queries";
import { triggerServiceCheck } from "../../lib/queries";
import { Card, CardBody } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { StatusDot } from "../../components/ui/status";
import { useUi } from "../../stores/ui";
import { cn } from "../../lib/cn";

export function HealthBanner({ overview }: { overview: OverviewResponse }): React.JSX.Element {
  const { health } = overview;
  const qc = useQueryClient();
  const addToast = useUi((s) => s.addToast);
  const [checking, setChecking] = React.useState(false);

  const Icon =
    health.level === "healthy"
      ? CheckCircle2
      : health.level === "warning"
        ? AlertTriangle
        : health.level === "critical"
          ? XCircle
          : Activity;

  const headline =
    health.level === "healthy"
      ? "All Systems Operational"
      : health.level === "warning"
        ? "Degraded Performance — Attention Needed"
        : health.level === "critical"
          ? "Critical Incident — Immediate Action Required"
          : "Status Unknown";

  const tone =
    health.level === "healthy"
      ? "border-emerald-500/30 bg-emerald-500/[0.04] shadow-emerald-500/5"
      : health.level === "warning"
        ? "border-amber-500/35 bg-amber-500/[0.04] shadow-amber-500/5"
        : health.level === "critical"
          ? "border-rose-500/40 bg-rose-500/[0.05] shadow-rose-500/10"
          : "border-edge/80 bg-panel";

  const healthColor =
    health.level === "healthy"
      ? "#34d399"
      : health.level === "warning"
        ? "#fbbf24"
        : health.level === "critical"
          ? "#fb7185"
          : "#8292ae";
  const healthScore = health.total > 0 ? Math.round((health.healthy / health.total) * 100) : null;
  const healthyPct = health.total > 0 ? (health.healthy / health.total) * 100 : 0;
  const warningPct = health.total > 0 ? (health.warning / health.total) * 100 : 0;
  const criticalPct = health.total > 0 ? (health.critical / health.total) * 100 : 0;
  const healthRing = `conic-gradient(${healthColor} ${healthScore == null ? 0 : healthScore * 3.6}deg, color-mix(in srgb, ${healthColor} 12%, transparent) 0)`;

  const handleRunChecks = async (): Promise<void> => {
    setChecking(true);
    try {
      await triggerServiceCheck();
      await qc.invalidateQueries();
      addToast({
        title: "Checks Completed",
        message: "Real-time health verification executed across all services.",
        type: "success",
      });
    } catch {
      addToast({
        title: "Check Failed",
        message: "Could not complete health check run.",
        type: "error",
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className={cn("border transition-all duration-300", tone)}>
      <CardBody className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="relative grid size-14 shrink-0 place-items-center"
              role="img"
              aria-label={`${headline}: ${healthScore == null ? "no score" : `${healthScore}% healthy`}`}
            >
              <span
                className="absolute inset-0 rounded-full shadow-[0_0_22px_-8px_var(--health-color)]"
                style={
                  { background: healthRing, "--health-color": healthColor } as React.CSSProperties
                }
                aria-hidden
              />
              <span className="absolute inset-[5px] rounded-full bg-panel" aria-hidden />
              <Icon className="relative size-5" style={{ color: healthColor }} aria-hidden />
              <span className="absolute -bottom-1 rounded-full border border-edge/80 bg-panel px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink shadow-sm">
                {healthScore == null ? "—" : `${healthScore}%`}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-ink">{headline}</h2>
              </div>
              <p className="num mt-0.5 text-xs text-ink-2">
                {health.total} resources monitored ·{" "}
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {health.healthy} healthy
                </span>
                {health.warning > 0 ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {health.warning} warning
                    </span>
                  </>
                ) : null}
                {health.critical > 0 ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      {health.critical} critical
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <Button
              size="sm"
              variant="secondary"
              disabled={checking}
              onClick={() => void handleRunChecks()}
              className="gap-1.5 font-medium"
            >
              {checking ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3 fill-current" />
              )}
              {checking ? "Checking…" : "Run checks"}
            </Button>
            <Link
              to="/alerts"
              className="rounded-lg border border-edge/80 bg-panel px-3 py-1.5 font-medium text-ink-2 hover:border-accent/40 hover:text-ink transition-colors"
            >
              View alerts
            </Link>
          </div>
        </div>

        {/* Segmented resource distribution visual bar */}
        <div
          className="mt-3.5 space-y-1.5"
          role="img"
          aria-label={`Status distribution: ${health.healthy} healthy, ${health.warning} warning, ${health.critical} critical of ${health.total} resources`}
        >
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-edge/40" aria-hidden>
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${healthyPct}%` }}
            />
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${warningPct}%` }}
            />
            <div
              className="h-full bg-rose-500 transition-all duration-500"
              style={{ width: `${criticalPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-ink-3">
            <span className="num">Updated {timeAgo(overview.updatedAt)}</span>
            <span className="flex items-center gap-1">
              <StatusDot status="connected" live />
              Real-time telemetry
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
