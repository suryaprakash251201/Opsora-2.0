import * as React from "react";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "./card";
import { ProgressBar, type ProgressBarTone } from "./progress-bar";
import { cn } from "../../lib/cn";

export type MetricCardTone = "default" | "ok" | "warn" | "crit" | "accent" | "good" | "normal";

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Either a rendered node or a Lucide icon component. */
  icon?: React.ReactNode | LucideIcon;
  spark?: React.ReactNode;
  tone?: MetricCardTone;
  stale?: boolean;
  progress?:
    | number
    | {
        value: number | null | undefined;
        max?: number;
        tone?: ProgressBarTone;
      };
  delta?: {
    value: string;
    trend?: "up" | "down" | "neutral";
    isPositive?: boolean;
  };
  badge?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/** Lucide icons are forwardRef objects ({$$typeof, render}), not functions. */
function isComponentType(v: unknown): v is LucideIcon {
  return typeof v === "function" || (typeof v === "object" && v !== null && "$$typeof" in v);
}

/** Information-dense, visual KPI card with gauge/progress, sparklines, and status glow. */
export function MetricCard({
  label,
  value,
  sub,
  icon,
  spark,
  tone = "default",
  stale,
  progress,
  delta,
  badge,
  action,
  onClick,
  className,
}: MetricCardProps): React.JSX.Element {
  // "good" and "normal" are accepted as aliases for "ok" and "default".
  const resolved: "default" | "ok" | "warn" | "crit" | "accent" =
    tone === "good" ? "ok" : tone === "normal" ? "default" : tone;
  const progressObj = typeof progress === "number" ? { value: progress } : progress;
  const renderedIcon = React.isValidElement(icon)
    ? icon
    : isComponentType(icon)
      ? (() => {
          const Cmp = icon;
          return <Cmp className="size-3.5" aria-hidden />;
        })()
      : icon;
  const tones = {
    default: "border-edge/80 bg-panel/95 hover:border-accent/35",
    ok: "border-emerald-500/30 bg-emerald-500/[0.02] hover:border-emerald-500/50 hover:shadow-emerald-500/5",
    warn: "border-amber-500/35 bg-amber-500/[0.02] hover:border-amber-500/55 hover:shadow-amber-500/5",
    crit: "border-rose-500/40 bg-rose-500/[0.03] hover:border-rose-500/60 hover:shadow-rose-500/10",
    accent: "border-accent/35 bg-accent/[0.02] hover:border-accent/55 hover:shadow-accent/10",
  };

  const metricLineTones = {
    default: "bg-accent/70",
    ok: "bg-emerald-400/80",
    warn: "bg-amber-400/80",
    crit: "bg-rose-400/80",
    accent: "bg-accent",
  };

  const iconTones = {
    default: "bg-surface-muted text-ink-2",
    ok: "bg-emerald-500/15 text-emerald-500",
    warn: "bg-amber-500/15 text-amber-500",
    crit: "bg-rose-500/15 text-rose-500",
    accent: "bg-accent/15 text-accent-strong",
  };

  return (
    <Card
      onClick={onClick}
      aria-label={onClick ? `${label}${typeof value === "string" ? `: ${value}` : ""}` : undefined}
      className={cn(
        "metric-card group min-w-0 overflow-hidden transition-all duration-200",
        tones[resolved],
        onClick && "cursor-pointer hover:-translate-y-0.5",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("metric-card-line absolute inset-x-4 top-0 h-px", metricLineTones[resolved])}
      />
      <CardHeader className="flex items-center justify-between px-4 pb-1.5 pt-3.5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-3">
          {renderedIcon ? (
            <span
              className={cn(
                "grid size-7 place-items-center rounded-lg text-xs transition-colors",
                iconTones[resolved],
              )}
            >
              {renderedIcon}
            </span>
          ) : null}
          <span className="truncate">{label}</span>
          {stale ? (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-medium normal-case text-amber-700 dark:text-amber-300">
              stale
            </span>
          ) : null}
        </CardTitle>
        <div className="flex items-center gap-1.5">
          {badge}
          {action}
          {onClick ? (
            <ArrowUpRight
              className="size-3.5 text-ink-3 opacity-0 transition-all duration-200 group-hover/card:translate-x-0.5 group-hover/card:text-accent-strong group-hover/card:opacity-100"
              aria-hidden
            />
          ) : null}
        </div>
      </CardHeader>
      <CardBody className="px-4 pb-4">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <div className="num truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">
                {value}
              </div>
              {delta ? (
                <span
                  className={cn(
                    "inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded",
                    delta.isPositive
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                  )}
                >
                  {delta.trend === "up" ? "↑" : delta.trend === "down" ? "↓" : ""} {delta.value}
                </span>
              ) : null}
            </div>
            {sub ? <div className="num mt-1 truncate text-xs text-ink-2">{sub}</div> : null}
          </div>
          {spark ? (
            <div className="h-8 w-16 shrink-0 overflow-hidden opacity-90 transition-opacity group-hover:opacity-100 sm:h-9 sm:w-20">
              {spark}
            </div>
          ) : null}
        </div>
        {progressObj ? (
          <div className="mt-2.5">
            <ProgressBar
              value={progressObj.value}
              max={progressObj.max}
              tone={progressObj.tone}
              size="xs"
            />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
