import { z } from "zod";

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const alertActionSchema = z.object({
  action: z.enum(["acknowledge", "resolve", "mute"]),
});

export const integrationCreateSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["docker", "pihole", "github", "linux_agent", "tailscale", "s3"]),
  enabled: z.boolean().default(true),
  // Never accept secrets blindly — server redacts before returning.
  config: z.record(z.string(), z.unknown()).default({}),
});

export const serviceUpdateSchema = z.object({
  enabled: z.boolean(),
});

export const serviceCreateSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().url().nullable().default(null),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  checkIntervalMs: z.number().int().min(5_000).max(600_000).default(30_000),
  enabled: z.boolean().default(true),
});

export const agentReportSchema = z.object({
  hostname: z.string().min(1),
  os: z.string().nullable().default(null),
  kernel: z.string().nullable().default(null),
  ip: z.string().nullable().default(null),
  cpuPercent: z.number().min(0).max(100).nullable().default(null),
  memPercent: z.number().min(0).max(100).nullable().default(null),
  memUsedBytes: z.number().nullable().default(null),
  memTotalBytes: z.number().nullable().default(null),
  diskPercent: z.number().min(0).max(100).nullable().default(null),
  diskUsedBytes: z.number().nullable().default(null),
  diskTotalBytes: z.number().nullable().default(null),
  loadAverage: z.tuple([z.number(), z.number(), z.number()]).nullable().default(null),
  tempCelsius: z.number().nullable().default(null),
  uptimeSeconds: z.number().nullable().default(null),
});

export const settingsUpdateSchema = z.object({
  theme: z.enum(["dark", "light", "system"]).optional(),
  timezone: z.string().optional(),
  refreshIntervalMs: z.number().int().min(2_000).max(300_000).optional(),
  cpuWarn: z.number().min(1).max(100).optional(),
  cpuCrit: z.number().min(1).max(100).optional(),
  memWarn: z.number().min(1).max(100).optional(),
  memCrit: z.number().min(1).max(100).optional(),
  diskWarn: z.number().min(1).max(100).optional(),
  diskCrit: z.number().min(1).max(100).optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;
