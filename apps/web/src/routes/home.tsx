import type * as React from "react";
import { Suspense, lazy } from "react";
import { useOverview } from "../lib/queries";
import { HealthBanner } from "../features/overview/health-banner";
import { KpiCards } from "../features/overview/kpi-cards";
import { ServerList } from "../features/overview/server-list";
import { AlertsPanel, ActivityFeed } from "../features/overview/alerts-activity";
import { DockerMini, NetworkMini, ServicesMini } from "../features/overview/panels";
import { ErrorState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";

// ECharts is heavy — split it out so first paint stays fast ( §37 ).
const HistoryCharts = lazy(() =>
  import("../features/overview/history").then((m) => ({ default: m.HistoryCharts })),
);

/** Home — information hierarchy per §53: problems → availability → usage → services → network → events. */
export function HomePage(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useOverview();

  if (isLoading) {
    return (
      <div className="grid gap-2.5 p-3 md:p-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isError || !data)
    return (
      <div className="p-3 md:p-4">
        <ErrorState
          message="Could not reach the Opsora API. Check that the backend is running."
          onRetry={() => void refetch()}
        />
      </div>
    );

  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <HealthBanner overview={data} />
      <KpiCards />
      <ServerList compact />
      <div className="grid gap-2.5 lg:grid-cols-2">
        <NetworkMini />
        <ServicesMini />
      </div>
      <div className="grid gap-2.5 lg:grid-cols-2">
        <AlertsPanel />
        <DockerMini />
      </div>
      <ActivityFeed />
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <HistoryCharts />
      </Suspense>
    </div>
  );
}
