import type * as React from "react";
import { timeAgo } from "@opsora/utils";
import { useActivity, useEvents } from "../lib/queries";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { EmptyState, ErrorState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";

function Feed({
  title,
  items,
  loading,
  error,
  retry,
}: {
  title: string;
  items?: {
    id: string;
    ts: string;
    category: string;
    resource: string | null;
    message: string;
    severity: string;
  }[];
  loading: boolean;
  error: boolean;
  retry: () => void;
}): React.JSX.Element {
  if (loading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardBody>
          <Skeleton className="h-40 w-full" />
        </CardBody>
      </Card>
    );
  if (error)
    return <ErrorState message={`Could not load ${title.toLowerCase()}.`} onRetry={retry} />;
  if (!items || items.length === 0)
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardBody>
          <EmptyState
            title="Nothing yet"
            hint="Events stream in over SSE as infrastructure changes."
          />
        </CardBody>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} · {items.length}
        </CardTitle>
      </CardHeader>
      <CardBody>
        <ol className="grid gap-2.5">
          {items.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-2 rounded-md border border-edge/60 bg-void/50 px-2.5 py-2 text-[13px]"
            >
              <StatusBadge status={e.severity} />
              <div className="min-w-0">
                <p className="text-ink-2">
                  <span className="font-medium text-ink">{e.resource ?? e.category}</span> —{" "}
                  {e.message}
                </p>
                <p className="num text-[11px] text-ink-3">
                  {timeAgo(e.ts)} · {e.category}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

export function ActivityPage(): React.JSX.Element {
  const activity = useActivity();
  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">Activity</h1>
      <Feed
        title="Infrastructure events"
        items={activity.data?.activity}
        loading={activity.isLoading}
        error={activity.isError}
        retry={() => void activity.refetch()}
      />
    </div>
  );
}

export function LogsPage(): React.JSX.Element {
  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">Logs</h1>
      <Card>
        <CardHeader>
          <CardTitle>Log aggregation</CardTitle>
          <StatusBadge status="not_connected" />
        </CardHeader>
        <CardBody>
          <EmptyState
            title="No log sources connected"
            hint="Log ingestion ships incrementally. This view paginates and virtualises once sources are configured — it never fabricates entries."
          />
        </CardBody>
      </Card>
    </div>
  );
}

export function MonitoringPage(): React.JSX.Element {
  const events = useEvents();
  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">Monitoring</h1>
      <Feed
        title="Event stream"
        items={events.data?.events}
        loading={events.isLoading}
        error={events.isError}
        retry={() => void events.refetch()}
      />
    </div>
  );
}
