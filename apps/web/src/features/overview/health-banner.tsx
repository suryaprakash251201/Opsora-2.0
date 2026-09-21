import type * as React from "react";
import { timeAgo } from "@opsora/utils";
import { Activity, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router";
import type { OverviewResponse } from "../../lib/queries";
import { Card, CardBody } from "../../components/ui/card";
import { cn } from "../../lib/cn";

export function HealthBanner({ overview }: { overview: OverviewResponse }): React.JSX.Element {
  const { health } = overview;
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
        ? "Degraded — attention needed"
        : health.level === "critical"
          ? "Critical — action required"
          : "Status unknown";
  const tone =
    health.level === "healthy"
      ? "border-emerald-500/25 bg-emerald-500/[0.06]"
      : health.level === "warning"
        ? "border-amber-500/30 bg-amber-500/[0.06]"
        : health.level === "critical"
          ? "border-red-500/30 bg-red-500/[0.07]"
          : "border-edge bg-panel";

  return (
    <Card className={cn("border", tone)}>
      <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-3 py-3.5">
        <div className="flex items-center gap-3">
          <Icon className="size-6" aria-hidden />
          <div>
            <h1 className="text-base font-semibold tracking-tight">{headline}</h1>
            <p className="num text-xs text-ink-2">
              {health.total} monitored resources · {health.healthy} healthy · {health.warning}{" "}
              warning · {health.critical} critical
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-ink-2">
          <span className="num" title={overview.updatedAt}>
            Updated {timeAgo(overview.updatedAt)}
          </span>
          <Link
            to="/alerts"
            className="rounded-md border border-edge bg-void px-2 py-1 hover:border-ink-3"
          >
            View alerts
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
