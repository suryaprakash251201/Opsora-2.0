import { CloudOff, Inbox, TriangleAlert, type LucideIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "./button";

function Shell({
  icon: Icon,
  title,
  hint,
  children,
  role,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children?: React.ReactNode;
  role?: "status" | "alert";
}): React.JSX.Element {
  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : role === "status" ? "polite" : undefined}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-edge/80 bg-panel/40 px-6 py-12 text-center shadow-sm"
    >
      <span className="grid size-11 place-items-center rounded-2xl border border-edge/80 bg-surface-muted text-ink-3 shadow-sm">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint ? <p className="max-w-md text-[13px] leading-relaxed text-ink-2">{hint}</p> : null}
      {children}
    </div>
  );
}

export function EmptyState({
  title = "No data",
  hint,
  children,
}: {
  title?: string;
  hint?: string;
  /** Optional actionable content (steps, links, copy buttons). */
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <Shell icon={Inbox} title={title} hint={hint} role="status">
      {children}
    </Shell>
  );
}

export function OfflineState({
  title = "Not connected",
  hint,
  onRetry,
}: {
  title?: string;
  hint?: string;
  onRetry?: () => void;
}): React.JSX.Element {
  return (
    <Shell
      icon={CloudOff}
      title={title}
      hint={
        hint ??
        "The integration is not connected. Configure it to see live data — nothing is fabricated."
      }
      role="status"
    >
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </Shell>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): React.JSX.Element {
  return (
    <Shell icon={TriangleAlert} title="Something went wrong" hint={message} role="alert">
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </Shell>
  );
}
