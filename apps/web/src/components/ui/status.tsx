import type * as React from "react";
import { AlertTriangle, CheckCircle2, MinusCircle, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

const tones: Record<string, { cls: string; Icon: LucideIcon }> = {
  healthy: { cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25", Icon: CheckCircle2 },
  up: { cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25", Icon: CheckCircle2 },
  connected: {
    cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    Icon: CheckCircle2,
  },
  running: { cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25", Icon: CheckCircle2 },
  online: { cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25", Icon: CheckCircle2 },
  warning: { cls: "bg-amber-500/10 text-amber-300 border-amber-500/25", Icon: AlertTriangle },
  degraded: { cls: "bg-amber-500/10 text-amber-300 border-amber-500/25", Icon: AlertTriangle },
  critical: { cls: "bg-red-500/10 text-red-300 border-red-500/30", Icon: XCircle },
  down: { cls: "bg-red-500/10 text-red-300 border-red-500/30", Icon: XCircle },
  offline: { cls: "bg-red-500/10 text-red-300 border-red-500/30", Icon: XCircle },
  unknown: { cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25", Icon: MinusCircle },
  not_connected: { cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25", Icon: MinusCircle },
  unavailable: { cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25", Icon: MinusCircle },
  stale: { cls: "bg-amber-500/10 text-amber-300 border-amber-500/25", Icon: AlertTriangle },
  info: { cls: "bg-sky-500/10 text-sky-300 border-sky-500/25", Icon: MinusCircle },
};

/** Status colour is never the only signal — always icon + text ( §34 ). */
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
  const tone = tones[key] ?? tones.unknown ?? { cls: "", Icon: MinusCircle };
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
  className,
}: {
  status: string;
  className?: string;
}): React.JSX.Element {
  const key = status.toLowerCase();
  const color = ["healthy", "up", "connected", "running", "online"].includes(key)
    ? "bg-emerald-400"
    : ["warning", "degraded", "stale"].includes(key)
      ? "bg-amber-400"
      : ["critical", "down", "offline"].includes(key)
        ? "bg-red-400"
        : ["info"].includes(key)
          ? "bg-sky-400"
          : "bg-zinc-500";
  return (
    <span className={cn("inline-block size-2 rounded-full", color, className)} aria-hidden>
      <span className="sr-only">{status}</span>
    </span>
  );
}
