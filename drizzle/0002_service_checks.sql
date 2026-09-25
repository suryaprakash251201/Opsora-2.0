CREATE TABLE IF NOT EXISTS `service_checks` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `service_id` text NOT NULL,
  `ts` text NOT NULL,
  `status` text NOT NULL,
  `latency_ms` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `service_checks_service_ts_idx` ON `service_checks` (`service_id`, `ts`);
