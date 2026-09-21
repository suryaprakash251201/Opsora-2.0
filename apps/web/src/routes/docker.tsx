import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { containerAction, useDocker } from "../lib/queries";
import { keys } from "../lib/query";
import { Button } from "../components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { ConfirmDialog } from "../components/ui/confirm";
import { Table, THead, TRow, TH, TD } from "../components/ui/table";
import { EmptyState, ErrorState, OfflineState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";

export function DockerPage(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useDocker();
  const qc = useQueryClient();
  const [pending, setPending] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<{
    id: string;
    name: string;
    action: "start" | "stop" | "restart";
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function run(): Promise<void> {
    if (!confirm) return;
    setPending(confirm.id + confirm.action);
    setError(null);
    try {
      await containerAction(confirm.id, confirm.action);
      await qc.invalidateQueries({ queryKey: keys.docker });
    } catch (e) {
      setError(e instanceof Error ? e.message : "action failed");
    } finally {
      setPending(null);
      setConfirm(null);
    }
  }

  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">Docker</h1>
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
          <CardHeader>
            <CardTitle>
              {data.running} running · {data.stopped} stopped
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <Table aria-label="Containers">
              <THead>
                <TRow>
                  <TH>Name</TH>
                  <TH>Image</TH>
                  <TH>State</TH>
                  <TH>Ports</TH>
                  <TH>
                    <span className="sr-only">Actions</span>
                  </TH>
                </TRow>
              </THead>
              <tbody>
                {data.containers.map((c) => (
                  <TRow key={c.id}>
                    <TD className="text-ink">
                      {c.name}
                      <span className="num ml-2 text-[11px] text-ink-3">{c.id}</span>
                    </TD>
                    <TD className="max-w-48 truncate">{c.image}</TD>
                    <TD>
                      <StatusBadge status={c.state} />
                    </TD>
                    <TD className="num max-w-40 truncate">{c.ports.join(", ") || "—"}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {c.state !== "running" ? (
                          <Button
                            size="sm"
                            onClick={() => setConfirm({ id: c.id, name: c.name, action: "start" })}
                          >
                            Start
                          </Button>
                        ) : null}
                        {c.state === "running" ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              setConfirm({ id: c.id, name: c.name, action: "restart" })
                            }
                          >
                            Restart
                          </Button>
                        ) : null}
                        {c.state === "running" ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setConfirm({ id: c.id, name: c.name, action: "stop" })}
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
              ({confirm.id}).{" "}
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
    </div>
  );
}
