import * as React from "react";
import { formatBytes, formatPercent, formatUptime } from "@opsora/utils";
import { Link } from "react-router";
import {
  Check,
  Copy,
  Cpu,
  HardDrive,
  LayoutGrid,
  List,
  MemoryStick,
  Terminal,
  Thermometer,
} from "lucide-react";
import { useServers } from "../../lib/queries";
import { Card, CardBody, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { ProgressBar } from "../../components/ui/progress-bar";
import { ErrorState, EmptyState } from "../../components/ui/states";
import { Skeleton } from "../../components/ui/skeleton";
import { StatusBadge, StatusDot } from "../../components/ui/status";
import { useUi } from "../../stores/ui";
import { cn } from "../../lib/cn";

export function ServerList({ compact = false }: { compact?: boolean }): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useServers();
  const serverView = useUi((s) => s.serverView);
  const setServerView = useUi((s) => s.setServerView);
  const addToast = useUi((s) => s.addToast);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, label: string, id: string): void => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast({
      title: "Copied to clipboard",
      message: `${label}: ${text}`,
      type: "success",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Servers</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-2 sm:grid-cols-2">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </CardBody>
      </Card>
    );
  }
  if (isError)
    return <ErrorState message="Could not load servers." onRetry={() => void refetch()} />;
  if (!data || data.servers.length === 0)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Servers & Infrastructure</CardTitle>
        </CardHeader>
        <CardBody className="py-2">
          <EmptyState
            title="No servers reporting yet"
            hint="Install the Opsora agent on a host — authenticated check-ins appear here within seconds. Until a real agent reports, Opsora shows nothing rather than plausible-looking fakes."
          >
            <ol className="mt-3 grid w-full max-w-lg gap-1.5 text-left">
              {[
                "Open the agent guide for the exact report shape.",
                "Set X-Agent-Token to your AGENT_INGEST_TOKEN value.",
                "POST check-ins to /api/servers/report — the host appears instantly.",
              ].map((step, i) => (
                <li
                  key={step}
                  className="flex items-start gap-2 rounded-lg border border-edge/60 bg-void/60 px-2.5 py-1.5 text-xs text-ink-2"
                >
                  <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-accent/15 text-[10px] font-bold text-accent-strong">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Link
                to="/integrations/agent"
                className="inline-flex h-8 items-center rounded-md border border-accent/25 bg-accent/15 px-3 text-[13px] font-medium text-accent-strong transition-all duration-150 hover:bg-accent/25 active:scale-[0.97]"
              >
                Open agent guide
              </Link>
              <button
                onClick={() =>
                  copyToClipboard("/api/servers/report", "Ingest endpoint", "ingest-endpoint")
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-edge bg-void px-3 font-mono text-xs text-ink-2 transition-colors hover:border-accent/40 hover:text-ink"
                title="Copy the ingest endpoint"
              >
                {copiedId === "ingest-endpoint" ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5 text-ink-3" />
                )}
                POST /api/servers/report
              </button>
            </div>
          </EmptyState>
        </CardBody>
      </Card>
    );

  const list = compact ? data.servers.slice(0, 4) : data.servers;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Servers & Infrastructure
          </h2>
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent-strong">
            {data.servers.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Grid / List toggle */}
          <div className="flex items-center rounded-lg border border-edge bg-panel p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setServerView("grid")}
              className={cn(
                "rounded-md p-1 transition-colors",
                serverView === "grid"
                  ? "bg-accent/15 text-accent-strong"
                  : "text-ink-3 hover:text-ink",
              )}
              title="Grid View"
              aria-label="Grid View"
              aria-pressed={serverView === "grid"}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setServerView("list")}
              className={cn(
                "rounded-md p-1 transition-colors",
                serverView === "list"
                  ? "bg-accent/15 text-accent-strong"
                  : "text-ink-3 hover:text-ink",
              )}
              title="List View"
              aria-label="List View"
              aria-pressed={serverView === "list"}
            >
              <List className="size-3.5" />
            </button>
          </div>
          {compact ? (
            <Link to="/servers" className="text-xs font-medium text-accent-strong hover:underline">
              View all
            </Link>
          ) : null}
        </div>
      </div>

      {serverView === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const sshCmd = `ssh ${s.ip || s.hostname}`;
            return (
              <Card key={s.id} className="flex flex-col justify-between overflow-hidden">
                <div>
                  <CardHeader className="border-b border-edge/40 bg-panel-2/30 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <StatusDot status={s.online ? "online" : "offline"} live={s.online} />
                      <div className="min-w-0">
                        <Link
                          to="/servers"
                          className="truncate text-[13px] font-semibold text-ink hover:text-accent-strong transition-colors block"
                        >
                          {s.hostname}
                        </Link>
                        <span className="text-[11px] text-ink-3">
                          {s.os ?? "Linux"} · {s.source}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={s.online ? "online" : "offline"} />
                  </CardHeader>

                  <CardBody className="space-y-3 pt-3">
                    {/* CPU Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 text-ink-2 font-medium">
                          <Cpu className="size-3 text-ink-3" />
                          CPU
                        </span>
                        <div className="flex items-center gap-2">
                          {s.tempCelsius != null ? (
                            <span className="flex items-center gap-0.5 text-[11px] text-ink-3">
                              <Thermometer className="size-2.5 text-amber-500" />
                              {s.tempCelsius.toFixed(0)}°C
                            </span>
                          ) : null}
                          <span className="num font-semibold text-ink">
                            {s.cpuPercent == null ? "—" : formatPercent(s.cpuPercent)}
                          </span>
                        </div>
                      </div>
                      <ProgressBar value={s.cpuPercent} size="xs" />
                    </div>

                    {/* RAM Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 text-ink-2 font-medium">
                          <MemoryStick className="size-3 text-ink-3" />
                          Memory
                        </span>
                        <span className="num font-semibold text-ink">
                          {s.memPercent == null ? "—" : formatPercent(s.memPercent)}
                        </span>
                      </div>
                      <ProgressBar value={s.memPercent} size="xs" />
                      {s.memUsedBytes != null && s.memTotalBytes != null ? (
                        <div className="num mt-1 text-[11px] text-ink-3 text-right">
                          {formatBytes(s.memUsedBytes)} / {formatBytes(s.memTotalBytes)}
                        </div>
                      ) : null}
                    </div>

                    {/* Disk Progress */}
                    {s.diskPercent != null ? (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5 text-ink-2 font-medium">
                            <HardDrive className="size-3 text-ink-3" />
                            Storage
                          </span>
                          <span className="num font-semibold text-ink">
                            {formatPercent(s.diskPercent)}
                          </span>
                        </div>
                        <ProgressBar value={s.diskPercent} size="xs" />
                      </div>
                    ) : null}

                    {/* Uptime & Load */}
                    <div className="flex items-center justify-between border-t border-edge/40 pt-2 text-[11px] text-ink-3">
                      <span>Uptime: {formatUptime(s.uptimeSeconds)}</span>
                      {s.loadAverage ? (
                        <span className="font-mono">
                          Load: {s.loadAverage.map((n) => n.toFixed(2)).join(", ")}
                        </span>
                      ) : null}
                    </div>
                  </CardBody>
                </div>

                <CardFooter className="gap-2 bg-panel-2/40">
                  {s.ip ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(s.ip ?? "", "IP Address", `${s.id}-ip`);
                      }}
                      className="flex items-center gap-1 rounded bg-void border border-edge/70 px-2 py-1 font-mono text-[11px] text-ink-2 hover:bg-hover transition-colors"
                      title="Click to copy IP"
                    >
                      {copiedId === `${s.id}-ip` ? (
                        <Check className="size-3 text-emerald-500" />
                      ) : (
                        <Copy className="size-3 text-ink-3" />
                      )}
                      {s.ip}
                    </button>
                  ) : (
                    <span className="text-ink-3 text-[11px]">No IP</span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(sshCmd, "SSH Command", `${s.id}-ssh`);
                    }}
                    className="ml-auto flex items-center gap-1.5 rounded bg-void border border-edge/70 px-2 py-1 text-[11px] font-medium text-ink-2 hover:bg-hover transition-colors"
                    title={`Copy SSH: ${sshCmd}`}
                  >
                    {copiedId === `${s.id}-ssh` ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Terminal className="size-3 text-ink-3" />
                    )}
                    SSH
                  </button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardBody className="grid gap-2 p-2.5">
            {list.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-edge/70 bg-panel-2/50 px-3.5 py-3 transition-colors hover:border-accent/40"
              >
                <div className="flex min-w-44 items-center gap-2.5">
                  <StatusDot status={s.online ? "online" : "offline"} live={s.online} />
                  <div>
                    <Link
                      to="/servers"
                      className="font-semibold text-ink hover:text-accent-strong transition-colors text-[13px]"
                    >
                      {s.hostname}
                    </Link>
                    <div className="text-[11px] text-ink-3">
                      {s.os ?? "Linux"} {s.ip ? `· ${s.ip}` : ""}
                    </div>
                  </div>
                </div>

                <div className="num hidden sm:flex items-center gap-4 text-xs text-ink-2">
                  <div className="w-24">
                    <div className="flex justify-between text-[11px] text-ink-3">
                      <span>CPU</span>
                      <span>{s.cpuPercent == null ? "—" : formatPercent(s.cpuPercent)}</span>
                    </div>
                    <ProgressBar value={s.cpuPercent} size="xs" />
                  </div>
                  <div className="w-24">
                    <div className="flex justify-between text-[11px] text-ink-3">
                      <span>RAM</span>
                      <span>{s.memPercent == null ? "—" : formatPercent(s.memPercent)}</span>
                    </div>
                    <ProgressBar value={s.memPercent} size="xs" />
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-3 text-xs text-ink-2">
                  <span title="Uptime" className="hidden lg:inline text-ink-3">
                    up {formatUptime(s.uptimeSeconds)}
                  </span>
                  <StatusBadge status={s.online ? "online" : "offline"} />
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `ssh ${s.ip || s.hostname}`,
                        "SSH Command",
                        `${s.id}-list-ssh`,
                      )
                    }
                    className="rounded p-1 text-ink-3 hover:bg-hover hover:text-ink transition-colors"
                    title="Copy SSH command"
                    aria-label={`Copy SSH command for ${s.hostname}`}
                  >
                    {copiedId === `${s.id}-list-ssh` ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Terminal className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
