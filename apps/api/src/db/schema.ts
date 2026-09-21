import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Application state only — never plaintext secrets ( §9 ).
// Secrets live in env / OS keyring, referenced here by name.

export const integrations = sqliteTable("integrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  configJson: text("config_json").notNull().default("{}"),
  status: text("status").notNull().default("unknown"),
  lastSync: text("last_sync"),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const hosts = sqliteTable("hosts", {
  id: text("id").primaryKey(),
  hostname: text("hostname").notNull(),
  ip: text("ip"),
  os: text("os"),
  source: text("source").notNull().default("static"),
  lastSeen: text("last_seen").notNull(),
  metaJson: text("meta_json").notNull().default("{}"),
});

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ip: text("ip").notNull(),
  mac: text("mac"),
  type: text("type").notNull().default("unknown"),
  vendor: text("vendor"),
  online: integer("online", { mode: "boolean" }).notNull().default(false),
  lastSeen: text("last_seen").notNull(),
  source: text("source").notNull().default("static"),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url"),
  expectedStatus: integer("expected_status").notNull().default(200),
  checkIntervalMs: integer("check_interval_ms").notNull().default(30_000),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastStatus: text("last_status").notNull().default("unknown"),
  lastHttpStatus: integer("last_http_status"),
  lastLatencyMs: integer("last_latency_ms"),
  lastCheck: text("last_check"),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  severity: text("severity").notNull().default("info"),
  resource: text("resource"),
  description: text("description"),
  value: text("value"),
  threshold: text("threshold"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  ts: text("ts").notNull(),
  category: text("category").notNull(),
  resource: text("resource"),
  message: text("message").notNull(),
  severity: text("severity").notNull().default("info"),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  ts: text("ts").notNull(),
  actor: text("actor").notNull().default("system"),
  action: text("action").notNull(),
  target: text("target"),
  detailJson: text("detail_json").notNull().default("{}"),
});

export const metricSnapshots = sqliteTable("metric_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ts: text("ts").notNull(),
  cpu: real("cpu"),
  mem: real("mem"),
  netDownBps: real("net_down_bps"),
  netUpBps: real("net_up_bps"),
});
