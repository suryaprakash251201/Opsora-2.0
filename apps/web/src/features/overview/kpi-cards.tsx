import type * as React from "react";
import { formatBytes, formatPercent } from "@opsora/utils";
import { Container, Cpu, Gauge, HardDrive, MemoryStick, Network } from "lucide-react";
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

  const host = servers?.servers[0];
  const pts = history?.points ?? [];
  const cpuSeries = pts.map((p) => p.cpu);
  const memSeries = pts.map((p) => p.mem);

  const disk = storage?.local[0];
  const net = network?.summary;

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
      <MetricCard
        label="CPU"
        icon={<Cpu className="size-3.5" aria-hidden />}
        value={host?.cpuPercent == null ? "—" : formatPercent(host.cpuPercent)}
        sub={
          host?.tempCelsius != null
            ? `${host.tempCelsius.toFixed(0)}°C · ${overview?.host.hostname ?? ""}`
            : (overview?.host.hostname ?? "—")
        }
        spark={useSpark(cpuSeries, accentHex())}
        tone={
          host?.cpuPercent != null && host.cpuPercent >= 95
            ? "crit"
            : host?.cpuPercent != null && host.cpuPercent >= 80
              ? "warn"
              : "default"
        }
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
        tone={
          disk?.health === "critical" ? "crit" : disk?.health === "warning" ? "warn" : "default"
        }
      />
      <MetricCard
        label="Network"
        icon={<Network className="size-3.5" aria-hidden />}
        value={net?.latencyMs == null ? "—" : `${net.latencyMs} ms`}
        sub={net ? `↓ ${formatBps(net.downloadBps)} · ↑ ${formatBps(net.uploadBps)}` : "—"}
      />
      <MetricCard
        label="Docker"
        icon={<Container className="size-3.5" aria-hidden />}
        value={docker ? `${docker.running}` : "—"}
        sub={
          docker ? (
            `${docker.running} running · ${docker.stopped} stopped${docker.unhealthy ? ` · ${docker.unhealthy} unhealthy` : ""}`
          ) : (
            <span className="flex items-center gap-1">
              <Gauge className="size-3" />
              Not connected
            </span>
          )
        }
      />
    </div>
  );
}
