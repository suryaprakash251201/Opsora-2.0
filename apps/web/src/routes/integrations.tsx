import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchGithub, useGithub, useIntegrations } from "../lib/queries";
import { keys } from "../lib/query";
import { apiDelete, apiPost } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { ConfirmDialog } from "../components/ui/confirm";
import { Input, Field } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { PageHeader } from "../components/ui/page-header";
import { EmptyState, ErrorState, OfflineState } from "../components/ui/states";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";
import { MetricCard } from "../components/ui/metric-card";
import { ProgressBar } from "../components/ui/progress-bar";
import { SegmentedControl } from "../components/ui/segmented";
import {
  Archive,
  ArrowUpRight,
  CircleDot,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  RefreshCw,
  Search,
  Star,
  Tag,
  Workflow,
} from "lucide-react";
import { timeAgo } from "@opsora/utils";
import type { GithubRepo } from "@opsora/types";
import { useUi } from "../stores/ui";

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
  const addToast = useUi((s) => s.addToast);

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost("/api/integrations", { name, type });
      setName("");
      await qc.invalidateQueries({ queryKey: keys.integrations });
      addToast({
        title: "Integration registered",
        message: `${name} is now available to Opsora.`,
        type: "success",
      });
    } catch {
      addToast({
        title: "Registration failed",
        message: "The integration could not be registered.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function doRemove(): Promise<void> {
    if (!remove) return;
    try {
      await apiDelete(`/api/integrations/${remove.id}`, true);
      setRemove(null);
      await qc.invalidateQueries({ queryKey: keys.integrations });
      addToast({
        title: "Integration removed",
        message: `${remove.name} will no longer be checked.`,
        type: "info",
      });
    } catch {
      addToast({
        title: "Remove failed",
        message: `${remove.name} is still registered.`,
        type: "error",
      });
    }
  }

  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="Integrations"
        description="External systems Opsora can talk to — status is honest, never fabricated."
      />
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
              {i.error ? <p className="text-amber-700 dark:text-amber-300">{i.error}</p> : null}
              {i.lastSync ? <p className="num">Last sync {timeAgo(i.lastSync)}</p> : null}
              <p className="truncate text-ink-3">{i.capabilities.join(" · ")}</p>
              <div className="mt-1 flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => void refetch()}>
                  Refresh
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
            <div className="w-full sm:w-52">
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Local Docker"
                />
              </Field>
            </div>
            <div className="w-full sm:w-44">
              <Field label="Type">
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  aria-label="Integration type"
                >
                  {Object.entries(typeLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
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

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Go: "#00add8",
  Rust: "#dea584",
  Shell: "#89e051",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Dockerfile: "#384d54",
  HCL: "#844fba",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Java: "#b07219",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
};

type GithubFilter = "all" | "passing" | "failing" | "attention" | "archived";

const GITHUB_FILTERS: { value: GithubFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "passing", label: "CI passing" },
  { value: "failing", label: "CI failing" },
  { value: "attention", label: "Needs attention" },
  { value: "archived", label: "Archived" },
];

const CI_FAILURE_STATUSES = new Set(["failure", "timed_out", "cancelled"]);

function ciIsFailing(repo: GithubRepo): boolean {
  return CI_FAILURE_STATUSES.has(repo.workflowStatus ?? "");
}

function repoNeedsAttention(repo: GithubRepo): boolean {
  return ciIsFailing(repo) || repo.archived || (repo.openPRs ?? 0) > 0;
}

/** CI chip from the latest Actions run — links straight to the Actions tab. */
function CiBadge({ repo }: { repo: GithubRepo }): React.JSX.Element {
  const s = repo.workflowStatus;
  const chip = (cls: string, label: string, pulse = false): React.JSX.Element => (
    <a
      href={`${repo.url}/actions`}
      target="_blank"
      rel="noreferrer"
      title="Open GitHub Actions"
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors hover:opacity-75 ${cls}${pulse ? " animate-pulse" : ""}`}
    >
      {label}
    </a>
  );
  if (s === "success")
    return chip(
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      "CI passing",
    );
  if (s === "failure")
    return chip("border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300", "CI failing");
  if (s === "timed_out")
    return chip(
      "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
      "CI timed out",
    );
  if (s === "cancelled")
    return chip(
      "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
      "CI cancelled",
    );
  if (s && ["in_progress", "queued", "requested", "waiting", "pending"].includes(s))
    return chip(
      "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
      "CI running",
      true,
    );
  if (s && ["skipped", "neutral", "stale"].includes(s))
    return chip("border-edge bg-void text-ink-3", "CI skipped");
  return (
    <span
      className="inline-flex items-center rounded-full border border-edge bg-void px-2 py-0.5 text-[11px] text-ink-3"
      title="No workflow run reported by GitHub"
    >
      CI —
    </span>
  );
}

export function GithubPage(): React.JSX.Element {
  const { data, isLoading, isFetching } = useGithub();
  const qc = useQueryClient();
  const addToast = useUi((s) => s.addToast);
  const [repoQuery, setRepoQuery] = React.useState("");
  const [repoFilter, setRepoFilter] = React.useState<GithubFilter>("all");
  const [refreshing, setRefreshing] = React.useState(false);

  async function refreshGithub(): Promise<void> {
    setRefreshing(true);
    try {
      const fresh = await fetchGithub(true);
      qc.setQueryData(keys.github, fresh);
      addToast({
        title: "GitHub data refreshed",
        message: "Repository signals now reflect the latest API response.",
        type: "success",
      });
    } catch {
      addToast({
        title: "GitHub refresh failed",
        message: "The cached repository data is still available.",
        type: "error",
      });
    } finally {
      setRefreshing(false);
    }
  }

  if (isLoading)
    return (
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-5">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </div>
    );

  const repos = data?.repos ?? [];
  const stars = repos.reduce((n, r) => n + (r.stars ?? 0), 0);
  const issues = repos.reduce((n, r) => n + (r.openIssues ?? 0), 0);
  const prs = repos.reduce((n, r) => n + (r.openPRs ?? 0), 0);
  const ciPassing = repos.filter((r) => r.workflowStatus === "success").length;
  const ciFailing = repos.filter(ciIsFailing).length;
  const ciKnown = repos.filter((r) => r.workflowStatus != null).length;
  const latestRelease = repos
    .filter((r) => r.latestRelease && r.latestReleaseAt)
    .sort((a, b) => (b.latestReleaseAt ?? "").localeCompare(a.latestReleaseAt ?? ""))[0];
  const attentionCount = repos.filter(repoNeedsAttention).length;
  const archivedCount = repos.filter((r) => r.archived).length;
  const query = repoQuery.trim().toLowerCase();
  const visibleRepos = repos.filter((repo) => {
    const matchesQuery =
      !query ||
      repo.fullName.toLowerCase().includes(query) ||
      repo.description?.toLowerCase().includes(query) ||
      repo.language?.toLowerCase().includes(query);
    const matchesFilter =
      repoFilter === "all" ||
      (repoFilter === "passing" && repo.workflowStatus === "success") ||
      (repoFilter === "failing" && ciIsFailing(repo)) ||
      (repoFilter === "attention" && repoNeedsAttention(repo)) ||
      (repoFilter === "archived" && repo.archived);
    return matchesQuery && matchesFilter;
  });
  const ciPassRate = ciKnown > 0 ? Math.round((ciPassing / ciKnown) * 100) : null;
  const filterOptions = GITHUB_FILTERS.map((option) => ({
    ...option,
    count:
      option.value === "all"
        ? repos.length
        : option.value === "passing"
          ? ciPassing
          : option.value === "failing"
            ? ciFailing
            : option.value === "attention"
              ? attentionCount
              : archivedCount,
  }));

  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="GitHub Repository Monitor"
        description="Stars, issues, pull requests, releases, and CI — polled from the GitHub API, cached server-side."
        badge={<StatusBadge status={data?.status ?? "unknown"} />}
        actions={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void refreshGithub()}
            disabled={isFetching || refreshing}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isFetching || refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      {data?.status !== "connected" ? (
        <OfflineState
          title="GitHub monitor not connected"
          hint={
            data?.error ??
            "Set GITHUB_TOKEN and GITHUB_REPOS server-side. Tokens never reach the browser."
          }
          onRetry={() => void refreshGithub()}
        />
      ) : repos.length === 0 ? (
        <EmptyState
          title="No repositories configured"
          hint="Set GITHUB_REPOS=owner/repo,owner/repo — or GITHUB_OWNER to monitor an account's latest repositories."
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              label="Repositories"
              icon={<FolderGit2 className="size-3.5" />}
              value={repos.length}
              sub="monitored"
            />
            <MetricCard
              label="Total stars"
              icon={<Star className="size-3.5" />}
              value={stars.toLocaleString()}
              sub="across all repos"
            />
            <MetricCard
              label="Open issues"
              icon={<CircleDot className="size-3.5" />}
              value={issues}
              sub="pull requests excluded"
            />
            <MetricCard
              label="Open PRs"
              icon={<GitPullRequest className="size-3.5" />}
              value={prs}
              sub="awaiting review"
            />
            <MetricCard
              label="CI status"
              icon={<Workflow className="size-3.5" />}
              value={`${ciPassing}/${ciKnown}`}
              sub={
                ciFailing > 0
                  ? `${ciFailing} failing`
                  : ciKnown > 0
                    ? "last runs passing"
                    : "no runs yet"
              }
              tone={ciFailing > 0 ? "crit" : "ok"}
            />
          </div>

          <Card variant="accent">
            <CardHeader>
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent-strong">
                  <Workflow className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <CardTitle>CI pulse</CardTitle>
                  <CardDescription>
                    Latest workflow outcomes across the watched repositories.
                  </CardDescription>
                </div>
              </div>
              <span className="num shrink-0 text-sm font-bold text-ink">
                {ciPassRate == null ? "—" : `${ciPassRate}%`}
              </span>
            </CardHeader>
            <CardBody className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-ink-2">
                  <span>Passing workflows</span>
                  <span className="num">
                    {ciPassing}/{ciKnown || 0} known
                  </span>
                </div>
                <ProgressBar
                  value={ciPassRate}
                  tone={
                    ciPassRate == null
                      ? "default"
                      : ciPassRate >= 90
                        ? "ok"
                        : ciPassRate >= 70
                          ? "warn"
                          : "crit"
                  }
                  size="sm"
                  label="CI pass rate"
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-ink-2 md:justify-end">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-edge/70 bg-void/40 px-2.5 py-1.5">
                  <GitBranch className="size-3.5 text-ink-3" aria-hidden />
                  {prs} open PR{prs === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-edge/70 bg-void/40 px-2.5 py-1.5">
                  <Archive className="size-3.5 text-ink-3" aria-hidden />
                  {archivedCount} archived
                </span>
              </div>
            </CardBody>
          </Card>

          {/* Release radar */}
          <Card variant="feature">
            <CardHeader>
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent-strong">
                  <Tag className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <CardTitle>Release radar</CardTitle>
                  <CardDescription>
                    Stay close to the newest version across your watched code.
                  </CardDescription>
                </div>
              </div>
              {latestRelease ? (
                <a
                  href={`${latestRelease.url}/releases/latest`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent/10"
                >
                  Open release <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              ) : null}
            </CardHeader>
            <CardBody>
              {latestRelease ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
                  <span className="font-semibold text-ink">{latestRelease.latestRelease}</span>
                  <span className="text-ink-3">on</span>
                  <span className="font-medium">{latestRelease.fullName}</span>
                  <span className="text-ink-3">
                    · released {timeAgo(latestRelease.latestReleaseAt ?? "")}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-ink-3">
                  No release has been published for the monitored repositories yet.
                </p>
              )}
            </CardBody>
          </Card>

          {/* Repository signal controls */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Repository signal</CardTitle>
                <CardDescription>
                  Search and focus the repositories that need your attention.
                </CardDescription>
              </div>
              <span className="num shrink-0 rounded-full border border-edge bg-void px-2 py-1 text-[10px] text-ink-2">
                {visibleRepos.length}/{repos.length} shown
              </span>
            </CardHeader>
            <CardBody className="grid gap-3 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] lg:items-end">
              <div className="grid gap-1.5">
                <label
                  htmlFor="github-repo-search"
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3"
                >
                  Search repositories
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-3"
                    aria-hidden
                  />
                  <Input
                    id="github-repo-search"
                    value={repoQuery}
                    onChange={(e) => setRepoQuery(e.target.value)}
                    placeholder="Search by name, language, or description"
                    className="pl-9"
                    type="search"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  Filter by signal
                </span>
                <SegmentedControl
                  ariaLabel="Filter GitHub repositories"
                  value={repoFilter}
                  onChange={setRepoFilter}
                  options={filterOptions}
                  size="sm"
                  className="w-fit max-w-full"
                />
              </div>
            </CardBody>
          </Card>

          {/* Repository cards */}
          {visibleRepos.length === 0 ? (
            <EmptyState
              title="No repositories match"
              hint="Try a different search or clear the signal filter to see all monitored repositories."
            />
          ) : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleRepos.map((r) => {
              const [owner, name] = r.fullName.split("/");
              return (
                <Card key={r.fullName} className="flex min-h-[21rem] flex-col">
                  <CardHeader className="items-start">
                    <CardTitle className="min-w-0 flex-1">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex min-w-0 items-baseline gap-1"
                      >
                        <span className="truncate font-normal text-ink-3 transition-colors group-hover:text-accent-strong">
                          {owner}/
                        </span>
                        <span className="truncate transition-colors group-hover:text-accent-strong">
                          {name}
                        </span>
                      </a>
                    </CardTitle>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      {r.archived ? (
                        <span className="rounded-full border border-edge bg-void px-2 py-0.5 text-[11px] text-ink-3">
                          archived
                        </span>
                      ) : null}
                      {r.private ? (
                        <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[11px] text-accent-strong">
                          private
                        </span>
                      ) : null}
                      <CiBadge repo={r} />
                    </div>
                  </CardHeader>
                  <CardBody className="grid flex-1 gap-2.5">
                    <p className="line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-ink-2">
                      {r.description ?? (
                        <span className="text-ink-3 italic">No description provided.</span>
                      )}
                    </p>
                    <div className="num flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-2">
                      <span className="inline-flex items-center gap-1" title="Stars">
                        <Star className="size-3.5 text-amber-400" />
                        {r.stars ?? "—"}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Open issues">
                        <CircleDot className="size-3.5 text-ink-3" />
                        {r.openIssues ?? "—"}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Open pull requests">
                        <GitPullRequest className="size-3.5 text-ink-3" />
                        {r.openPRs ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-edge/50 pt-2 text-[11px] text-ink-3">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: LANG_COLORS[r.language ?? ""] ?? "#64748b" }}
                          aria-hidden
                        />
                        <span className="truncate">{r.language ?? "Unknown"}</span>
                      </span>
                      <span className="shrink-0">
                        {r.lastPushAt ? `pushed ${timeAgo(r.lastPushAt)}` : "no push recorded"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-ink-2">
                        <Tag className="size-3.5 shrink-0 text-ink-3" />
                        {r.latestRelease ? (
                          <code className="truncate rounded bg-void px-1.5 py-0.5 text-ink">
                            {r.latestRelease}
                          </code>
                        ) : (
                          <span className="text-ink-3">no releases</span>
                        )}
                        {r.latestReleaseAt ? (
                          <span className="shrink-0 text-ink-3">{timeAgo(r.latestReleaseAt)}</span>
                        ) : null}
                      </span>
                      {r.defaultBranch ? (
                        <span className="shrink-0 text-ink-3" title="Default branch">
                          {r.defaultBranch}
                        </span>
                      ) : null}
                    </div>
                    {r.url ? (
                      <div className="mt-auto flex flex-wrap gap-1.5 border-t border-edge/50 pt-2.5 text-[11px]">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-edge/70 bg-void/40 px-2 py-1 text-ink-2 transition-colors hover:border-accent/35 hover:text-ink"
                        >
                          Repository <ArrowUpRight className="size-3" aria-hidden />
                        </a>
                        <a
                          href={`${r.url}/actions`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-edge/70 bg-void/40 px-2 py-1 text-ink-2 transition-colors hover:border-accent/35 hover:text-ink"
                        >
                          Actions
                        </a>
                        <a
                          href={`${r.url}/issues`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-edge/70 bg-void/40 px-2 py-1 text-ink-2 transition-colors hover:border-accent/35 hover:text-ink"
                        >
                          Issues <span className="num">{r.openIssues ?? "—"}</span>
                        </a>
                        <a
                          href={`${r.url}/pulls`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-edge/70 bg-void/40 px-2 py-1 text-ink-2 transition-colors hover:border-accent/35 hover:text-ink"
                        >
                          PRs <span className="num">{r.openPRs ?? "—"}</span>
                        </a>
                      </div>
                    ) : null}
                    {r.error ? (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">{r.error}</p>
                    ) : null}
                  </CardBody>
                </Card>
              );
            })}
          </div>

          <p className="text-[11px] text-ink-3">
            Last polled {timeAgo(data.updatedAt)} — responses are cached server-side for 90 seconds
            {data.error ? ` · ${data.error}` : ""}
          </p>
        </>
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
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader title={title} description="Integration setup and connection status." />
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
