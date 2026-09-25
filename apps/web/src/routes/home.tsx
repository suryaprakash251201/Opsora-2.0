import type * as React from "react";
import { Suspense, lazy } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Radio } from "lucide-react";
import { useOverview } from "../lib/queries";
import { HealthBanner } from "../features/overview/health-banner";
import { KpiCards } from "../features/overview/kpi-cards";
import { ServerList } from "../features/overview/server-list";
import { AlertsPanel, ActivityFeed } from "../features/overview/alerts-activity";
import { DockerMini, NetworkMini, ServicesMini } from "../features/overview/panels";
import { QuickActions } from "../features/overview/quick-actions";
import { ErrorState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/ui/page-header";
import { StatusDot } from "../components/ui/status";

// ECharts is heavy — split it out so first paint stays fast ( §37 ).
const HistoryCharts = lazy(() =>
  import("../features/overview/history").then((m) => ({ default: m.HistoryCharts })),
);

function HeaderLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Link
      to={to}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-edge/80 bg-panel-2/70 px-3 text-xs font-semibold text-ink-2 transition-all hover:border-accent/40 hover:bg-hover hover:text-ink"
    >
      {children}
      <ArrowUpRight className="size-3.5" aria-hidden />
    </Link>
  );
}

/** Home — information hierarchy per §53: problems → availability → usage → services → network → events. */
export function HomePage(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useOverview();

  if (isLoading) {
    return (
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <div className="space-y-3 border-b border-edge/70 pb-5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-[28rem] max-w-full" />
        </div>
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24 sm:col-span-1 xl:col-span-1" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isError || !data)
    return (
      <div className="grid gap-4 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="Control room"
          description="A live, honest view of your home-lab infrastructure."
        />
        <ErrorState
          message="Could not reach the Opsora API. Check that the backend is running."
          onRetry={() => void refetch()}
        />
      </div>
    );

  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="Control room"
        description="A live, honest view of your home-lab infrastructure — problems first, then capacity, connectivity, and activity."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-edge/80 bg-panel-2/70 px-2.5 py-1 text-[11px] font-semibold text-ink-2">
            <StatusDot
              status={data.health.level === "healthy" ? "online" : data.health.level}
              live={data.health.level === "healthy"}
            />
            <span className="hidden sm:inline">{data.health.total} resources monitored</span>
            <span className="sm:hidden">Live</span>
          </span>
        }
        actions={
          <>
            <HeaderLink to="/network/live">
              <Radio className="size-3.5 text-accent-strong" />
              Live topology
            </HeaderLink>
            <HeaderLink to="/alerts">Review alerts</HeaderLink>
          </>
        }
      />
      <HealthBanner overview={data} />
      <KpiCards />
      <QuickActions />
      {/* Problems & availability before services/network — §53 ordering. */}
      <div className="grid gap-2.5 lg:grid-cols-2">
        <AlertsPanel />
        <DockerMini />
      </div>
      <ServerList compact />
      <div className="grid gap-2.5 lg:grid-cols-2">
        <ServicesMini />
        <NetworkMini />
      </div>
      <ActivityFeed />
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <HistoryCharts />
      </Suspense>
    </div>
  );
}
