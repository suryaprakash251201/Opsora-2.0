import type * as React from "react";
import { formatBytes, formatPercent } from "@opsora/utils";
import { Container, Cpu, Gauge, HardDrive, MemoryStick, Network, Thermometer } from "lucide-react";
import { useNavigate } from "react-router";
import {
  useDocker,
  useMetricsHistory,
  useNetwork,
  useOverview,
  useServers,
  useStorage,
} from "../../lib/queries";
import { Sparkline } from "../../components/charts/echart";
import { accentHex } from "../../lib/theme";
import { MetricCard } from "../../components/ui/metric-card";
import { formatBps } from "@opsora/utils";

function useSpark(values: (number | null)[] | undefined, color: string): React.ReactNode {
  if (!values || values.length < 2) return <span className="text-[11px] text-ink-3">—</span>;
  return <Sparkline values={values} color={color} />;
}

export function KpiCards(): React.JSX.Element {
  const { data: overview } = useOverview();
  const { data: servers } = useServers();
  const { data: docker } = useDocker();
  const { data: network } = useNetwork();
  const { data: storage } = useStorage();
  const { data: history } = useMetricsHistory("1h");
  const nav = useNavigate();

  const host = servers?.servers[0];
  const pts = history?.points ?? [];
  const cpuSeries = pts.map((p) => p.cpu);
  const memSeries = pts.map((p) => p.mem);

  const disk = storage?.local[0];
  const net = network?.summary;

  return (
    <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
      <MetricCard
        label="CPU Load"
        icon={<Cpu className="size-3.5" aria-hidden />}
        value={host?.cpuPercent == null ? "—" : formatPercent(host.cpuPercent)}
        sub={overview?.host.hostname ?? "Host"}
        spark={useSpark(cpuSeries, accentHex())}
        progress={host?.cpuPercent != null ? { value: host.cpuPercent, tone: "auto" } : undefined}
        badge={
          host?.tempCelsius != null ? (
            <span className="flex items-center gap-0.5 rounded bg-void px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
              <Thermometer className="size-2.5 text-amber-500" />
              {host.tempCelsius.toFixed(0)}°C
            </span>
          ) : undefined
        }
        tone={
          host?.cpuPercent != null && host.cpuPercent >= 95
            ? "crit"
            : host?.cpuPercent != null && host.cpuPercent >= 80
              ? "warn"
              : "default"
        }
        onClick={() => nav("/servers")}
      />
      <MetricCard
        label="Memory"
        icon={<MemoryStick className="size-3.5" aria-hidden />}
        value={host?.memPercent == null ? "—" : formatPercent(host.memPercent)}
        sub={
          host?.memUsedBytes != null
            ? `${formatBytes(host.memUsedBytes)} / ${formatBytes(host.memTotalBytes)}`
            : "—"
        }
        spark={useSpark(memSeries, "#34d399")}
        progress={host?.memPercent != null ? { value: host.memPercent, tone: "auto" } : undefined}
        tone={
          host?.memPercent != null && host.memPercent >= 95
            ? "crit"
            : host?.memPercent != null && host.memPercent >= 85
              ? "warn"
              : "default"
        }
        onClick={() => nav("/servers")}
      />
      <MetricCard
        label="Storage"
        icon={<HardDrive className="size-3.5" aria-hidden />}
        value={
          disk?.percent == null
            ? host?.diskPercent == null
              ? "—"
              : formatPercent(host.diskPercent)
            : formatPercent(disk.percent)
        }
        sub={
          disk?.usedBytes != null
            ? `${formatBytes(disk.usedBytes)} / ${formatBytes(disk.totalBytes)}`
            : "—"
        }
        progress={{
          value: disk?.percent ?? host?.diskPercent,
          tone: "auto",
        }}
        tone={
          disk?.health === "critical" ? "crit" : disk?.health === "warning" ? "warn" : "default"
        }
        onClick={() => nav("/storage")}
      />
      <MetricCard
        label="Network"
        icon={<Network className="size-3.5" aria-hidden />}
        value={net?.latencyMs == null ? "—" : `${net.latencyMs} ms`}
        sub={net ? `↓ ${formatBps(net.downloadBps)} · ↑ ${formatBps(net.uploadBps)}` : "—"}
        badge={
          net?.latencyMs != null ? (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                net.latencyMs < 30
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : net.latencyMs < 100
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
              }`}
            >
              {net.latencyMs < 30 ? "Optimal" : net.latencyMs < 100 ? "Good" : "High"}
            </span>
          ) : undefined
        }
        tone={net?.latencyMs != null && net.latencyMs > 150 ? "warn" : "default"}
        onClick={() => nav("/network")}
      />
      <MetricCard
        label="Docker"
        icon={<Container className="size-3.5" aria-hidden />}
        value={docker ? `${docker.running}` : "—"}
        sub={
          docker ? (
            `${docker.running} running · ${docker.stopped} stopped${docker.unhealthy ? ` · ${docker.unhealthy} err` : ""}`
          ) : (
            <span className="flex items-center gap-1">
              <Gauge className="size-3" />
              Not connected
            </span>
          )
        }
        badge={
          docker ? (
            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent-strong">
              {docker.containers.length} total
            </span>
          ) : undefined
        }
        tone={docker?.unhealthy && docker.unhealthy > 0 ? "warn" : "default"}
        onClick={() => nav("/docker")}
        className="sm:col-span-2 xl:col-span-1"
      />
    </div>
  );
}
