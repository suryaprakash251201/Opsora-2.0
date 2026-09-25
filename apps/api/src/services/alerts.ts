import type { Alert, HealthLevel } from "@opsora/types";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";
import { alerts } from "../db/schema.js";
import { bus } from "../realtime/bus.js";
import { notifyAlert } from "./notifier.js";

export interface Thresholds {
  cpuWarn: number;
  cpuCrit: number;
  memWarn: number;
  memCrit: number;
  diskWarn: number;
  diskCrit: number;
}

export const defaultThresholds: Thresholds = {
  cpuWarn: 80,
  cpuCrit: 95,
  memWarn: 85,
  memCrit: 95,
  diskWarn: 80,
  diskCrit: 90,
};

function levelFor(value: number | null, warn: number, crit: number): HealthLevel {
  if (value === null || Number.isNaN(value)) return "unknown";
  if (value >= crit) return "critical";
  if (value >= warn) return "warning";
  return "healthy";
}

export function overallHealth(parts: HealthLevel[]): {
  level: HealthLevel;
  healthy: number;
  warning: number;
  critical: number;
  total: number;
} {
  let healthy = 0;
  let warning = 0;
  let critical = 0;
  for (const p of parts) {
    if (p === "healthy") healthy++;
    else if (p === "warning") warning++;
    else if (p === "critical") critical++;
  }
  const total = parts.filter((p) => p !== "unknown").length;
  const level: HealthLevel = critical > 0 ? "critical" : warning > 0 ? "warning" : "healthy";
  return { level, healthy, warning, critical, total };
}

export function evaluateHostThresholds(
  host: {
    cpuPercent: number | null;
    memPercent: number | null;
    diskPercent: number | null;
    hostname: string;
  },
  t: Thresholds = defaultThresholds,
): HealthLevel[] {
  return [
    levelFor(host.cpuPercent, t.cpuWarn, t.cpuCrit),
    levelFor(host.memPercent, t.memWarn, t.memCrit),
    levelFor(host.diskPercent, t.diskWarn, t.diskCrit),
  ];
}

/** Create an alert if the same active alert does not already exist (dedup). */
export function raiseAlert(input: {
  title: string;
  severity: Alert["severity"];
  resource?: string | null;
  description?: string | null;
  value?: string | null;
  threshold?: string | null;
}): Alert {
  const db = getDb();
  const existing = db
    .select()
    .from(alerts)
    .all()
    .find(
      (a) =>
        a.title === input.title && a.resource === (input.resource ?? null) && a.status === "active",
    );
  const now = new Date().toISOString();
  if (existing) {
    return {
      id: existing.id,
      title: existing.title,
      severity: existing.severity as Alert["severity"],
      resource: existing.resource,
      description: existing.description,
      value: existing.value,
      threshold: existing.threshold,
      status: existing.status as Alert["status"],
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    };
  }
  const alert: Alert = {
    id: randomUUID(),
    title: input.title,
    severity: input.severity,
    resource: input.resource ?? null,
    description: input.description ?? null,
    value: input.value ?? null,
    threshold: input.threshold ?? null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  db.insert(alerts).values(alert).run();
  bus.publish({
    category: "alert",
    resource: alert.resource,
    message: alert.title,
    severity: alert.severity,
  });
  // Best-effort outbound delivery; never blocks alert creation.
  notifyAlert({
    title: alert.title,
    severity: alert.severity,
    resource: alert.resource,
    detail: alert.description,
  });
  return alert;
}

export function listAlerts(status?: string): Alert[] {
  const db = getDb();
  const rows = db.select().from(alerts).orderBy(desc(alerts.createdAt)).all();
  return rows
    .filter((r) => !status || r.status === status)
    .map((r) => ({
      id: r.id,
      title: r.title,
      severity: r.severity as Alert["severity"],
      resource: r.resource,
      description: r.description,
      value: r.value,
      threshold: r.threshold,
      status: r.status as Alert["status"],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
}

export function setAlertStatus(id: string, status: Alert["status"]): boolean {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.select().from(alerts).where(eq(alerts.id, id)).get();
  if (!existing) return false;
  db.update(alerts).set({ status, updatedAt: now }).where(eq(alerts.id, id)).run();
  return true;
}

export function setBulkAlertStatus(ids: string[] | undefined, status: Alert["status"]): number {
  const db = getDb();
  const now = new Date().toISOString();
  if (ids && ids.length > 0) {
    let count = 0;
    for (const id of ids) {
      const res = db.update(alerts).set({ status, updatedAt: now }).where(eq(alerts.id, id)).run();
      if (res.changes > 0) count += res.changes;
    }
    return count;
  }
  const res = db.update(alerts).set({ status, updatedAt: now }).where(eq(alerts.status, "active")).run();
  return res.changes;
}

