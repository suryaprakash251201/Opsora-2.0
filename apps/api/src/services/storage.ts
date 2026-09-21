import type { StorageResource } from "@opsora/types";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Real local disk/partition data via `df`. Unknown fields stay null. */
export async function getLocalStorage(): Promise<StorageResource[]> {
  try {
    const { stdout } = await execFileAsync("df", [
      "-k",
      "-x",
      "tmpfs",
      "-x",
      "devtmpfs",
      "-x",
      "overlay",
    ]);
    const lines = stdout.trim().split("\n").slice(1);
    return lines.map((line, i) => {
      const parts = line.trim().split(/\s+/);
      // Filesystem 1K-blocks Used Available Use% Mounted on
      const total = Number(parts[1]) * 1024;
      const used = Number(parts[2]) * 1024;
      const free = Number(parts[3]) * 1024;
      const pct = Number(String(parts[4] ?? "").replace("%", ""));
      const mount = parts.slice(5).join(" ") || "/";
      return {
        id: `disk-${i}-${mount}`,
        label: parts[0] ?? mount,
        mount,
        filesystem: null,
        totalBytes: Number.isFinite(total) ? total : null,
        usedBytes: Number.isFinite(used) ? used : null,
        freeBytes: Number.isFinite(free) ? free : null,
        percent: Number.isFinite(pct) ? pct : null,
        health: Number.isFinite(pct)
          ? pct >= 90
            ? "critical"
            : pct >= 80
              ? "warning"
              : "healthy"
          : "unknown",
        kind: "disk" as const,
      };
    });
  } catch {
    return [];
  }
}
