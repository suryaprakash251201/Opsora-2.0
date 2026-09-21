import type * as React from "react";
import { Suspense, lazy } from "react";
import { ServerList } from "../features/overview/server-list";
import { useMetricsHistory } from "../lib/queries";
import { useUi } from "../stores/ui";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { accentHex } from "../lib/theme";

const LoadChart = lazy(() =>
  import("../components/charts/echart").then((m) => ({
    default: function LoadChartImpl({ range }: { range: string }): React.JSX.Element {
      const { data } = useMetricsHistory(range);
      const pts = data?.points ?? [];
      return (
        <m.EChart
          option={{
            series: [
              {
                name: "cpu",
                type: "line",
                showSymbol: false,
                data: pts.map((p) => [p.t, p.cpu]),
                lineStyle: { color: accentHex() },
              },
              {
                name: "mem",
                type: "line",
                showSymbol: false,
                data: pts.map((p) => [p.t, p.mem]),
                lineStyle: { color: "#34d399" },
              },
            ],
          }}
        />
      );
    },
  })),
);

export function ServersPage(): React.JSX.Element {
  const range = useUi((s) => s.range);
  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">Servers</h1>
      <ServerList />
      <Card>
        <CardHeader>
          <CardTitle>Load history ({range})</CardTitle>
        </CardHeader>
        <CardBody>
          <Suspense fallback={<Skeleton className="h-56 w-full" />}>
            <LoadChart range={range} />
          </Suspense>
        </CardBody>
      </Card>
    </div>
  );
}
