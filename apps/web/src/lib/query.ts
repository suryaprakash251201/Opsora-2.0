import { QueryClient } from "@tanstack/react-query";
import { queryPolicy } from "@opsora/config";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: queryPolicy.serviceHealth.staleTime,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export const keys = {
  overview: ["overview"] as const,
  servers: ["servers"] as const,
  metricsCurrent: ["metrics", "current"] as const,
  metricsHistory: (range: string) => ["metrics", "history", range] as const,
  docker: ["docker"] as const,
  services: ["services"] as const,
  devices: (q?: string, status?: string) => ["devices", q ?? "", status ?? "all"] as const,
  network: ["network"] as const,
  storage: ["storage"] as const,
  dns: ["dns"] as const,
  alerts: (status?: string) => ["alerts", status ?? "all"] as const,
  events: ["events"] as const,
  activity: ["activity"] as const,
  integrations: ["integrations"] as const,
  github: ["github"] as const,
  settings: ["settings"] as const,
  logs: ["logs"] as const,
};
