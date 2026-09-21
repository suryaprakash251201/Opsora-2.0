import type * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { accentHex } from "../../lib/theme";
import { useUi } from "../../stores/ui";

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

function chartChrome(theme: "dark" | "light"): {
  text: string;
  edge: string;
  tooltipBg: string;
  tooltipText: string;
} {
  return theme === "dark"
    ? { text: "#9aa6bb", edge: "#1e2635", tooltipBg: "#131926", tooltipText: "#e8edf5" }
    : { text: "#64748b", edge: "#dfe5ee", tooltipBg: "#ffffff", tooltipText: "#0f172a" };
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
    const chrome = chartChrome(theme);
    const chart = ec.init(el, undefined, { renderer: "canvas" });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    chart.setOption(
      {
        animation: !reduced,
        backgroundColor: "transparent",
        textStyle: { color: chrome.text, fontFamily: "Inter, sans-serif", fontSize: 11 },
        grid: { left: 8, right: 8, top: 24, bottom: 0, containLabel: true },
        tooltip: {
          trigger: "axis",
          backgroundColor: chrome.tooltipBg,
          borderColor: chrome.edge,
          textStyle: { color: chrome.tooltipText, fontSize: 12 },
        },
        xAxis: {
          type: "time",
          axisLine: { lineStyle: { color: chrome.edge } },
          axisTick: { show: false },
          splitLine: { show: false },
        },
        yAxis: { type: "value", splitLine: { lineStyle: { color: chrome.edge } } },
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
  color = accentHex(),
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
