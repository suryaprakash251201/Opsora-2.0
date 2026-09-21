import type * as React from "react";
import { useMetricsHistory } from "../../lib/queries";
import { useUi } from "../../stores/ui";
import { EChart } from "../../components/charts/echart";
import { Card, CardBody, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

const ranges = ["15m", "1h", "6h", "24h"];

/** Operational history charts — each answers a question ( §28 ). */
export function HistoryCharts(): React.JSX.Element {
  const range = useUi((s) => s.range);
  const setRange = useUi((s) => s.setRange);
  const { data } = useMetricsHistory(range);
  const pts = data?.points ?? [];

  const series = (
    pick: (p: (typeof pts)[number]) => number | null,
    color: string,
    name: string,
  ): Record<string, unknown> => ({
    name,
    type: "line",
    showSymbol: false,
    connectNulls: true,
    lineStyle: { color, width: 1.5 },
    areaStyle: { color, opacity: 0.12 },
    data: pts.map((p) => [p.t, pick(p)]),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource history</CardTitle>
        <div className="flex gap-1" role="tablist" aria-label="Time range">
          {ranges.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "ghost"}
              onClick={() => setRange(r)}
              role="tab"
              aria-selected={range === r}
            >
              {r}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardBody className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-ink-2">CPU / Memory % — is anything saturating?</p>
          <EChart
            height={180}
            option={{
              legend: { textStyle: { color: "#9aa6bb" } },
              series: [
                series((p) => p.cpu, "#7dd3fc", "cpu"),
                series((p) => p.mem, "#34d399", "mem"),
              ],
            }}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-ink-2">Network b/s — what is the traffic shape?</p>
          <EChart
            height={180}
            option={{
              legend: { textStyle: { color: "#9aa6bb" } },
              series: [
                series((p) => p.netDownBps, "#38bdf8", "down"),
                series((p) => p.netUpBps, "#fbbf24", "up"),
              ],
            }}
          />
        </div>
      </CardBody>
    </Card>
  );
}
