import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGithub, useIntegrations } from "../lib/queries";
import { keys } from "../lib/query";
import { apiDelete, apiGet, apiPost } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { ConfirmDialog } from "../components/ui/confirm";
import { Input, Field } from "../components/ui/input";
import { EmptyState, ErrorState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";
import { timeAgo } from "@opsora/utils";

const typeLabels: Record<string, string> = {
  docker: "Docker",
  pihole: "Pi-hole",
  github: "GitHub",
  linux_agent: "Linux Agent",
  tailscale: "Tailscale",
  s3: "S3 Storage",
};

export function IntegrationsPage(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useIntegrations();
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("docker");
  const [busy, setBusy] = React.useState(false);
  const [remove, setRemove] = React.useState<{ id: string; name: string } | null>(null);

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost("/api/integrations", { name, type });
      setName("");
      await qc.invalidateQueries({ queryKey: keys.integrations });
    } finally {
      setBusy(false);
    }
  }

  async function doRemove(): Promise<void> {
    if (!remove) return;
    await apiDelete(`/api/integrations/${remove.id}`, true);
    setRemove(null);
    await qc.invalidateQueries({ queryKey: keys.integrations });
  }

  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">Integrations</h1>
      {isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {isError ? (
        <ErrorState message="Could not load integrations." onRetry={() => void refetch()} />
      ) : null}
      {!isLoading && !isError && (data?.integrations.length ?? 0) === 0 ? (
        <EmptyState
          title="No integrations"
          hint="Adapters register here with honest health status."
        />
      ) : null}
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {(data?.integrations ?? []).map((i) => (
          <Card key={i.id}>
            <CardHeader>
              <CardTitle>{i.name}</CardTitle>
              <StatusBadge status={i.status} />
            </CardHeader>
            <CardBody className="grid gap-1.5 text-xs text-ink-2">
              <p>
                Type: {typeLabels[i.type] ?? i.type} · {i.enabled ? "enabled" : "disabled"}
              </p>
              {i.error ? <p className="text-amber-300">{i.error}</p> : null}
              {i.lastSync ? <p className="num">Last sync {timeAgo(i.lastSync)}</p> : null}
              <p className="truncate text-ink-3">{i.capabilities.join(" · ")}</p>
              <div className="mt-1 flex gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void apiGet(`/api/integrations`).then(() =>
                      qc.invalidateQueries({ queryKey: keys.integrations }),
                    )
                  }
                >
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setRemove({ id: i.id, name: i.name })}
                >
                  Remove
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Register integration</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={(e) => void add(e)} className="flex flex-wrap items-end gap-2">
            <div className="w-52">
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Local Docker"
                />
              </Field>
            </div>
            <div className="w-44">
              <Field label="Type">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-8 w-full rounded-md border border-edge bg-void px-2 text-[13px] text-ink"
                  aria-label="Integration type"
                >
                  {Object.entries(typeLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Button type="submit" disabled={busy || !name.trim()}>
              Register
            </Button>
          </form>
          <p className="mt-2 text-[11px] text-ink-3">
            Credentials are configured server-side via environment — never pasted into the browser.
          </p>
        </CardBody>
      </Card>
      <ConfirmDialog
        open={remove !== null}
        onOpenChange={(v) => {
          if (!v) setRemove(null);
        }}
        title="Remove integration"
        description={
          remove ? (
            <>
              Remove <strong>{remove.name}</strong>? Health history for this integration stays, but
              live checks stop.
            </>
          ) : null
        }
        confirmLabel="Remove"
        onConfirm={doRemove}
      />
    </div>
  );
}

export function GithubPage(): React.JSX.Element {
  const { data, isLoading } = useGithub();
  if (isLoading)
    return (
      <div className="p-3 md:p-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold tracking-tight">GitHub</h1>
        <StatusBadge status={data?.status ?? "unknown"} className="ml-auto" />
      </div>
      {data?.status !== "connected" ? (
        <EmptyState
          title="GitHub not connected"
          hint={
            data?.error ??
            "Set GITHUB_TOKEN and GITHUB_REPOS server-side. Tokens never reach the browser."
          }
        />
      ) : data.repos.length === 0 ? (
        <EmptyState
          title="No repositories configured"
          hint="Set GITHUB_REPOS=owner/repo,owner/repo server-side."
        />
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {data.repos.map((r) => (
            <Card key={r.fullName}>
              <CardHeader>
                <CardTitle>{r.fullName}</CardTitle>
              </CardHeader>
              <CardBody className="num grid gap-1 text-xs text-ink-2">
                <p>
                  Open issues: {r.openIssues ?? "—"} · Open PRs: {r.openPRs ?? "—"}
                </p>
                <p>Latest release: {r.latestRelease ?? "—"}</p>
                {r.error ? <p className="text-amber-300">{r.error}</p> : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function IntegrationDetailPage({
  title,
  hint,
  to,
}: {
  title: string;
  hint: string;
  to: string;
}): React.JSX.Element {
  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Setup</CardTitle>
          <StatusBadge status="not_connected" />
        </CardHeader>
        <CardBody className="grid gap-2 text-[13px] text-ink-2">
          <p>{hint}</p>
          <div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                window.location.hash = "";
                window.location.pathname = to;
              }}
            >
              Open full view
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
