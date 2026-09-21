CREATE TABLE IF NOT EXISTS `integrations` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `enabled` integer DEFAULT true NOT NULL,
  `config_json` text DEFAULT '{}' NOT NULL,
  `status` text DEFAULT 'unknown' NOT NULL,
  `last_sync` text,
  `last_error` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hosts` (
  `id` text PRIMARY KEY NOT NULL,
  `hostname` text NOT NULL,
  `ip` text,
  `os` text,
  `source` text DEFAULT 'static' NOT NULL,
  `last_seen` text NOT NULL,
  `meta_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `devices` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `ip` text NOT NULL,
  `mac` text,
  `type` text DEFAULT 'unknown' NOT NULL,
  `vendor` text,
  `online` integer DEFAULT false NOT NULL,
  `last_seen` text NOT NULL,
  `source` text DEFAULT 'static' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `services` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `url` text,
  `expected_status` integer DEFAULT 200 NOT NULL,
  `check_interval_ms` integer DEFAULT 30000 NOT NULL,
  `enabled` integer DEFAULT true NOT NULL,
  `last_status` text DEFAULT 'unknown' NOT NULL,
  `last_http_status` integer,
  `last_latency_ms` integer,
  `last_check` text,
  `last_error` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `alerts` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `severity` text DEFAULT 'info' NOT NULL,
  `resource` text,
  `description` text,
  `value` text,
  `threshold` text,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `events` (
  `id` text PRIMARY KEY NOT NULL,
  `ts` text NOT NULL,
  `category` text NOT NULL,
  `resource` text,
  `message` text NOT NULL,
  `severity` text DEFAULT 'info' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settings` (
  `key` text PRIMARY KEY NOT NULL,
  `value_json` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `ts` text NOT NULL,
  `actor` text DEFAULT 'system' NOT NULL,
  `action` text NOT NULL,
  `target` text,
  `detail_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `metric_snapshots` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ts` text NOT NULL,
  `cpu` real,
  `mem` real,
  `net_down_bps` real,
  `net_up_bps` real
);
