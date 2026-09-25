import { z } from "zod";

// ── Shared status primitives ────────────────────────────────────────────────
// Data-honesty rule: every infrastructure value may be unknown/stale.
// Never fabricate metrics — represent absence explicitly.

export const HealthLevelSchema = z.enum(["healthy", "warning", "critical", "unknown"]);
export type HealthLevel = z.infer<typeof HealthLevelSchema>;

export const ConnectionStatusSchema = z.enum([
  "connected",
  "not_connected",
  "unavailable",
  "unknown",
  "stale",
  "offline",
]);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export const freshnessSchema = z.object({
  updatedAt: z.string(),
  staleAfterMs: z.number().default(30_000),
});
export type Freshness = z.infer<typeof freshnessSchema>;

// ── Host / server ───────────────────────────────────────────────────────────

export const HostSchema = z.object({
  id: z.string(),
  hostname: z.string(),
  ip: z.string().nullable(),
  os: z.string().nullable(),
  kernel: z.string().nullable(),
  online: z.boolean(),
  uptimeSeconds: z.number().nullable(),
  cpuPercent: z.number().nullable(),
  memPercent: z.number().nullable(),
  memUsedBytes: z.number().nullable(),
  memTotalBytes: z.number().nullable(),
  diskPercent: z.number().nullable(),
  diskUsedBytes: z.number().nullable(),
  diskTotalBytes: z.number().nullable(),
  loadAverage: z.tuple([z.number(), z.number(), z.number()]).nullable(),
  tempCelsius: z.number().nullable(),
  lastSeen: z.string(),
  source: z.enum(["local", "agent", "static"]),
});
export type Host = z.infer<typeof HostSchema>;

// ── Metrics point ───────────────────────────────────────────────────────────

export const MetricPointSchema = z.object({
  t: z.string(),
  cpu: z.number().nullable(),
  mem: z.number().nullable(),
  netDownBps: z.number().nullable(),
  netUpBps: z.number().nullable(),
  disk: z.number().nullable(),
});
export type MetricPoint = z.infer<typeof MetricPointSchema>;

// ── Docker ──────────────────────────────────────────────────────────────────

export const ContainerStateSchema = z.enum([
  "running",
  "exited",
  "paused",
  "restarting",
  "dead",
  "created",
  "removing",
  "unknown",
]);
export type ContainerState = z.infer<typeof ContainerStateSchema>;

export const ContainerSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  state: ContainerStateSchema,
  status: z.string().nullable(),
  health: z.enum(["healthy", "unhealthy", "starting", "none", "unknown"]).default("unknown"),
  uptimeSeconds: z.number().nullable(),
  cpuPercent: z.number().nullable(),
  memBytes: z.number().nullable(),
  memLimitBytes: z.number().nullable(),
  restartCount: z.number().default(0),
  ports: z.array(z.string()).default([]),
});
export type Container = z.infer<typeof ContainerSchema>;

export const DockerSummarySchema = z.object({
  status: ConnectionStatusSchema,
  running: z.number(),
  stopped: z.number(),
  unhealthy: z.number(),
  containers: z.array(ContainerSchema),
  error: z.string().nullable().default(null),
  updatedAt: z.string(),
});
export type DockerSummary = z.infer<typeof DockerSummarySchema>;

// ── Services ────────────────────────────────────────────────────────────────

export const ServiceStatusSchema = z.enum(["up", "down", "degraded", "unknown"]);
export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;

export const ServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().nullable(),
  status: ServiceStatusSchema,
  httpStatus: z.number().nullable(),
  responseTimeMs: z.number().nullable(),
  uptimePercent: z.number().nullable(),
  lastCheck: z.string().nullable(),
  error: z.string().nullable().default(null),
  enabled: z.boolean().default(true),
  /** Oldest→newest recent check outcomes (up to 8); empty when no history. */
  recentChecks: z.array(ServiceStatusSchema).default([]),
});
export type Service = z.infer<typeof ServiceSchema>;

// ── Devices / network ───────────────────────────────────────────────────────

export const DeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  ip: z.string(),
  mac: z.string().nullable(),
  type: z.string().default("unknown"),
  vendor: z.string().nullable(),
  online: z.boolean(),
  lastSeen: z.string(),
  latencyMs: z.number().nullable(),
  source: z.enum(["static", "tailscale", "discovery", "agent"]).default("static"),
});
export type Device = z.infer<typeof DeviceSchema>;

export const NetworkSummarySchema = z.object({
  status: ConnectionStatusSchema,
  downloadBps: z.number().nullable(),
  uploadBps: z.number().nullable(),
  latencyMs: z.number().nullable(),
  packetLossPercent: z.number().nullable(),
  wanIp: z.string().nullable(),
  updatedAt: z.string(),
});
export type NetworkSummary = z.infer<typeof NetworkSummarySchema>;

// ── Storage ─────────────────────────────────────────────────────────────────

export const StorageResourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  mount: z.string().nullable(),
  filesystem: z.string().nullable(),
  totalBytes: z.number().nullable(),
  usedBytes: z.number().nullable(),
  freeBytes: z.number().nullable(),
  percent: z.number().nullable(),
  health: HealthLevelSchema.default("unknown"),
  kind: z.enum(["disk", "partition", "s3", "nfs", "other"]).default("disk"),
});
export type StorageResource = z.infer<typeof StorageResourceSchema>;

// ── DNS (Pi-hole) ───────────────────────────────────────────────────────────

export const DnsSummarySchema = z.object({
  status: ConnectionStatusSchema,
  totalQueries: z.number().nullable(),
  blockedQueries: z.number().nullable(),
  blockPercent: z.number().nullable(),
  latencyMs: z.number().nullable(),
  topDomains: z.array(z.object({ domain: z.string(), count: z.number() })).default([]),
  topClients: z.array(z.object({ client: z.string(), count: z.number() })).default([]),
  error: z.string().nullable().default(null),
  updatedAt: z.string(),
});
export type DnsSummary = z.infer<typeof DnsSummarySchema>;

// ── Alerts / events ─────────────────────────────────────────────────────────

export const AlertSeveritySchema = z.enum(["info", "warning", "critical"]);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const AlertStatusSchema = z.enum(["active", "acknowledged", "resolved", "muted"]);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

export const AlertSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: AlertSeveritySchema,
  resource: z.string().nullable(),
  description: z.string().nullable(),
  value: z.string().nullable(),
  threshold: z.string().nullable(),
  status: AlertStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Alert = z.infer<typeof AlertSchema>;

export const InfraEventSchema = z.object({
  id: z.string(),
  ts: z.string(),
  category: z.string(),
  resource: z.string().nullable(),
  message: z.string(),
  severity: AlertSeveritySchema.default("info"),
});
export type InfraEvent = z.infer<typeof InfraEventSchema>;

// ── Integrations ────────────────────────────────────────────────────────────

export const IntegrationTypeSchema = z.enum([
  "docker",
  "pihole",
  "github",
  "linux_agent",
  "tailscale",
  "s3",
]);
export type IntegrationType = z.infer<typeof IntegrationTypeSchema>;

export const IntegrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: IntegrationTypeSchema,
  status: ConnectionStatusSchema,
  enabled: z.boolean().default(true),
  lastSync: z.string().nullable(),
  error: z.string().nullable().default(null),
  capabilities: z.array(z.string()).default([]),
});
export type Integration = z.infer<typeof IntegrationSchema>;

// ── Overview aggregate ──────────────────────────────────────────────────────

export const OverviewSchema = z.object({
  health: z.object({
    level: HealthLevelSchema,
    healthy: z.number(),
    warning: z.number(),
    critical: z.number(),
    total: z.number(),
  }),
  updatedAt: z.string(),
});
export type Overview = z.infer<typeof OverviewSchema>;

// ── GitHub repository monitor ──────────────────────────────────────────────

export const GithubRepoSchema = z.object({
  fullName: z.string(),
  description: z.string().nullable().default(null),
  stars: z.number().nullable().default(null),
  forks: z.number().nullable().default(null),
  watchers: z.number().nullable().default(null),
  /** Issues only — PRs are subtracted when the breakdown is known. */
  openIssues: z.number().nullable().default(null),
  openPRs: z.number().nullable().default(null),
  language: z.string().nullable().default(null),
  defaultBranch: z.string().nullable().default(null),
  lastPushAt: z.string().nullable().default(null),
  latestRelease: z.string().nullable().default(null),
  latestReleaseAt: z.string().nullable().default(null),
  /** Latest Actions run: success / failure / cancelled / in_progress / … — null when unknown. */
  workflowStatus: z.string().nullable().default(null),
  archived: z.boolean().default(false),
  private: z.boolean().default(false),
  url: z.string().default(""),
  updatedAt: z.string(),
  error: z.string().nullable().default(null),
});
export type GithubRepo = z.infer<typeof GithubRepoSchema>;

export const GithubSummarySchema = z.object({
  status: ConnectionStatusSchema,
  repos: z.array(GithubRepoSchema),
  error: z.string().nullable().default(null),
  updatedAt: z.string(),
});
export type GithubSummary = z.infer<typeof GithubSummarySchema>;

// ── Uptime monitor ─────────────────────────────────────────────────────────

export const UptimeWindowSchema = z.enum(["1h", "24h", "7d"]);
export type UptimeWindow = z.infer<typeof UptimeWindowSchema>;

export const UptimeBucketSchema = z.object({
  /** Bucket start (ISO). */
  t: z.string(),
  /** Worst status observed in the bucket; unknown when no checks landed. */
  status: ServiceStatusSchema,
  avgMs: z.number().nullable().default(null),
  count: z.number().default(0),
});
export type UptimeBucket = z.infer<typeof UptimeBucketSchema>;

export const UptimeIncidentSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  serviceName: z.string(),
  status: z.enum(["down", "degraded"]),
  startedAt: z.string(),
  /** Null while the incident is ongoing. */
  endedAt: z.string().nullable().default(null),
  /** Null while ongoing — the UI computes elapsed time live. */
  durationMs: z.number().nullable().default(null),
  ongoing: z.boolean().default(false),
});
export type UptimeIncident = z.infer<typeof UptimeIncidentSchema>;

export const ServiceUptimeSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().nullable(),
  status: ServiceStatusSchema,
  enabled: z.boolean().default(true),
  lastCheck: z.string().nullable().default(null),
  error: z.string().nullable().default(null),
  /** Uptime % per trailing window; null when the window has no samples. */
  uptime: z.object({
    "1h": z.number().nullable(),
    "24h": z.number().nullable(),
    "7d": z.number().nullable(),
  }),
  avgLatencyMs: z.number().nullable().default(null),
  /** Timeline buckets for the selected window (oldest→newest). */
  buckets: z.array(UptimeBucketSchema).default([]),
  incidentCount: z.number().default(0),
});
export type ServiceUptime = z.infer<typeof ServiceUptimeSchema>;

export const UptimeReportSchema = z.object({
  window: UptimeWindowSchema,
  services: z.array(ServiceUptimeSchema),
  /** Ongoing first, then newest; derived from real check transitions. */
  incidents: z.array(UptimeIncidentSchema).default([]),
  overallUptime: z.number().nullable().default(null),
  updatedAt: z.string(),
});
export type UptimeReport = z.infer<typeof UptimeReportSchema>;

// ── Live network topology (provider-agnostic Opsora domain) ─────────────────
// Normalized from real sources (agents, discovery, tailscale, docker).
// Absent metrics are null/unknown — never fabricated.

export const NetworkDeviceTypeSchema = z.enum([
  "server",
  "desktop",
  "laptop",
  "mobile",
  "router",
  "gateway",
  "container",
  "vm",
  "network",
  "unknown",
]);
export type NetworkDeviceType = z.infer<typeof NetworkDeviceTypeSchema>;

export const NetworkDeviceStatusSchema = z.enum(["online", "degraded", "offline", "unknown"]);
export type NetworkDeviceStatus = z.infer<typeof NetworkDeviceStatusSchema>;

export const NetworkDeviceSchema = z.object({
  id: z.string(),
  hostname: z.string(),
  displayName: z.string().nullable().default(null),
  type: NetworkDeviceTypeSchema.default("unknown"),
  status: NetworkDeviceStatusSchema.default("unknown"),
  ipAddresses: z.array(z.string()).default([]),
  primaryIp: z.string().nullable().default(null),
  os: z.string().nullable().default(null),
  platform: z.string().nullable().default(null),
  iface: z.string().nullable().default(null),
  lastSeen: z.string().nullable().default(null),
  latencyMs: z.number().nullable().default(null),
  packetLossPercent: z.number().nullable().default(null),
  cpuPercent: z.number().nullable().default(null),
  memoryPercent: z.number().nullable().default(null),
  diskPercent: z.number().nullable().default(null),
  source: z
    .enum(["local", "agent", "static", "tailscale", "discovery", "docker", "system"])
    .default("static"),
});
export type NetworkDevice = z.infer<typeof NetworkDeviceSchema>;

export const NetworkConnectionStatusSchema = z.enum(["active", "degraded", "inactive", "unknown"]);
export type NetworkConnectionStatus = z.infer<typeof NetworkConnectionStatusSchema>;

export const NetworkConnectionTypeSchema = z.enum(["p2p", "direct", "relay", "routed", "unknown"]);
export type NetworkConnectionType = z.infer<typeof NetworkConnectionTypeSchema>;

export const NetworkConnectionSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  status: NetworkConnectionStatusSchema.default("unknown"),
  type: NetworkConnectionTypeSchema.default("unknown"),
  latencyMs: z.number().nullable().default(null),
  packetLossPercent: z.number().nullable().default(null),
  bytesSent: z.number().nullable().default(null),
  bytesReceived: z.number().nullable().default(null),
  durationSecs: z.number().nullable().default(null),
  iface: z.string().nullable().default(null),
  localEndpoint: z.string().nullable().default(null),
  remoteEndpoint: z.string().nullable().default(null),
  lastActivity: z.string().nullable().default(null),
});
export type NetworkConnection = z.infer<typeof NetworkConnectionSchema>;

export const NetworkTopologySchema = z.object({
  devices: z.array(NetworkDeviceSchema).default([]),
  connections: z.array(NetworkConnectionSchema).default([]),
  updatedAt: z.string(),
});
export type NetworkTopology = z.infer<typeof NetworkTopologySchema>;

export const NetworkLiveEventTypeSchema = z.enum([
  "device.status",
  "connection.updated",
  "device.latency",
  "probe.completed",
]);
export type NetworkLiveEventType = z.infer<typeof NetworkLiveEventTypeSchema>;

export const NetworkLiveEventSchema = z.object({
  id: z.string(),
  type: NetworkLiveEventTypeSchema,
  deviceId: z.string().nullable().default(null),
  connectionId: z.string().nullable().default(null),
  status: z.string().nullable().default(null),
  latencyMs: z.number().nullable().default(null),
  connectionType: z.string().nullable().default(null),
  message: z.string(),
  severity: AlertSeveritySchema.default("info"),
  timestamp: z.string(),
});
export type NetworkLiveEvent = z.infer<typeof NetworkLiveEventSchema>;
