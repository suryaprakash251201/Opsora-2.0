import * as React from "react";
import { Suspense, lazy } from "react";
import { ServerList } from "../features/overview/server-list";
import { useMetricsHistory, useServers } from "../lib/queries";
import { useUi } from "../stores/ui";
import { Card, CardBody, CardHeader, CardTitle, CardAction } from "../components/ui/card";
import { MetricCard } from "../components/ui/metric-card";
import { PageHeader } from "../components/ui/page-header";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";
import { accentHex } from "../lib/theme";
import { Activity, Cpu, MemoryStick, Server, ShieldCheck } from "lucide-react";
import { formatPercent } from "@opsora/utils";

const ranges = ["15m", "1h", "6h", "24h"];

const LoadChart = lazy(() =>
  import("../components/charts/echart").then((m) => ({
    default: function LoadChartImpl({ range }: { range: string }): React.JSX.Element {
      const { data } = useMetricsHistory(range);
      const theme = useUi((s) => s.theme);
      const chartText = theme === "dark" ? "#a8b6ce" : "#475569";
      const pts = data?.points ?? [];
      return (
        <m.EChart
          ariaLabel="Server load history chart showing CPU and memory percentage over time"
          height={220}
          option={{
            legend: { textStyle: { color: chartText }, top: 0 },
            series: [
              {
                name: "CPU %",
                type: "line",
                smooth: true,
                showSymbol: false,
                data: pts.map((p) => [p.t, p.cpu]),
                lineStyle: { color: accentHex(), width: 2 },
                areaStyle: {
                  color: {
                    type: "linear",
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: accentHex() },
                      { offset: 1, color: "transparent" },
                    ],
                  },
                  opacity: 0.15,
                },
              },
              {
                name: "RAM %",
                type: "line",
                smooth: true,
                showSymbol: false,
                data: pts.map((p) => [p.t, p.mem]),
                lineStyle: { color: "#34d399", width: 2 },
                areaStyle: {
                  color: {
                    type: "linear",
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: "#34d399" },
                      { offset: 1, color: "transparent" },
                    ],
                  },
                  opacity: 0.15,
                },
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
  const setRange = useUi((s) => s.setRange);
  const { data: serverData } = useServers();

  const servers = serverData?.servers ?? [];
  const totalServers = servers.length;
  const onlineServers = servers.filter((s) => s.online).length;

  const validCpus = servers.map((s) => s.cpuPercent).filter((v): v is number => v != null);
  const avgCpu =
    validCpus.length > 0 ? validCpus.reduce((a, b) => a + b, 0) / validCpus.length : null;

  const validMems = servers.map((s) => s.memPercent).filter((v): v is number => v != null);
  const avgMem =
    validMems.length > 0 ? validMems.reduce((a, b) => a + b, 0) / validMems.length : null;

  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="Servers & Nodes"
        description="Physical and virtual hosts reporting to Opsora."
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Hosts"
          icon={<Server className="size-3.5" />}
          value={totalServers}
          sub={`${onlineServers} online · ${totalServers - onlineServers} offline`}
          tone={totalServers > 0 && onlineServers === totalServers ? "ok" : "default"}
        />
        <MetricCard
          label="Online Rate"
          icon={<ShieldCheck className="size-3.5" />}
          value={totalServers > 0 ? `${Math.round((onlineServers / totalServers) * 100)}%` : "—"}
          sub="Availability status"
          progress={{
            value: totalServers > 0 ? (onlineServers / totalServers) * 100 : 0,
            tone: "ok",
          }}
          tone="ok"
        />
        <MetricCard
          label="Avg CPU Load"
          icon={<Cpu className="size-3.5" />}
          value={avgCpu == null ? "—" : formatPercent(avgCpu)}
          sub="Across all monitored hosts"
          progress={avgCpu != null ? { value: avgCpu, tone: "auto" } : undefined}
          tone={avgCpu != null && avgCpu > 80 ? "warn" : "default"}
        />
        <MetricCard
          label="Avg Memory"
          icon={<MemoryStick className="size-3.5" />}
          value={avgMem == null ? "—" : formatPercent(avgMem)}
          sub="Memory pool utilization"
          progress={avgMem != null ? { value: avgMem, tone: "auto" } : undefined}
          tone={avgMem != null && avgMem > 85 ? "warn" : "default"}
        />
      </div>

      {/* Server List */}
      <ServerList />

      {/* Historical Telemetry Chart */}
      <Card>
        <CardHeader className="flex-wrap gap-y-2 border-b border-edge/40 bg-panel-2/30 py-3">
          <CardTitle>
            <Activity className="size-4 text-accent-strong" />
            <span>Load History & Saturation</span>
          </CardTitle>
          <CardAction className="flex gap-1">
            {ranges.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "ghost"}
                onClick={() => setRange(r)}
                className="h-7 text-xs px-2.5"
              >
                {r}
              </Button>
            ))}
          </CardAction>
        </CardHeader>
        <CardBody className="p-4">
          <Suspense fallback={<Skeleton className="h-56 w-full" />}>
            <LoadChart range={range} />
          </Suspense>
        </CardBody>
      </Card>
    </div>
  );
}
