import type * as React from "react";
import { AlertTriangle, CheckCircle2, MinusCircle, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

// Light text tuned for light surfaces, dark: variant for dark surfaces.
// Status colour is never the only signal — always icon + text ( §34 ).
const tones: Record<string, { cls: string; Icon: LucideIcon }> = {
  healthy: {
    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  up: {
    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  connected: {
    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  running: {
    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  online: {
    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  active: {
    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  warning: {
    cls: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300",
    Icon: AlertTriangle,
  },
  degraded: {
    cls: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300",
    Icon: AlertTriangle,
  },
  critical: {
    cls: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300",
    Icon: XCircle,
  },
  down: {
    cls: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300",
    Icon: XCircle,
  },
  offline: {
    cls: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300",
    Icon: XCircle,
  },
  unknown: {
    cls: "bg-zinc-500/10 text-zinc-600 border-zinc-500/25 dark:text-zinc-400",
    Icon: MinusCircle,
  },
  not_connected: {
    cls: "bg-zinc-500/10 text-zinc-600 border-zinc-500/25 dark:text-zinc-400",
    Icon: MinusCircle,
  },
  unavailable: {
    cls: "bg-zinc-500/10 text-zinc-600 border-zinc-500/25 dark:text-zinc-400",
    Icon: MinusCircle,
  },
  stale: {
    cls: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300",
    Icon: AlertTriangle,
  },
  info: { cls: "bg-accent/10 text-accent-strong border-accent/25", Icon: MinusCircle },
  acknowledged: { cls: "bg-accent/10 text-accent-strong border-accent/25", Icon: MinusCircle },
  muted: {
    cls: "bg-zinc-500/10 text-zinc-600 border-zinc-500/25 dark:text-zinc-400",
    Icon: MinusCircle,
  },
  resolved: {
    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
};

const fallback = {
  cls: "bg-zinc-500/10 text-zinc-600 border-zinc-500/25 dark:text-zinc-400",
  Icon: MinusCircle,
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}): React.JSX.Element {
  const key = status.toLowerCase();
  const tone = tones[key] ?? fallback;
  const { Icon } = tone;
  const text = label ?? status.replace(/_/g, " ");
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        tone.cls,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {text}
    </span>
  );
}

export function StatusDot({
  status,
  live = false,
  className,
}: {
  status: string;
  live?: boolean;
  className?: string;
}): React.JSX.Element {
  const key = status.toLowerCase();
  const isOk = ["healthy", "up", "connected", "running", "online"].includes(key);
  const isWarn = ["warning", "degraded", "stale"].includes(key);
  const isCrit = ["critical", "down", "offline"].includes(key);
  const isInfo = ["info"].includes(key);
  const color = isOk
    ? "bg-emerald-400"
    : isWarn
      ? "bg-amber-400"
      : isCrit
        ? "bg-red-400"
        : isInfo
          ? "bg-accent"
          : "bg-zinc-500";
  const liveColor = isOk
    ? "#34d399"
    : isWarn
      ? "#fbbf24"
      : isCrit
        ? "#f87171"
        : isInfo
          ? "#38bdf8"
          : "#a1a1aa";
  return (
    <span
      className={cn("inline-block size-2 rounded-full", color, live && "live-pulse", className)}
      style={live ? ({ "--live-color": liveColor } as React.CSSProperties) : undefined}
      aria-hidden
    >
      <span className="sr-only">{status}</span>
    </span>
  );
}
