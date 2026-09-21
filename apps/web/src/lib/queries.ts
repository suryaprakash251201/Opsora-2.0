import type {
  Alert,
  Container,
  Device,
  DnsSummary,
  DockerSummary,
  Host,
  InfraEvent,
  Integration,
  MetricPoint,
  NetworkSummary,
  Service,
  StorageResource,
} from "@opsora/types";
import { useQuery } from "@tanstack/react-query";
import { queryPolicy } from "@opsora/config";
import { apiGet, apiPost } from "./api";
import { keys } from "./query";

export interface OverviewResponse {
  health: { level: string; healthy: number; warning: number; critical: number; total: number };
  host: {
    hostname: string;
    cpu: number | null;
    mem: number | null;
    disk: number | null;
    uptimeSeconds: number | null;
    tempCelsius: number | null;
  };
  counts: {
    dockerRunning: number;
    dockerStopped: number;
    servicesUp: number;
    servicesTotal: number;
    devicesOnline: number;
  };
  integrations: Record<string, string>;
  updatedAt: string;
}

export function useOverview() {
  return useQuery({
    queryKey: keys.overview,
    queryFn: () => apiGet<OverviewResponse>("/api/health/overview"),
    staleTime: queryPolicy.metrics.staleTime,
    refetchInterval: queryPolicy.metrics.refetchInterval,
  });
}

export function useServers() {
  return useQuery({
    queryKey: keys.servers,
    queryFn: () => apiGet<{ servers: Host[]; updatedAt: string }>("/api/servers"),
    staleTime: queryPolicy.metrics.staleTime,
    refetchInterval: queryPolicy.metrics.refetchInterval,
  });
}

export function useMetricsHistory(range: string) {
  return useQuery({
    queryKey: keys.metricsHistory(range),
    queryFn: () =>
      apiGet<{ range: string; points: MetricPoint[] }>("/api/metrics/history?range=" + range),
    staleTime: queryPolicy.history.staleTime,
  });
}

export function useDocker() {
  return useQuery({
    queryKey: keys.docker,
    queryFn: () => apiGet<DockerSummary>("/api/docker/containers"),
    staleTime: queryPolicy.serviceHealth.staleTime,
    refetchInterval: queryPolicy.serviceHealth.refetchInterval,
  });
}

export function useServices(poll = true) {
  return useQuery({
    queryKey: keys.services,
    queryFn: () => apiGet<{ services: Service[]; updatedAt: string }>("/api/services"),
    staleTime: queryPolicy.serviceHealth.staleTime,
    refetchInterval: poll ? queryPolicy.serviceHealth.refetchInterval : false,
  });
}

export function useDevices(q: string, status: string) {
  return useQuery({
    queryKey: keys.devices(q, status),
    queryFn: () =>
      apiGet<{ devices: Device[]; tailscaleStatus: string; updatedAt: string }>(
        `/api/devices?q=${encodeURIComponent(q)}&status=${status}`,
      ),
    staleTime: queryPolicy.discovery.staleTime,
    refetchInterval: queryPolicy.discovery.refetchInterval,
  });
}

export function useNetwork() {
  return useQuery({
    queryKey: keys.network,
    queryFn: () =>
      apiGet<{
        summary: NetworkSummary;
        topology: {
          nodes: { id: string; label: string; kind: string; online: boolean }[];
          links: unknown[];
        };
        tailscaleStatus: string;
        updatedAt: string;
      }>("/api/network"),
    staleTime: queryPolicy.serviceHealth.staleTime,
    refetchInterval: queryPolicy.serviceHealth.refetchInterval,
  });
}

export function useStorage() {
  return useQuery({
    queryKey: keys.storage,
    queryFn: () =>
      apiGet<{
        local: StorageResource[];
        s3Buckets: StorageResource[];
        s3Status: string;
        s3Error: string | null;
        updatedAt: string;
      }>("/api/storage"),
    staleTime: queryPolicy.storage.staleTime,
    refetchInterval: queryPolicy.storage.refetchInterval,
  });
}

export function useDns() {
  return useQuery({
    queryKey: keys.dns,
    queryFn: () => apiGet<DnsSummary>("/api/dns"),
    staleTime: queryPolicy.serviceHealth.staleTime,
    refetchInterval: queryPolicy.serviceHealth.refetchInterval,
  });
}

export function useAlerts(status?: string) {
  return useQuery({
    queryKey: keys.alerts(status),
    queryFn: () =>
      apiGet<{ alerts: Alert[]; counts: { active: number; critical: number }; updatedAt: string }>(
        `/api/alerts${status ? `?status=${status}` : ""}`,
      ),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useEvents() {
  return useQuery({
    queryKey: keys.events,
    queryFn: () => apiGet<{ events: InfraEvent[]; updatedAt: string }>("/api/events"),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useActivity() {
  return useQuery({
    queryKey: keys.activity,
    queryFn: () => apiGet<{ activity: InfraEvent[]; updatedAt: string }>("/api/activity"),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: keys.integrations,
    queryFn: () => apiGet<{ integrations: Integration[]; updatedAt: string }>("/api/integrations"),
    staleTime: queryPolicy.external.staleTime,
    refetchInterval: queryPolicy.external.refetchInterval,
  });
}

export function useGithub() {
  return useQuery({
    queryKey: keys.github,
    queryFn: () =>
      apiGet<{
        status: string;
        repos: {
          fullName: string;
          openIssues: number | null;
          openPRs: number | null;
          latestRelease: string | null;
          error: string | null;
        }[];
        error: string | null;
        updatedAt: string;
      }>("/api/github/repos"),
    staleTime: queryPolicy.external.staleTime,
    refetchInterval: queryPolicy.external.refetchInterval,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: () =>
      apiGet<{ settings: Record<string, unknown>; updatedAt: string }>("/api/settings"),
    staleTime: 60_000,
  });
}

export async function triggerServiceCheck(): Promise<void> {
  await apiPost("/api/services/check", {});
}

export async function containerAction(
  id: string,
  action: "start" | "stop" | "restart",
): Promise<void> {
  const res = await fetch(`/api/docker/containers/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    headers: { "X-Confirm": "true" },
  });
  if (!res.ok) throw new Error(`action failed (${res.status})`);
}

export type { Alert, Container, Device, Host, InfraEvent, Service };
