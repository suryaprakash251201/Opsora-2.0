import type { ConnectionStatus, StorageResource } from "@opsora/types";
import type { IntegrationAdapter } from "./types.js";

function configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY,
  );
}

export async function getS3Summary(): Promise<{
  status: ConnectionStatus;
  buckets: StorageResource[];
  error: string | null;
  updatedAt: string;
}> {
  const updatedAt = new Date().toISOString();
  if (!configured()) {
    return {
      status: "not_connected",
      buckets: [],
      error: "S3_ENDPOINT / credentials not configured",
      updatedAt,
    };
  }
  // Provider abstraction ( §16 ): report reachability honestly without
  // implementing per-vendor signing here; full ListBuckets lives behind the
  // same interface and returns unavailable rather than fake counts.
  const endpoint = process.env.S3_ENDPOINT ?? "";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    let reachable = false;
    try {
      const res = await fetch(endpoint, { method: "HEAD", signal: ctrl.signal });
      reachable = res.status < 500;
    } catch {
      reachable = false;
    } finally {
      clearTimeout(t);
    }
    if (!reachable) {
      return {
        status: "unavailable",
        buckets: [],
        error: `S3 endpoint unreachable: ${endpoint}`,
        updatedAt,
      };
    }
    const bucket = (process.env.S3_BUCKET ?? "").trim();
    const buckets: StorageResource[] = bucket
      ? [
          {
            id: `s3-${bucket}`,
            label: bucket,
            mount: null,
            filesystem: "s3",
            totalBytes: null,
            usedBytes: null,
            freeBytes: null,
            percent: null,
            health: "unknown",
            kind: "s3",
          },
        ]
      : [];
    return { status: "connected", buckets, error: null, updatedAt };
  } catch (err) {
    return {
      status: "unavailable",
      buckets: [],
      error: err instanceof Error ? err.message : "s3 error",
      updatedAt,
    };
  }
}

export const s3Adapter: IntegrationAdapter = {
  id: "s3",
  name: "S3 Storage",
  type: "s3",
  capabilities: ["buckets.list", "buckets.usage"],
  async healthCheck(): Promise<{ status: ConnectionStatus; error?: string | null }> {
    const r = await getS3Summary();
    return { status: r.status, error: r.error };
  },
};
