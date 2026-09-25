import type { ConnectionStatus, GithubRepo } from "@opsora/types";
import { bus } from "../realtime/bus.js";
import type { IntegrationAdapter } from "./types.js";

export type GithubRepoSummary = GithubRepo;

interface GithubSummaryValue {
  status: ConnectionStatus;
  repos: GithubRepo[];
  error: string | null;
  updatedAt: string;
}

/** Shared cache — protects the GitHub rate limit when the UI polls. */
const CACHE_TTL_MS = 90_000;
let cache: { at: number; value: GithubSummaryValue } | null = null;

function configured(): boolean {
  return Boolean(
    process.env.GITHUB_TOKEN && (process.env.GITHUB_OWNER || process.env.GITHUB_REPOS),
  );
}

async function gh(path: string): Promise<{ status: number; json: unknown; link: string | null }> {
  const token = process.env.GITHUB_TOKEN ?? "";
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(8000),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json, link: res.headers.get("link") };
}

/** GITHUB_REPOS CSV, else the owner's latest repos, else none. */
async function resolveRepos(): Promise<string[]> {
  const csv = (process.env.GITHUB_REPOS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (csv.length > 0) return csv.slice(0, 10);
  const owner = (process.env.GITHUB_OWNER ?? "").trim();
  if (owner) {
    const r = await gh(`/users/${owner}/repos?per_page=10&sort=pushed&type=owner`);
    if (r.status === 200 && Array.isArray(r.json)) {
      return (r.json as { full_name?: string }[])
        .map((x) => x.full_name ?? "")
        .filter(Boolean)
        .slice(0, 10);
    }
  }
  return [];
}

/** With per_page=1 the `rel="last"` page number IS the total count. */
function lastPage(link: string | null): number | null {
  const m = link?.match(/page=(\d+)>;\s*rel="last"/);
  return m ? Number(m[1]) : null;
}

function emptyRepo(fullName: string, at: string): GithubRepo {
  return {
    fullName,
    description: null,
    stars: null,
    forks: null,
    watchers: null,
    openIssues: null,
    openPRs: null,
    language: null,
    defaultBranch: null,
    lastPushAt: null,
    latestRelease: null,
    latestReleaseAt: null,
    workflowStatus: null,
    archived: false,
    private: false,
    url: `https://github.com/${fullName}`,
    updatedAt: at,
    error: null,
  };
}

/** Previous CI conclusions so breakage surfaces as an event exactly once. */
const prevCi = new Map<string, string>();

async function fetchRepo(fullName: string, at: string): Promise<GithubRepo> {
  try {
    const [repo, pulls, release, runs, commits] = await Promise.all([
      gh(`/repos/${fullName}`),
      gh(`/repos/${fullName}/pulls?state=open&per_page=1`),
      gh(`/repos/${fullName}/releases/latest`),
      gh(`/repos/${fullName}/actions/runs?per_page=1`),
      gh(`/repos/${fullName}/commits?per_page=1`),
    ]);
    if (repo.status !== 200) {
      return { ...emptyRepo(fullName, at), error: `github http ${repo.status}` };
    }
    const r = repo.json as {
      description?: string | null;
      stargazers_count?: number;
      forks_count?: number;
      subscribers_count?: number;
      open_issues_count?: number;
      language?: string | null;
      default_branch?: string;
      pushed_at?: string | null;
      html_url?: string;
      archived?: boolean;
      private?: boolean;
    };

    // Open PRs via Link header; issues = open_issues_count minus PRs (GitHub
    // counts PRs inside open_issues_count).
    const pullsArr = Array.isArray(pulls.json) ? pulls.json : [];
    const prCount =
      pulls.status === 200 ? (lastPage(pulls.link) ?? pullsArr.length) : null;
    const openIssues =
      typeof r.open_issues_count !== "number"
        ? null
        : prCount != null
          ? Math.max(0, r.open_issues_count - prCount)
          : null; // breakdown unknown → honest null, never a wrong number

    const rel =
      release.status === 200
        ? (release.json as { tag_name?: string; published_at?: string })
        : null;
    const runJson =
      runs.status === 200
        ? (runs.json as { workflow_runs?: { status?: string | null; conclusion?: string | null }[] })
        : null;
    const latestRun = runJson?.workflow_runs?.[0] ?? null;
    const ci = latestRun ? (latestRun.conclusion ?? latestRun.status ?? null) : null;

    const commitArr =
      commits.status === 200 && Array.isArray(commits.json)
        ? (commits.json as { commit?: { committer?: { date?: string } } }[])
        : [];
    const lastCommitDate = commitArr[0]?.commit?.committer?.date ?? null;

    // Surface CI breakage as a real event — only on an observed transition.
    if (ci) {
      const prev = prevCi.get(fullName);
      if (prev !== undefined && prev !== ci && (ci === "failure" || ci === "cancelled")) {
        bus.publish({
          category: "github",
          resource: fullName,
          message: `CI ${ci} on ${fullName}`,
          severity: ci === "failure" ? "critical" : "warning",
        });
      }
      prevCi.set(fullName, ci);
    }

    return {
      fullName,
      description: r.description ?? null,
      stars: r.stargazers_count ?? null,
      forks: r.forks_count ?? null,
      watchers: r.subscribers_count ?? null,
      openIssues,
      openPRs: prCount,
      language: r.language ?? null,
      defaultBranch: r.default_branch ?? null,
      lastPushAt: r.pushed_at ?? lastCommitDate,
      latestRelease: rel?.tag_name ?? null,
      latestReleaseAt: rel?.published_at ?? null,
      workflowStatus: ci,
      archived: Boolean(r.archived),
      private: Boolean(r.private),
      url: r.html_url ?? `https://github.com/${fullName}`,
      updatedAt: at,
      error: null,
    };
  } catch (err) {
    return { ...emptyRepo(fullName, at), error: err instanceof Error ? err.message : "github error" };
  }
}

export async function getGithubSummary(force = false): Promise<GithubSummaryValue> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_TTL_MS) return cache.value;

  const updatedAt = new Date().toISOString();
  let value: GithubSummaryValue;

  if (!configured()) {
    value = {
      status: "not_connected",
      repos: [],
      error: "GITHUB_TOKEN / GITHUB_OWNER not configured",
      updatedAt,
    };
  } else {
    const names = await resolveRepos();
    if (names.length === 0) {
      value = {
        status: "connected",
        repos: [],
        error: "no repositories configured (set GITHUB_REPOS or GITHUB_OWNER)",
        updatedAt,
      };
    } else {
      const repos = await Promise.all(names.map((n) => fetchRepo(n, updatedAt)));
      value = { status: "connected", repos, error: null, updatedAt };
    }
  }

  cache = { at: now, value };
  return value;
}

export const githubAdapter: IntegrationAdapter = {
  id: "github",
  name: "GitHub",
  type: "github",
  capabilities: [
    "repos.status",
    "repos.pulls",
    "repos.releases",
    "repos.stars",
    "repos.ci",
    "repos.commits",
  ],
  async healthCheck(): Promise<{ status: ConnectionStatus; error?: string | null }> {
    if (!configured()) return { status: "not_connected", error: "not configured" };
    try {
      const { status } = await gh("/rate_limit");
      if (status === 200) return { status: "connected", error: null };
      return { status: "unavailable", error: `github http ${status}` };
    } catch (err) {
      return { status: "unavailable", error: err instanceof Error ? err.message : "github error" };
    }
  },
};
