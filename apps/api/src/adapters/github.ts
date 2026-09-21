import type { ConnectionStatus } from "@opsora/types";
import type { IntegrationAdapter } from "./types.js";

export interface GithubRepoSummary {
  fullName: string;
  openIssues: number | null;
  openPRs: number | null;
  latestRelease: string | null;
  workflowStatus: string | null;
  updatedAt: string;
  error: string | null;
}

function configured(): boolean {
  return Boolean(
    process.env.GITHUB_TOKEN && (process.env.GITHUB_OWNER || process.env.GITHUB_REPOS),
  );
}

function repoList(): string[] {
  const csv = (process.env.GITHUB_REPOS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (csv.length > 0) return csv.slice(0, 10);
  const owner = (process.env.GITHUB_OWNER ?? "").trim();
  return owner ? [] : [];
}

async function gh(path: string): Promise<{ status: number; json: unknown }> {
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
  return { status: res.status, json };
}

export async function getGithubSummary(): Promise<{
  status: ConnectionStatus;
  repos: GithubRepoSummary[];
  error: string | null;
  updatedAt: string;
}> {
  const updatedAt = new Date().toISOString();
  if (!configured()) {
    return {
      status: "not_connected",
      repos: [],
      error: "GITHUB_TOKEN / GITHUB_OWNER not configured",
      updatedAt,
    };
  }
  const repos = repoList();
  if (repos.length === 0) {
    return {
      status: "connected",
      repos: [],
      error: "no repositories configured (set GITHUB_REPOS)",
      updatedAt,
    };
  }
  const out: GithubRepoSummary[] = [];
  for (const fullName of repos) {
    try {
      const [repo, pulls, release] = await Promise.all([
        gh(`/repos/${fullName}`),
        gh(`/repos/${fullName}/pulls?state=open&per_page=1`),
        gh(`/repos/${fullName}/releases/latest`),
      ]);
      const repoJson = repo.json as { open_issues_count?: number } | null;
      const pullsJson = Array.isArray(pulls.json) ? pulls.json : [];
      const releaseJson = release.json as { tag_name?: string } | null;
      out.push({
        fullName,
        openIssues:
          typeof repoJson?.open_issues_count === "number" ? repoJson.open_issues_count : null,
        openPRs: repo.status === 200 ? pullsJson.length : null,
        latestRelease: release.status === 200 ? (releaseJson?.tag_name ?? null) : null,
        workflowStatus: null,
        updatedAt,
        error: repo.status === 200 ? null : `github http ${repo.status}`,
      });
    } catch (err) {
      out.push({
        fullName,
        openIssues: null,
        openPRs: null,
        latestRelease: null,
        workflowStatus: null,
        updatedAt,
        error: err instanceof Error ? err.message : "github error",
      });
    }
  }
  return { status: "connected", repos: out, error: null, updatedAt };
}

export const githubAdapter: IntegrationAdapter = {
  id: "github",
  name: "GitHub",
  type: "github",
  capabilities: ["repos.status", "repos.pulls", "repos.releases"],
  async healthCheck(): Promise<{ status: ConnectionStatus; error?: string | null }> {
    if (!configured()) return { status: "not_connected", error: "not configured" };
    try {
      const { status } = await gh("/rate_limit");
      if (status === 200) return { status: "connected", error: null };
      if (status === 401 || status === 403)
        return { status: "unavailable", error: `github http ${status}` };
      return { status: "unavailable", error: `github http ${status}` };
    } catch (err) {
      return { status: "unavailable", error: err instanceof Error ? err.message : "github error" };
    }
  },
};
