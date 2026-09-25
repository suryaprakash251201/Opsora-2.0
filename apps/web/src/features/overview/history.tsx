import * as React from "react";
import { useMetricsHistory } from "../../lib/queries";
import { useUi } from "../../stores/ui";
import { EChart } from "../../components/charts/echart";
import { accentHex } from "../../lib/theme";
import { Card, CardBody, CardHeader, CardTitle, CardAction } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { SegmentedControl } from "../../components/ui/segmented";
import { Activity, Cpu, Network } from "lucide-react";
import { formatPercent } from "@opsora/utils";

const ranges = ["15m", "1h", "6h", "24h"];
type MetricTab = "all" | "compute" | "network";

/** Operational history charts with interactive filters and peak analytics. */
export function HistoryCharts(): React.JSX.Element {
  const range = useUi((s) => s.range);
  const setRange = useUi((s) => s.setRange);
  const theme = useUi((s) => s.theme);
  const chartText = theme === "dark" ? "#a8b6ce" : "#475569";
  const [activeTab, setActiveTab] = React.useState<MetricTab>("all");
  const { data } = useMetricsHistory(range);
  const pts = data?.points ?? [];

  // Calculate quick summary metrics
  const cpus = pts.map((p) => p.cpu).filter((v): v is number => v != null);
  const mems = pts.map((p) => p.mem).filter((v): v is number => v != null);
  const maxCpu = cpus.length > 0 ? Math.max(...cpus) : null;
  const avgMem = mems.length > 0 ? mems.reduce((a, b) => a + b, 0) / mems.length : null;

  const series = (
    pick: (p: (typeof pts)[number]) => number | null,
    color: string,
    name: string,
  ): Record<string, unknown> => ({
    name,
    type: "line",
    showSymbol: false,
    connectNulls: true,
    smooth: true,
    lineStyle: { color, width: 2 },
    areaStyle: {
      color: {
        type: "linear",
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color },
          { offset: 1, color: "transparent" },
        ],
      },
      opacity: 0.18,
    },
    data: pts.map((p) => [p.t, pick(p)]),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-wrap gap-y-2 border-b border-edge/40 bg-panel-2/30 py-3">
        <div className="flex items-center gap-3">
          <CardTitle>
            <Activity className="size-4 text-accent-strong" />
            <span>Telemetry & History</span>
          </CardTitle>

          <SegmentedControl
            ariaLabel="Choose telemetry metrics"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "all", label: "All metrics" },
              { value: "compute", label: "Compute" },
              { value: "network", label: "Network" },
            ]}
            size="sm"
            className="hidden sm:inline-flex"
          />
        </div>

        <CardAction className="flex items-center gap-2">
          {/* Summary Pills */}
          {maxCpu != null ? (
            <span className="num hidden lg:inline-flex items-center gap-1 rounded-md bg-void border border-edge/60 px-2 py-1 text-[11px] text-ink-3">
              Peak CPU: <strong className="text-ink">{formatPercent(maxCpu)}</strong>
            </span>
          ) : null}
          {avgMem != null ? (
            <span className="num hidden lg:inline-flex items-center gap-1 rounded-md bg-void border border-edge/60 px-2 py-1 text-[11px] text-ink-3">
              Avg RAM: <strong className="text-ink">{formatPercent(avgMem)}</strong>
            </span>
          ) : null}

          {/* Time range buttons */}
          <div className="flex gap-1" role="tablist" aria-label="Time range">
            {ranges.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "ghost"}
                onClick={() => setRange(r)}
                role="tab"
                aria-selected={range === r}
                className="h-7 text-xs px-2.5"
              >
                {r}
              </Button>
            ))}
          </div>
        </CardAction>
      </CardHeader>

      <CardBody className="grid gap-5 p-4 md:grid-cols-2">
        {(activeTab === "all" || activeTab === "compute") && (
          <div className={activeTab === "compute" ? "md:col-span-2" : ""}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Cpu className="size-3.5 text-accent-strong" />
                Compute Saturation (CPU % vs RAM %)
              </span>
              <span className="text-[11px] text-ink-3">Threshold: 85%</span>
            </div>
            <EChart
              ariaLabel="Compute saturation chart showing CPU and memory percentage over time"
              height={activeTab === "compute" ? 240 : 200}
              option={{
                legend: { textStyle: { color: chartText }, top: 0 },
                series: [
                  series((p) => p.cpu, accentHex(), "CPU %"),
                  series((p) => p.mem, "#34d399", "RAM %"),
                ],
              }}
            />
          </div>
        )}

        {(activeTab === "all" || activeTab === "network") && (
          <div className={activeTab === "network" ? "md:col-span-2" : ""}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Network className="size-3.5 text-amber-500" />
                Bandwidth & Network Traffic
              </span>
              <span className="text-[11px] text-ink-3">Throughput (b/s)</span>
            </div>
            <EChart
              ariaLabel="Network traffic chart showing download and upload throughput over time"
              height={activeTab === "network" ? 240 : 200}
              option={{
                legend: { textStyle: { color: chartText }, top: 0 },
                series: [
                  series((p) => p.netDownBps, accentHex(), "Download"),
                  series((p) => p.netUpBps, "#fbbf24", "Upload"),
                ],
              }}
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
