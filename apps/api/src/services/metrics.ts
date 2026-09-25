import type { Host, MetricPoint } from "@opsora/types";
import { lt } from "drizzle-orm";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { promisify } from "node:util";
import { getDb } from "../db/client.js";
import { metricSnapshots } from "../db/schema.js";

const execFileAsync = promisify(execFile);

// Ring buffer for chart history (in-memory; persisted snapshots optional).
const HISTORY_MAX = 240;
const history: MetricPoint[] = [];

let prevCpu: { idle: number; total: number } | null = null;
let prevNet: { rx: number; tx: number; at: number } | null = null;

function readCpuTimes(): { idle: number; total: number } {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const c of cpus) {
    idle += c.times.idle;
    total += c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq;
  }
  return { idle, total };
}

function cpuPercent(): number | null {
  try {
    const cur = readCpuTimes();
    if (!prevCpu) {
      prevCpu = cur;
      return null;
    }
    const idleDiff = cur.idle - prevCpu.idle;
    const totalDiff = cur.total - prevCpu.total;
    prevCpu = cur;
    if (totalDiff <= 0) return null;
    return Math.min(100, Math.max(0, (1 - idleDiff / totalDiff) * 100));
  } catch {
    return null;
  }
}

function readNetTotals(): { rx: number; tx: number } | null {
  try {
    const text = fs.readFileSync("/proc/net/dev", "utf8");
    let rx = 0;
    let tx = 0;
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*(eth\d+|en\w+|wl\w+|tailscale\d*|ts\d*):\s*(.+)$/);
      if (!m?.[2]) continue;
      const parts = m[2].trim().split(/\s+/).map(Number);
      if (parts.length >= 9 && parts[0] !== undefined && parts[8] !== undefined) {
        rx += parts[0];
        tx += parts[8];
      }
    }
    return { rx, tx };
  } catch {
    return null;
  }
}

function netRates(): { downBps: number | null; upBps: number | null } {
  const cur = readNetTotals();
  const now = Date.now();
  if (!cur) return { downBps: null, upBps: null };
  if (!prevNet) {
    prevNet = { ...cur, at: now };
    return { downBps: null, upBps: null };
  }
  const dt = (now - prevNet.at) / 1000;
  if (dt <= 0) return { downBps: null, upBps: null };
  const down = ((cur.rx - prevNet.rx) * 8) / dt;
  const up = ((cur.tx - prevNet.tx) * 8) / dt;
  prevNet = { ...cur, at: now };
  return {
    downBps: down >= 0 && down < 1e12 ? down : null,
    upBps: up >= 0 && up < 1e12 ? up : null,
  };
}

async function diskUsage(): Promise<{
  used: number | null;
  total: number | null;
  pct: number | null;
}> {
  try {
    const { stdout } = await execFileAsync("df", ["-k", "/"]);
    const line = stdout.trim().split("\n")[1];
    const parts = line?.trim().split(/\s+/) ?? [];
    // Filesystem 1K-blocks Used Available Use% Mounted
    const total = Number(parts[1]) * 1024;
    const used = Number(parts[2]) * 1024;
    const pct = Number(String(parts[4] ?? "").replace("%", ""));
    if (!Number.isFinite(total) || !Number.isFinite(used))
      return { used: null, total: null, pct: null };
    return { used, total, pct: Number.isFinite(pct) ? pct : null };
  } catch {
    return { used: null, total: null, pct: null };
  }
}

async function readTemp(): Promise<number | null> {
  try {
    const raw = fs.readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf8").trim();
    const v = Number(raw);
    if (Number.isFinite(v)) return v > 1000 ? v / 1000 : v;
  } catch {
    /* not available on all hosts */
  }
  return null;
}

function loadAvg(): [number, number, number] | null {
  try {
    const [a, b, c] = os.loadavg();
    if (a === undefined || b === undefined || c === undefined) return null;
    return [a, b, c];
  } catch {
    return null;
  }
}

/** Real host metrics for the machine running the API ( §14 local-agent ). */
export async function sampleHost(): Promise<Host> {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const disk = await diskUsage();
  const rates = netRates();
  void rates;
  return {
    id: "local",
    hostname: os.hostname(),
    ip: null,
    os: `${os.type()} ${os.release()}`,
    kernel: os.release(),
    online: true,
    uptimeSeconds: Math.floor(os.uptime()),
    cpuPercent: cpuPercent(),
    memPercent: totalMem > 0 ? (usedMem / totalMem) * 100 : null,
    memUsedBytes: usedMem,
    memTotalBytes: totalMem,
    diskPercent: disk.pct,
    diskUsedBytes: disk.used,
    diskTotalBytes: disk.total,
    loadAverage: loadAvg(),
    tempCelsius: await readTemp(),
    lastSeen: new Date().toISOString(),
    source: "local",
  };
}

const PERSIST_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Best-effort persistence so charts survive API restarts.
 * Never throws — the in-memory ring stays the source of truth.
 */
function persistPoint(point: MetricPoint): void {
  try {
    const db = getDb();
    db.insert(metricSnapshots)
      .values({
        ts: point.t,
        cpu: point.cpu,
        mem: point.mem,
        netDownBps: point.netDownBps,
        netUpBps: point.netUpBps,
      })
      .run();
    const cutoff = new Date(Date.now() - PERSIST_RETENTION_MS).toISOString();
    db.delete(metricSnapshots).where(lt(metricSnapshots.ts, cutoff)).run();
  } catch {
    /* persistence unavailable — memory ring still serves */
  }
}

function loadPersisted(sinceMs: number): MetricPoint[] {
  try {
    const db = getDb();
    const rows = db.select().from(metricSnapshots).all();
    return rows
      .filter((r) => new Date(r.ts).getTime() >= sinceMs)
      .map((r) => ({
        t: r.ts,
        cpu: r.cpu,
        mem: r.mem,
        netDownBps: r.netDownBps,
        netUpBps: r.netUpBps,
        // NOTE: metric_snapshots predates the disk field — persisted
        // points honestly report disk as unknown instead of inventing it.
        disk: null as number | null,
      }));
  } catch {
    return [];
  }
}

/** Append a point to the in-memory history ring (called by the sampler loop). */
export async function sampleAndStore(): Promise<MetricPoint> {
  const host = await sampleHost();
  const rates = netRates();
  const point: MetricPoint = {
    t: new Date().toISOString(),
    cpu: host.cpuPercent,
    mem: host.memPercent,
    netDownBps: rates.downBps,
    netUpBps: rates.upBps,
    disk: host.diskPercent,
  };
  history.push(point);
  if (history.length > HISTORY_MAX) history.splice(0, history.length - HISTORY_MAX);
  persistPoint(point);
  return point;
}

export function getHistory(range: string): MetricPoint[] {
  const minutes =
    range === "15m" ? 15 : range === "1h" ? 60 : range === "6h" ? 360 : range === "24h" ? 1440 : 60;
  const since = Date.now() - minutes * 60_000;
  // Merge persisted snapshots with the live ring; live points win on ties.
  const byTime = new Map<string, MetricPoint>();
  for (const p of loadPersisted(since)) byTime.set(p.t, p);
  for (const p of history) {
    if (new Date(p.t).getTime() >= since) byTime.set(p.t, p);
  }
  return [...byTime.values()].sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
}

export function latestPoint(): MetricPoint | null {
  const last = history[history.length - 1];
  return last ?? null;
}
