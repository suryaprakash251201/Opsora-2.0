import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { containerAction, useDocker } from "../lib/queries";
import { apiGet } from "../lib/api";
import { keys } from "../lib/query";
import { Button } from "../components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, CardAction } from "../components/ui/card";
import { ConfirmDialog } from "../components/ui/confirm";
import { MetricCard } from "../components/ui/metric-card";
import { Input } from "../components/ui/input";
import { PageHeader } from "../components/ui/page-header";
import { Table, THead, TRow, TH, TD } from "../components/ui/table";
import { compareBy, useSort } from "../lib/sort";
import { EmptyState, ErrorState, OfflineState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";
import { SegmentedControl } from "../components/ui/segmented";
import { useUi } from "../stores/ui";
import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import {
  Container,
  ExternalLink,
  Play,
  RefreshCw,
  Square,
  Terminal,
  X,
  Copy,
  Check,
} from "lucide-react";

export function DockerPage(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useDocker();
  const qc = useQueryClient();
  const addToast = useUi((s) => s.addToast);
  const [q, setQ] = React.useState("");
  const [filterState, setFilterState] = React.useState<"all" | "running" | "stopped">("all");
  const [pending, setPending] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<{
    id: string;
    name: string;
    action: "start" | "stop" | "restart";
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Logs viewer state
  const [logsContainer, setLogsContainer] = React.useState<{
    id: string;
    name: string;
    image: string;
  } | null>(null);

  async function run(): Promise<void> {
    if (!confirm) return;
    setPending(confirm.id + confirm.action);
    setError(null);
    try {
      await containerAction(confirm.id, confirm.action);
      await qc.invalidateQueries({ queryKey: keys.docker });
      addToast({
        title: `Container ${confirm.action}ed`,
        message: `Container ${confirm.name} (${confirm.id.slice(0, 12)}) was successfully ${confirm.action}ed.`,
        type: "success",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "action failed";
      setError(msg);
      addToast({
        title: `Action Failed`,
        message: msg,
        type: "error",
      });
    } finally {
      setPending(null);
      setConfirm(null);
    }
  }

  const containers = data?.containers ?? [];
  const filtered = containers.filter((c) => {
    if (filterState === "running" && c.state !== "running") return false;
    if (filterState === "stopped" && c.state === "running") return false;
    if (q) {
      const match =
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.image.toLowerCase().includes(q.toLowerCase());
      if (!match) return false;
    }
    return true;
  });
  const sort = useSort("name");
  const sorted = compareBy(filtered, sort.key, sort.dir, {
    name: (c) => c.name,
    image: (c) => c.image,
    state: (c) => c.state,
  });

  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="Docker Containers"
        description="Manage containerized workloads and view runtime state."
      />

      {/* KPI Cards */}
      {data && data.status === "connected" ? (
        <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Containers"
            icon={<Container className="size-3.5" />}
            value={containers.length}
            sub="Registered containers"
          />
          <MetricCard
            label="Running"
            icon={<Play className="size-3.5" />}
            value={data.running}
            sub={`${containers.length > 0 ? Math.round((data.running / containers.length) * 100) : 0}% of total`}
            progress={{
              value: containers.length > 0 ? (data.running / containers.length) * 100 : 0,
              tone: "ok",
            }}
            tone="ok"
          />
          <MetricCard
            label="Stopped / Exited"
            icon={<Square className="size-3.5" />}
            value={data.stopped}
            sub="Inactive containers"
            tone={data.stopped > 0 ? "default" : "default"}
          />
          <MetricCard
            label="Unhealthy"
            icon={<RefreshCw className="size-3.5" />}
            value={data.unhealthy}
            sub="Healthcheck failures"
            tone={data.unhealthy > 0 ? "crit" : "ok"}
          />
        </div>
      ) : null}

      {isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {isError ? (
        <ErrorState message="Could not load containers." onRetry={() => void refetch()} />
      ) : null}
      {!isLoading && !isError && (!data || data.status !== "connected") ? (
        <OfflineState
          title={data?.status === "not_connected" ? "Docker not connected" : "Docker unavailable"}
          hint={data?.error ?? "Expose the Docker socket to the API to manage containers."}
          onRetry={() => void refetch()}
        />
      ) : null}
      {!isLoading && !isError && data?.status === "connected" && data.containers.length === 0 ? (
        <EmptyState
          title="No containers"
          hint="The daemon is reachable but reports no containers."
        />
      ) : null}
      {error ? <ErrorState message={error} /> : null}

      {!isLoading &&
      !isError &&
      data &&
      data.status === "connected" &&
      data.containers.length > 0 ? (
        <Card>
          <CardHeader className="flex-wrap gap-y-2 border-b border-edge/40 bg-panel-2/30 py-3">
            <div className="flex items-center gap-2">
              <CardTitle>
                <span>Containers</span>
                <span className="text-[11px] font-normal text-ink-3">({filtered.length})</span>
              </CardTitle>
            </div>

            <CardAction className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                ariaLabel="Filter containers by state"
                value={filterState}
                onChange={setFilterState}
                options={[
                  { value: "all", label: "All", count: containers.length },
                  { value: "running", label: "Running", count: data?.running },
                  { value: "stopped", label: "Stopped", count: data?.stopped },
                ]}
                size="sm"
              />

              {/* Search input */}
              <div className="w-full sm:w-56">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter name or image…"
                  className="h-8 text-xs"
                />
              </div>
            </CardAction>
          </CardHeader>

          <CardBody className="p-0">
            <Table aria-label="Containers">
              <THead>
                <TRow>
                  <TH
                    sortable
                    active={sort.key === "name"}
                    dir={sort.dir}
                    onSort={() => sort.onSort("name")}
                  >
                    Name
                  </TH>
                  <TH
                    sortable
                    active={sort.key === "image"}
                    dir={sort.dir}
                    onSort={() => sort.onSort("image")}
                  >
                    Image
                  </TH>
                  <TH
                    sortable
                    active={sort.key === "state"}
                    dir={sort.dir}
                    onSort={() => sort.onSort("state")}
                  >
                    State
                  </TH>
                  <TH>Exposed Ports</TH>
                  <TH>
                    <span className="sr-only">Actions</span>
                  </TH>
                </TRow>
              </THead>
              <tbody>
                {sorted.map((c) => (
                  <TRow key={c.id}>
                    <TD className="text-ink">
                      <div className="font-semibold text-[13px]">{c.name}</div>
                      <div className="num font-mono text-[11px] text-ink-3">
                        {c.id.slice(0, 12)}
                      </div>
                    </TD>
                    <TD className="max-w-48 truncate font-mono text-xs text-ink-2">{c.image}</TD>
                    <TD>
                      <StatusBadge status={c.state} />
                    </TD>
                    <TD className="num max-w-40">
                      {c.ports.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.ports.map((p) => {
                            const portMatch = p.match(/:?(\d+)->/);
                            const hostPort = portMatch ? portMatch[1] : null;
                            return hostPort ? (
                              <a
                                key={p}
                                href={`http://localhost:${hostPort}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-void border border-edge px-1.5 py-0.5 font-mono text-[10px] text-accent-strong hover:border-accent transition-colors"
                                title={`Open http://localhost:${hostPort}`}
                              >
                                {p}
                                <ExternalLink className="size-2.5" />
                              </a>
                            ) : (
                              <span
                                key={p}
                                className="inline-flex items-center rounded bg-void border border-edge/60 px-1.5 py-0.5 font-mono text-[10px] text-ink-3"
                              >
                                {p}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-ink-3 text-xs">—</span>
                      )}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1.5">
                        {/* View Logs Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setLogsContainer({ id: c.id, name: c.name, image: c.image })
                          }
                          title="View logs"
                          className="gap-1 text-xs"
                        >
                          <Terminal className="size-3 text-ink-3" />
                          Logs
                        </Button>

                        {c.state !== "running" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setConfirm({ id: c.id, name: c.name, action: "start" })}
                            className="text-xs"
                          >
                            Start
                          </Button>
                        ) : null}
                        {c.state === "running" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setConfirm({ id: c.id, name: c.name, action: "restart" })
                            }
                            className="text-xs"
                          >
                            Restart
                          </Button>
                        ) : null}
                        {c.state === "running" ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setConfirm({ id: c.id, name: c.name, action: "stop" })}
                            className="text-xs"
                          >
                            Stop
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TRow>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      ) : null}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
        title={
          confirm
            ? `${confirm.action[0]?.toUpperCase()}${confirm.action.slice(1)} container`
            : "Confirm"
        }
        description={
          confirm ? (
            <>
              This will <strong>{confirm.action}</strong> container <strong>{confirm.name}</strong>{" "}
              ({confirm.id.slice(0, 12)}).{" "}
              {confirm.action === "stop"
                ? "Running processes inside the container will be terminated."
                : "The container will be briefly unavailable."}
            </>
          ) : null
        }
        confirmLabel={
          confirm ? `${confirm.action[0]?.toUpperCase()}${confirm.action.slice(1)}` : "Confirm"
        }
        pending={pending !== null}
        onConfirm={run}
      />

      {/* Container Logs Viewer Modal — real daemon output, honest states otherwise */}
      {logsContainer ? (
        <ContainerLogsDialog container={logsContainer} onClose={() => setLogsContainer(null)} />
      ) : null}
    </div>
  );
}

interface LogsResponse {
  id: string;
  logs: string;
  tail: number;
  updatedAt: string;
}

/** Fetches real logs from GET /api/docker/containers/:id/logs. */
function ContainerLogsDialog({
  container,
  onClose,
}: {
  container: { id: string; name: string; image: string };
  onClose: () => void;
}): React.JSX.Element {
  const [logs, setLogs] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLogs(null);
    setUpdatedAt(null);
    apiGet<LogsResponse>(`/api/docker/containers/${encodeURIComponent(container.id)}/logs?tail=200`)
      .then((res) => {
        if (cancelled) return;
        setLogs(res.logs);
        setUpdatedAt(res.updatedAt);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load logs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [container.id]);

  const lineCount = logs == null || logs === "" ? 0 : logs.split("\n").length;

  return (
    <BaseDialog.Root open={true} onOpenChange={(v) => !v && onClose()}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
        <BaseDialog.Popup className="fixed left-1/2 top-[8vh] z-50 w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-edge bg-panel p-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-edge pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-accent/15 text-accent-strong">
                <Terminal className="size-4" />
              </span>
              <div>
                <BaseDialog.Title className="text-sm font-semibold tracking-tight text-ink">
                  Container Logs: {container.name}
                </BaseDialog.Title>
                <p className="font-mono text-[11px] text-ink-3">{container.image}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={logs == null || logs === ""}
                onClick={() => {
                  if (!logs) return;
                  void navigator.clipboard.writeText(logs);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1 rounded-lg border border-edge bg-void px-2.5 py-1 text-xs text-ink-2 hover:bg-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copied ? "Copied" : "Copy logs"}
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-ink-3 hover:bg-hover hover:text-ink transition-colors"
                aria-label="Close logs dialog"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-3.5 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          ) : error ? (
            <div className="mt-3.5 rounded-xl border border-edge/80 bg-void/90 p-4 text-xs text-ink-2">
              <p className="font-semibold text-ink">Logs unavailable</p>
              <p className="mt-1 font-mono text-[11px] text-ink-3">{error}</p>
              <p className="mt-2 text-ink-3">
                The daemon did not return log output — no placeholder content is shown.
              </p>
            </div>
          ) : logs === "" ? (
            <EmptyState
              title="No log output"
              hint="The container exists but the daemon returned no log lines."
            />
          ) : (
            <pre className="mt-3.5 max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-edge/80 bg-void/90 p-3.5 font-mono text-xs text-ink-2">
              {logs}
            </pre>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-ink-3">
            <span>
              {loading ? "Fetching…" : error ? "Unavailable" : `${lineCount} lines (snapshot)`}
            </span>
            {updatedAt ? <span className="num">Taken {updatedAt}</span> : null}
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
