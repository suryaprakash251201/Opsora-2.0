/** Byte formatting — single source of truth for storage/memory display. */
export function formatBytes(bytes: number | null | undefined, decimals = 1): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(decimals)} ${sizes[i]}`;
}

export function formatBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || Number.isNaN(bps)) return "—";
  if (bps === 0) return "0 b/s";
  const k = 1000;
  const sizes = ["b/s", "Kb/s", "Mb/s", "Gb/s"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(Math.abs(bps)) / Math.log(k)));
  return `${(bps / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatPercent(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${v.toFixed(digits)}%`;
}

export function formatUptime(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined) return "—";
  const s = Math.floor(totalSeconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Returns true when a timestamp is older than staleAfterMs. */
export function isStale(updatedAt: string, staleAfterMs = 30_000, now = Date.now()): boolean {
  const t = new Date(updatedAt).getTime();
  if (Number.isNaN(t)) return true;
  return now - t > staleAfterMs;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "unknown";
  const diff = Math.max(0, now - t);
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
