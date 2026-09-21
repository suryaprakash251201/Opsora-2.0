import type * as React from "react";
import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }): React.JSX.Element {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-skeleton", className)} />;
}

export function CardSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-lg border border-edge bg-panel p-3.5" aria-label="Loading">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-3 h-8 w-2/3" />
      <Skeleton className="mt-2 h-3 w-full" />
    </div>
  );
}
