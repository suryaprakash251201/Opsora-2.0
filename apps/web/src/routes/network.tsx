import * as React from "react";
import { Link } from "react-router";
import { Activity } from "lucide-react";
import { useNetwork } from "../lib/queries";
import { apiPost } from "../lib/api";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardBadge,
  CardDescription,
} from "../components/ui/card";
import { ErrorState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { MetricCard } from "../components/ui/metric-card";
import { PageHeader } from "../components/ui/page-header";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { StatusBadge } from "../components/ui/status";
import { SegmentedControl } from "../components/ui/segmented";
import { useUi } from "../stores/ui";
import {
  Globe,
  Network as NetworkIcon,
  Laptop,
  Server,
  Zap,
  Copy,
  Check,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";

interface ProbeResult {
  host: string;
  latencyMs: number | null;
  ok: boolean;
  timestamp: string;
}

export function NetworkPage(): React.JSX.Element {
  const { data, isLoading, isError, refetch, isFetching } = useNetwork();
  const addToast = useUi((s) => s.addToast);

  const [probeHost, setProbeHost] = React.useState("1.1.1.1");
  const [probing, setProbing] = React.useState(false);
  const [probeHistory, setProbeHistory] = React.useState<ProbeResult[]>([]);
  const [search, setSearch] = React.useState("");
  const [nodeFilter, setNodeFilter] = React.useState<
    "all" | "online" | "offline" | "infra" | "devices"
  >("all");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  async function handlePing(target = probeHost) {
    if (probing) return;
    setProbing(true);
    try {
      const res = await apiPost<ProbeResult>("/api/network/ping", { host: target });
      setProbeHistory((prev) => [res, ...prev.slice(0, 9)]);
      if (res.ok && res.latencyMs != null) {
        addToast({
          type: "success",
          message: `Ping to ${res.host} succeeded: ${res.latencyMs} ms`,
        });
      } else {
        addToast({
          type: "error",
          message: `Ping to ${res.host} failed (unreachable)`,
        });
      }
    } catch {
      addToast({
        type: "error",
        message: `Failed to probe ${target}`,
      });
    } finally {
      setProbing(false);
    }
  }

  function copyText(val: string, label: string) {
    void navigator.clipboard.writeText(val);
    setCopiedId(val);
    setTimeout(() => setCopiedId(null), 2000);
    addToast({ type: "info", message: `Copied ${label}: ${val}` });
  }

  if (isLoading)
    return (
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="Network & Latency"
          description="Gateway reachability, DNS timing, and live topology."
        />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (isError || !data)
    return (
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="Network & Latency"
          description="Gateway reachability, DNS timing, and live topology."
        />
        <ErrorState message="Could not load network state." onRetry={() => void refetch()} />
      </div>
    );

  const s = data.summary;
  const nodes = data.topology.nodes;
  const onlineCount = nodes.filter((n) => n.online).length;
  const totalCount = nodes.length;

  // Compute Latency Grade (A+, A, B, C, F)
  let grade = "A+";
  let gradeColor = "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (s.latencyMs === null) {
    grade = "—";
    gradeColor = "border-edge bg-void text-ink-3";
  } else if (s.latencyMs < 20) {
    grade = "A+";
    gradeColor = "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  } else if (s.latencyMs < 45) {
    grade = "A";
    gradeColor = "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  } else if (s.latencyMs < 90) {
    grade = "B";
    gradeColor = "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  } else {
    grade = "C";
    gradeColor = "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400";
  }

  const latencyTone: "good" | "warn" | "crit" | "normal" =
    s.latencyMs == null ? "normal" : s.latencyMs < 40 ? "good" : s.latencyMs < 90 ? "warn" : "crit";

  const latencyProgress =
    s.latencyMs == null ? 0 : Math.min(100, Math.round((s.latencyMs / 120) * 100));

  const filteredNodes = nodes.filter((n) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!n.label.toLowerCase().includes(q) && !n.kind.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (nodeFilter === "online") return n.online;
    if (nodeFilter === "offline") return !n.online;
    if (nodeFilter === "infra") return n.kind === "wan" || n.kind === "lan";
    if (nodeFilter === "devices") return n.kind === "device";
    return true;
  });

  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="Network & Latency"
        description="Gateway reachability, DNS timing, and live topology."
        badge={
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${gradeColor}`}
          >
            <ShieldCheck className="size-3.5" />
            Quality Grade: {grade}
          </span>
        }
        actions={
          <div className="flex items-center gap-1.5">
            <Link
              to="/network/live"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              <Activity className="size-3.5" />
              Live topology
            </Link>
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
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="DNS / WAN Latency"
          value={s.latencyMs != null ? `${s.latencyMs} ms` : "—"}
          sub={s.status === "connected" ? "Normal resolution RTT" : s.status}
          tone={latencyTone}
          progress={latencyProgress}
          badge={s.latencyMs != null ? (s.latencyMs < 30 ? "Fast" : "Normal") : undefined}
          icon={Zap}
        />
        <MetricCard
          label="WAN Gateway"
          value={s.status === "connected" ? "Connected" : "Unavailable"}
          sub={s.wanIp ? `WAN IP: ${s.wanIp}` : "Tailscale / Local Gateway"}
          tone={s.status === "connected" ? "good" : "crit"}
          icon={Globe}
        />
        <MetricCard
          label="Discovered Nodes"
          value={`${onlineCount} / ${totalCount}`}
          sub={
            data.tailscaleStatus === "connected" ? "Tailscale mesh synced" : "Local topology active"
          }
          tone={totalCount > 0 && onlineCount === totalCount ? "good" : "warn"}
          progress={totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0}
          icon={NetworkIcon}
        />
        <MetricCard
          label="Packet Loss"
          value={s.packetLossPercent != null ? `${s.packetLossPercent}%` : "0%"}
          sub={s.packetLossPercent != null ? "Active probe" : "No loss detected"}
          tone={s.packetLossPercent && s.packetLossPercent > 5 ? "crit" : "good"}
          icon={ShieldCheck}
        />
      </div>

      {/* Interactive Ping & DNS Probe Tool */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm font-semibold">Live Ping Probe</CardTitle>
            <CardDescription>
              Test real DNS resolution and round-trip latency to any gateway, DNS resolver, or
              domain.
            </CardDescription>
          </div>
          <CardBadge tone="normal">Active Probe</CardBadge>
        </CardHeader>
        <CardBody className="grid gap-3 pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Input
                value={probeHost}
                onChange={(e) => setProbeHost(e.target.value)}
                placeholder="Target IP or host (e.g. 1.1.1.1, 8.8.8.8)..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handlePing();
                  }
                }}
              />
            </div>
            <Button
              size="sm"
              onClick={() => void handlePing()}
              disabled={probing || !probeHost.trim()}
              className="gap-1.5"
            >
              <Send className={`size-3.5 ${probing ? "animate-pulse" : ""}`} />
              {probing ? "Probing..." : "Test Latency"}
            </Button>
          </div>

          {/* Quick Target Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
            <span className="font-medium text-ink-2">Presets:</span>
            {[
              { label: "Cloudflare (1.1.1.1)", target: "1.1.1.1" },
              { label: "Google (8.8.8.8)", target: "8.8.8.8" },
              { label: "Quad9 (9.9.9.9)", target: "9.9.9.9" },
              { label: "Localhost (127.0.0.1)", target: "127.0.0.1" },
            ].map((p) => (
              <button
                key={p.target}
                type="button"
                onClick={() => {
                  setProbeHost(p.target);
                  void handlePing(p.target);
                }}
                className="rounded border border-edge bg-void px-2 py-0.5 text-[11px] text-ink-2 hover:border-accent/40 hover:bg-hover hover:text-ink transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Recent Probe Results History */}
          {probeHistory.length > 0 ? (
            <div className="mt-1 grid gap-1.5 rounded-lg border border-edge/60 bg-void/50 p-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                Recent Probe Results
              </span>
              <div className="grid gap-1">
                {probeHistory.map((h, i) => (
                  <div
                    key={`${h.host}-${h.timestamp}-${i}`}
                    className="flex items-center justify-between rounded-md border border-edge/40 bg-panel px-2.5 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${h.ok ? "bg-emerald-400" : "bg-rose-400"}`}
                        aria-hidden
                      />
                      <span className="font-mono text-ink font-medium">{h.host}</span>
                      <span className="text-[11px] text-ink-3">
                        {new Date(h.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {h.latencyMs != null ? (
                        <span
                          className={`num font-semibold ${
                            h.latencyMs < 30
                              ? "text-emerald-600 dark:text-emerald-400"
                              : h.latencyMs < 80
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {h.latencyMs} ms
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-medium">Failed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* Network Topology & Discovered Nodes */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-sm font-semibold">
              Discovered Topology & Mesh ({nodes.length} nodes)
            </CardTitle>
            <CardDescription>
              Nodes actively reporting or discovered via local subnet and Tailscale mesh.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge
              status={data.tailscaleStatus === "connected" ? "connected" : "idle"}
              text={
                data.tailscaleStatus === "connected" ? "Tailscale Mesh Active" : "Local Subnet Only"
              }
            />
          </div>
        </CardHeader>
        <CardBody className="grid gap-3 pt-0">
          {/* Controls: Search and Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="w-full sm:w-64">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter nodes by name..."
                className="h-8 text-xs"
              />
            </div>
            <SegmentedControl
              ariaLabel="Filter discovered network nodes"
              value={nodeFilter}
              onChange={setNodeFilter}
              options={[
                { value: "all", label: "All", count: nodes.length },
                { value: "online", label: "Online", count: onlineCount },
                { value: "infra", label: "Gateways" },
                { value: "devices", label: "Devices" },
              ]}
              size="sm"
            />
          </div>

          {/* Node Grid Cards */}
          {filteredNodes.length === 0 ? (
            <div className="rounded-lg border border-edge/60 bg-void/50 p-6 text-center text-xs text-ink-3">
              No network nodes matched the current filter.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNodes.map((n) => {
                const isWan = n.kind === "wan";
                const isLan = n.kind === "lan";
                const IconComponent = isWan
                  ? Globe
                  : isLan
                    ? NetworkIcon
                    : n.kind === "server"
                      ? Server
                      : Laptop;

                return (
                  <div
                    key={n.id}
                    className="flex items-center justify-between rounded-lg border border-edge/60 bg-void/60 p-2.5 transition-colors hover:border-accent/40 hover:bg-hover/30"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`grid size-8 shrink-0 place-items-center rounded-md ${
                          n.online
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        <IconComponent className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-medium text-ink">{n.label}</span>
                          <span className="sr-only">{n.online ? "online" : "offline"}</span>
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${
                              n.online ? "bg-emerald-400" : "bg-red-400"
                            }`}
                            aria-hidden
                          />
                        </div>
                        <span className="text-[11px] uppercase tracking-wider text-ink-3">
                          {n.kind}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyText(n.label, "Node")}
                        title="Copy node identifier"
                        aria-label={`Copy node identifier ${n.label}`}
                        className="rounded p-1 text-ink-3 hover:bg-hover hover:text-ink transition-colors"
                      >
                        {copiedId === n.label ? (
                          <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {data.tailscaleStatus !== "connected" && (
            <div className="mt-2 rounded-lg border border-edge/60 bg-void/40 p-3 text-xs text-ink-2">
              <span className="font-semibold text-ink">Want complete tailnet device mesh?</span>{" "}
              Configure <code className="font-mono text-ink">TAILSCALE_API_KEY</code> and{" "}
              <code className="font-mono text-ink">TAILSCALE_TAILNET</code> server-side to
              automatically discover all machines, mobile devices, and gateways across your mesh.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
