import * as React from "react";
import { cn } from "../../lib/cn";

export type ProgressBarTone = "auto" | "default" | "ok" | "warn" | "crit" | "accent";

export function ProgressBar({
  value,
  max = 100,
  tone = "auto",
  size = "sm",
  label,
  showValue = false,
  className,
}: {
  value: number | null | undefined;
  max?: number;
  tone?: ProgressBarTone;
  size?: "xs" | "sm" | "md" | "lg";
  label?: string;
  showValue?: boolean;
  className?: string;
}): React.JSX.Element {
  const hasValue = value != null && !Number.isNaN(value);
  const safeValue = hasValue ? Math.max(0, Math.min(max, value)) : 0;
  const percent = max > 0 ? (safeValue / max) * 100 : 0;

  // Resolve tone
  let resolvedTone = tone;
  if (tone === "auto") {
    if (percent >= 90) resolvedTone = "crit";
    else if (percent >= 75) resolvedTone = "warn";
    else resolvedTone = "ok";
  }

  const fillColors: Record<ProgressBarTone, string> = {
    auto: "bg-accent",
    default: "bg-ink-2",
    ok: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
    warn: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
    crit: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.35)]",
    accent: "bg-accent shadow-[0_0_8px_var(--color-accent)]",
  };

  const heightClasses = {
    xs: "h-1",
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5",
  };

  return (
    <div className={cn("w-full space-y-1", className)}>
      {label || showValue ? (
        <div className="flex items-center justify-between text-xs">
          {label ? <span className="font-medium text-ink-2">{label}</span> : null}
          {showValue ? (
            <span className="num font-semibold text-ink">
              {value == null ? "—" : `${Math.round(percent)}%`}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-edge/60 dark:bg-edge/80",
          !hasValue &&
            "bg-[linear-gradient(135deg,var(--edge)_25%,transparent_25%,transparent_50%,var(--edge)_50%,var(--edge)_75%,transparent_75%)] bg-[length:8px_8px]",
          heightClasses[size],
        )}
        role="progressbar"
        aria-valuenow={hasValue ? Math.round(percent) : undefined}
        aria-valuetext={hasValue ? undefined : "No data"}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? "Progress"}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            fillColors[resolvedTone],
            percent >= 90 && "animate-pulse",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
