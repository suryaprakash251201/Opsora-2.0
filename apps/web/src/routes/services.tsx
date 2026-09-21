import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { triggerServiceCheck, useServices } from "../lib/queries";
import { keys } from "../lib/query";
import { apiPost } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { Input, Field } from "../components/ui/input";
import { Table, THead, TRow, TH, TD } from "../components/ui/table";
import { EmptyState, ErrorState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";

export function ServicesPage(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useServices();
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/services", { name, url: url || null });
      setName("");
      setUrl("");
      await qc.invalidateQueries({ queryKey: keys.services });
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not add service");
    } finally {
      setBusy(false);
    }
  }

  async function recheck(): Promise<void> {
    setBusy(true);
    try {
      await triggerServiceCheck();
      await qc.invalidateQueries({ queryKey: keys.services });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold tracking-tight">Services</h1>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void recheck()}
          disabled={busy}
          className="ml-auto"
        >
          Run checks
        </Button>
      </div>
      {isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {isError ? (
        <ErrorState message="Could not load services." onRetry={() => void refetch()} />
      ) : null}
      {!isLoading && !isError && (data?.services.length ?? 0) === 0 ? (
        <EmptyState
          title="No services"
          hint="Add a URL below — Opsora performs real HTTP health checks, never inferred status."
        />
      ) : null}
      {!isLoading && !isError && (data?.services.length ?? 0) > 0 ? (
        <Table aria-label="Services">
          <THead>
            <TRow>
              <TH>Name</TH>
              <TH>Status</TH>
              <TH>HTTP</TH>
              <TH>Latency</TH>
              <TH>Last check</TH>
            </TRow>
          </THead>
          <tbody>
            {(data?.services ?? []).map((s) => (
              <TRow key={s.id}>
                <TD className="text-ink">
                  {s.name}
                  <div className="truncate text-[11px] text-ink-3">{s.url ?? "no URL"}</div>
                </TD>
                <TD>
                  <StatusBadge status={s.status} />
                </TD>
                <TD className="num">{s.httpStatus ?? "—"}</TD>
                <TD className="num">{s.responseTimeMs != null ? `${s.responseTimeMs} ms` : "—"}</TD>
                <TD className="num text-xs">
                  {s.lastCheck ? new Date(s.lastCheck).toLocaleString() : "—"}
                </TD>
              </TRow>
            ))}
          </tbody>
        </Table>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Add service</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={(e) => void add(e)} className="flex flex-wrap items-end gap-2">
            <div className="w-52">
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Nextcloud"
                />
              </Field>
            </div>
            <div className="min-w-64 flex-1">
              <Field label="URL">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  inputMode="url"
                />
              </Field>
            </div>
            <Button type="submit" disabled={busy || !name.trim()}>
              Add
            </Button>
          </form>
          {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}
