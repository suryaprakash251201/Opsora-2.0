import type * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { useUi } from "../../stores/ui";

const baseText = "#9aa6bb";
const edge = "#1e2635";

type EChartsModule = typeof echarts;

function useEcharts(): EChartsModule | null {
  const [mod, setMod] = useState<EChartsModule | null>(null);
  useEffect(() => {
    let live = true;
    void import("echarts").then((m: EChartsModule) => {
      if (live) setMod(m);
    });
    return () => {
      live = false;
    };
  }, []);
  return mod;
}

/** Minimal Apache ECharts wrapper ( §28 ). Dark-first, reduced-motion aware. */
export function EChart({
  option,
  height = 220,
}: {
  option: echarts.EChartsCoreOption;
  height?: number;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useUi((s) => s.theme);
  const ec = useEcharts();

  useEffect(() => {
    const el = ref.current;
    if (!el || !ec) return;
    const chart = ec.init(el, undefined, { renderer: "canvas" });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    chart.setOption(
      {
        animation: !reduced,
        backgroundColor: "transparent",
        textStyle: { color: baseText, fontFamily: "Inter, sans-serif", fontSize: 11 },
        grid: { left: 8, right: 8, top: 24, bottom: 0, containLabel: true },
        tooltip: {
          trigger: "axis",
          backgroundColor: "#131926",
          borderColor: edge,
          textStyle: { color: "#e8edf5", fontSize: 12 },
        },
        xAxis: {
          type: "time",
          axisLine: { lineStyle: { color: edge } },
          axisTick: { show: false },
          splitLine: { show: false },
        },
        yAxis: { type: "value", splitLine: { lineStyle: { color: edge } } },
        ...option,
      },
      true,
    );
    const onResize = (): void => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [ec, option, theme]);

  return (
    <div ref={ref} style={{ height, width: "100%" }} role="img" aria-label="Infrastructure chart">
      {!ec ? (
        <div className="grid h-full place-items-center text-xs text-ink-3">Loading chart…</div>
      ) : null}
    </div>
  );
}

/** Tiny sparkline for KPI cards. */
export function Sparkline({
  values,
  color = "#7dd3fc",
}: {
  values: (number | null)[];
  color?: string;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const ec = useEcharts();
  useEffect(() => {
    const el = ref.current;
    if (!el || !ec) return;
    const chart = ec.init(el, undefined, { renderer: "svg" });
    const data = values.map((v, i) => [i, v] as [number, number | null]);
    chart.setOption({
      animation: false,
      backgroundColor: "transparent",
      grid: { left: 0, right: 0, top: 2, bottom: 0 },
      xAxis: { type: "value", show: false },
      yAxis: { type: "value", show: false },
      series: [
        {
          type: "line",
          data,
          showSymbol: false,
          lineStyle: { color, width: 1.5 },
          areaStyle: { color, opacity: 0.15 },
          connectNulls: true,
        },
      ],
      tooltip: { show: false },
    });
    const onResize = (): void => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [ec, values, color]);
  return <div ref={ref} style={{ height: "100%", width: "100%" }} aria-hidden />;
}
