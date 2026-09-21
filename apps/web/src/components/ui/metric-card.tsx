import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "./card";
import { cn } from "../../lib/cn";

/** Compact information-dense KPI card ( §19 ). */
export function MetricCard({
  label,
  value,
  sub,
  icon,
  spark,
  tone = "default",
  stale,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  spark?: React.ReactNode;
  tone?: "default" | "ok" | "warn" | "crit";
  stale?: boolean;
}): React.JSX.Element {
  const edge =
    tone === "ok"
      ? "border-emerald-500/20"
      : tone === "warn"
        ? "border-amber-500/25"
        : tone === "crit"
          ? "border-red-500/30"
          : "";
  return (
    <Card className={cn("min-w-0", edge)}>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-2">
          {icon}
          {label}
          {stale ? (
            <span className="ml-1 rounded bg-amber-500/15 px-1 text-[10px] normal-case text-amber-700 dark:text-amber-300">
              stale
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardBody className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="num truncate text-xl font-semibold tracking-tight text-ink">{value}</div>
          {sub ? <div className="num mt-0.5 truncate text-xs text-ink-2">{sub}</div> : null}
        </div>
        {spark ? <div className="h-9 w-24 shrink-0">{spark}</div> : null}
      </CardBody>
    </Card>
  );
}
