import { CloudOff, Inbox, TriangleAlert, type LucideIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "./button";

function Shell({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-edge bg-panel/50 px-6 py-10 text-center">
      <Icon className="size-6 text-ink-3" aria-hidden />
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-ink-2">{hint}</p> : null}
      {children}
    </div>
  );
}

export function EmptyState({
  title = "No data",
  hint,
}: {
  title?: string;
  hint?: string;
}): React.JSX.Element {
  return <Shell icon={Inbox} title={title} hint={hint} />;
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
    <Shell icon={TriangleAlert} title="Something went wrong" hint={message}>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </Shell>
  );
}
