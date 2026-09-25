import * as React from "react";
import { useDevices } from "../lib/queries";
import { apiPost } from "../lib/api";
import { Card, CardBody, CardHeader, CardTitle, CardBadge } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Table, THead, TRow, TH, TD } from "../components/ui/table";
import { EmptyState, ErrorState, OfflineState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";
import { SegmentedControl } from "../components/ui/segmented";
import { MetricCard } from "../components/ui/metric-card";
import { PageHeader } from "../components/ui/page-header";
import { timeAgo } from "@opsora/utils";
import { useUi } from "../stores/ui";
import {
  Laptop,
  Server,
  Smartphone,
  Router as RouterIcon,
  Cpu,
  Copy,
  Check,
  Download,
  RefreshCw,
  Zap,
  HardDrive,
} from "lucide-react";

function getDeviceIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("server")) return Server;
  if (t.includes("phone") || t.includes("mobile") || t.includes("ios") || t.includes("android"))
    return Smartphone;
  if (t.includes("laptop") || t.includes("mac") || t.includes("workstation") || t.includes("pc"))
    return Laptop;
  if (t.includes("router") || t.includes("gateway") || t.includes("switch")) return RouterIcon;
  return Cpu;
}

export function DevicesPage(): React.JSX.Element {
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [status, setStatus] = React.useState<"all" | "online" | "offline">("all");
  const [sort, setSort] = React.useState<"name" | "seen" | "ip">("name");
  const [copiedIp, setCopiedIp] = React.useState<string | null>(null);
  const [pingResults, setPingResults] = React.useState<
    Record<string, { ms: number | null; ok: boolean; loading: boolean }>
  >({});

  const addToast = useUi((s) => s.addToast);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, isError, refetch, isFetching } = useDevices(debounced, status);

  const rows = [...(data?.devices ?? [])];
  rows.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "seen") return +new Date(b.lastSeen) - +new Date(a.lastSeen);
    if (sort === "ip") return a.ip.localeCompare(b.ip, undefined, { numeric: true });
    return 0;
  });

  const totalDevices = data?.devices.length ?? 0;
  const onlineCount = (data?.devices ?? []).filter((d) => d.online).length;
  const offlineCount = totalDevices - onlineCount;
  const onlinePercent = totalDevices > 0 ? Math.round((onlineCount / totalDevices) * 100) : 0;

  function copyIp(ip: string) {
    void navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
    addToast({ type: "info", message: `Copied IP: ${ip}` });
  }

  async function pingDevice(ip: string) {
    setPingResults((prev) => ({ ...prev, [ip]: { ms: null, ok: false, loading: true } }));
    try {
      const res = await apiPost<{ latencyMs: number | null; ok: boolean }>("/api/network/ping", {
        host: ip,
      });
      setPingResults((prev) => ({
        ...prev,
        [ip]: { ms: res.latencyMs, ok: res.ok, loading: false },
      }));
      if (res.ok && res.latencyMs != null) {
        addToast({ type: "success", message: `Ping to ${ip}: ${res.latencyMs} ms` });
      } else {
        addToast({ type: "error", message: `Ping to ${ip} failed or timed out` });
      }
    } catch {
      setPingResults((prev) => ({
        ...prev,
        [ip]: { ms: null, ok: false, loading: false },
      }));
      addToast({ type: "error", message: `Probe to ${ip} failed` });
    }
  }

  function exportData(format: "csv" | "json") {
    if (rows.length === 0) {
      addToast({ type: "warning", message: "No devices to export" });
      return;
    }

    if (format === "csv") {
      const headers = "id,name,ip,type,online,lastSeen,source\n";
      const csvLines = rows.map(
        (d) =>
          `"${d.id}","${d.name}","${d.ip}","${d.type}",${d.online},"${d.lastSeen}","${d.source}"`,
      );
      const blob = new Blob([headers + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `devices-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: "success", message: `Exported ${rows.length} devices to CSV` });
    } else {
      const jsonStr = JSON.stringify(rows, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `devices-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: "success", message: `Exported ${rows.length} devices to JSON` });
    }
  }

  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="Devices & Inventory"
        description="Hardware discovered across local subnet, Tailscale mesh, and static hosts."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportData("csv")}
                className="gap-1 text-xs"
              >
                <Download className="size-3.5" />
                CSV
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportData("json")}
                className="gap-1 text-xs"
              >
                JSON
              </Button>
            </div>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Inventory"
          value={totalDevices}
          sub="Discovered devices"
          icon={HardDrive}
        />
        <MetricCard
          label="Online Rate"
          value={`${onlineCount} / ${totalDevices}`}
          sub={`${onlinePercent}% available`}
          tone={onlinePercent > 90 ? "good" : onlinePercent > 70 ? "warn" : "crit"}
          progress={onlinePercent}
          icon={Zap}
        />
        <MetricCard
          label="Offline Devices"
          value={offlineCount}
          sub={offlineCount === 0 ? "All machines reachable" : "Requires attention"}
          tone={offlineCount > 0 ? "warn" : "good"}
          icon={Cpu}
        />
        <MetricCard
          label="Discovery Mesh"
          value={data?.tailscaleStatus === "connected" ? "Connected" : "Local Only"}
          sub={
            data?.tailscaleStatus === "connected"
              ? "Tailnet live sync active"
              : "Tailscale not configured"
          }
          tone={data?.tailscaleStatus === "connected" ? "good" : "normal"}
          icon={RouterIcon}
        />
      </div>

      {/* Filter and Search Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Filter Inventory</CardTitle>
          <CardBadge tone="normal">{rows.length} matches</CardBadge>
        </CardHeader>
        <CardBody className="flex flex-wrap items-center justify-between gap-2 pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, IP, or type…"
                aria-label="Search devices"
                className="h-8 text-xs"
              />
            </div>
            <SegmentedControl
              ariaLabel="Filter devices by availability"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All", count: totalDevices },
                { value: "online", label: "Online", count: onlineCount },
                { value: "offline", label: "Offline", count: offlineCount },
              ]}
              size="sm"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.1em] sm:inline">
              Sort
            </span>
            <SegmentedControl
              ariaLabel="Sort devices"
              value={sort}
              onChange={setSort}
              options={[
                { value: "name", label: "Name" },
                { value: "seen", label: "Last seen" },
                { value: "ip", label: "IP" },
              ]}
              size="sm"
            />
          </div>
        </CardBody>
      </Card>

      {/* Content States */}
      {isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {isError ? (
        <ErrorState message="Could not load devices." onRetry={() => void refetch()} />
      ) : null}

      {!isLoading && !isError && rows.length === 0 ? (
        <EmptyState
          title="No devices match"
          hint={
            data?.tailscaleStatus !== "connected"
              ? "Tailscale is not connected — only static devices would appear here."
              : "Try widening your search filter."
          }
        />
      ) : null}

      {!isLoading && !isError && data?.tailscaleStatus !== "connected" && rows.length > 0 ? (
        <OfflineState
          title="Partial inventory"
          hint="Tailscale discovery is not connected; showing configured static devices only."
        />
      ) : null}

      {!isLoading && !isError && rows.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <Table aria-label="Devices">
              <THead>
                <TRow>
                  <TH>Device</TH>
                  <TH>IP Address</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH>Last Seen</TH>
                  <TH>Source</TH>
                  <TH className="text-right">Action</TH>
                </TRow>
              </THead>
              <tbody>
                {rows.slice(0, 200).map((d) => {
                  const DeviceIcon = getDeviceIcon(d.type);
                  const ping = pingResults[d.ip];

                  return (
                    <TRow key={d.id} className="transition-colors hover:bg-hover/30">
                      {/* Name & Icon */}
                      <TD className="text-ink">
                        <div className="flex items-center gap-2">
                          <div className="grid size-7 place-items-center rounded-md border border-edge/60 bg-void text-ink-2">
                            <DeviceIcon className="size-3.5" />
                          </div>
                          <div>
                            <span className="font-medium">{d.name}</span>
                            <span className="ml-2 font-mono text-[11px] text-ink-3">#{d.id}</span>
                          </div>
                        </div>
                      </TD>

                      {/* IP with Copy */}
                      <TD className="num">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs">{d.ip}</span>
                          <button
                            type="button"
                            onClick={() => copyIp(d.ip)}
                            title="Copy IP address"
                            aria-label={`Copy IP address ${d.ip}`}
                            className="rounded p-1 text-ink-3 hover:bg-hover hover:text-ink transition-colors"
                          >
                            {copiedIp === d.ip ? (
                              <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                      </TD>

                      {/* Type */}
                      <TD className="text-ink-2 capitalize">{d.type}</TD>

                      {/* Status */}
                      <TD>
                        <StatusBadge status={d.online ? "online" : "offline"} />
                      </TD>

                      {/* Last Seen */}
                      <TD className="num text-xs text-ink-3">{timeAgo(d.lastSeen)}</TD>

                      {/* Source */}
                      <TD className="text-xs">
                        <span className="rounded border border-edge/60 bg-void px-1.5 py-0.5 text-[11px] text-ink-2 uppercase">
                          {d.source}
                        </span>
                      </TD>

                      {/* Ping Probe Action */}
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ping ? (
                            ping.loading ? (
                              <span className="text-[11px] text-ink-3 animate-pulse">
                                Pinging...
                              </span>
                            ) : ping.ok && ping.ms != null ? (
                              <span className="num text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {ping.ms} ms
                              </span>
                            ) : (
                              <span className="text-[11px] text-rose-600 dark:text-rose-400">
                                Unreachable
                              </span>
                            )
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void pingDevice(d.ip)}
                            title={`Ping ${d.ip}`}
                            className="h-7 px-2 text-xs text-ink-2 hover:text-ink"
                          >
                            <Zap className="size-3" />
                            Ping
                          </Button>
                        </div>
                      </TD>
                    </TRow>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
