const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: string; message?: string };
      detail = j.message ?? j.error ?? "";
    } catch {
      detail = res.statusText;
    }
    throw new Error(detail || `request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return handle<T>(res);
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  return apiGet<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers,
  });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiGet<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) });
}

export async function apiDelete<T>(path: string, confirm = false): Promise<T> {
  return apiGet<T>(path, { method: "DELETE", headers: confirm ? { "X-Confirm": "true" } : {} });
}

export function sseUrl(path: string): string {
  return `${BASE}${path}`;
}
