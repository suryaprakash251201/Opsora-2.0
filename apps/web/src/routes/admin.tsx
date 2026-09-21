import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSettings } from "../lib/queries";
import { keys } from "../lib/query";
import { apiPatch, apiGet } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { Input, Field } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";
import { useUi } from "../stores/ui";

export function SettingsPage(): React.JSX.Element {
  const { data, isLoading } = useSettings();
  const qc = useQueryClient();
  const [form, setForm] = React.useState<Record<string, string>>({});
  const [saved, setSaved] = React.useState(false);
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);

  React.useEffect(() => {
    if (data) {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.settings)) next[k] = String(v);
      setForm(next);
    }
  }, [data]);

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      const n = Number(v);
      payload[k] = v !== "" && Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(v) ? n : v;
    }
    await apiPatch("/api/settings", payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await qc.invalidateQueries({ queryKey: keys.settings });
  }

  if (isLoading)
    return (
      <div className="p-3 md:p-4">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">Settings</h1>
      <div className="grid gap-2.5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-2.5">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-ink-2">Theme</span>
              <div className="ml-auto flex gap-1">
                {(["dark", "light"] as const).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={theme === t ? "default" : "ghost"}
                    onClick={() => {
                      setTheme(t);
                      document.documentElement.classList.toggle("dark", t === "dark");
                    }}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <form onSubmit={(e) => void save(e)} className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="CPU warn %">
                  <Input
                    value={form.cpuWarn ?? ""}
                    onChange={(e) => setForm({ ...form, cpuWarn: e.target.value })}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="CPU crit %">
                  <Input
                    value={form.cpuCrit ?? ""}
                    onChange={(e) => setForm({ ...form, cpuCrit: e.target.value })}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Memory warn %">
                  <Input
                    value={form.memWarn ?? ""}
                    onChange={(e) => setForm({ ...form, memWarn: e.target.value })}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Memory crit %">
                  <Input
                    value={form.memCrit ?? ""}
                    onChange={(e) => setForm({ ...form, memCrit: e.target.value })}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Disk warn %">
                  <Input
                    value={form.diskWarn ?? ""}
                    onChange={(e) => setForm({ ...form, diskWarn: e.target.value })}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Disk crit %">
                  <Input
                    value={form.diskCrit ?? ""}
                    onChange={(e) => setForm({ ...form, diskCrit: e.target.value })}
                    inputMode="numeric"
                  />
                </Field>
              </div>
              <div>
                <Button type="submit">Save thresholds</Button>{" "}
                {saved ? <span className="ml-2 text-xs text-emerald-300">Saved</span> : null}
              </div>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Opsora self-health</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-2 text-[13px]">
            <SelfRow label="API" path="/api/health" />
            <SelfRow label="Database" path="/api/health" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function SelfRow({ label, path }: { label: string; path: string }): React.JSX.Element {
  const [status, setStatus] = React.useState("unknown");
  React.useEffect(() => {
    let live = true;
    apiGet<{ status: string }>(path)
      .then((r) => {
        if (live) setStatus(r.status === "ok" ? "connected" : "unknown");
      })
      .catch(() => {
        if (live) setStatus("unavailable");
      });
    return () => {
      live = false;
    };
  }, [path]);
  return (
    <div className="flex items-center gap-2">
      <span className="text-ink-2">{label}</span>
      <StatusBadge status={status} className="ml-auto" />
    </div>
  );
}

export function ApiPage(): React.JSX.Element {
  const endpoints = [
    "GET /api/health",
    "GET /api/health/overview",
    "GET /api/servers",
    "GET /api/metrics/history?range=1h",
    "GET /api/docker/containers",
    "GET /api/services",
    "GET /api/devices",
    "GET /api/network",
    "GET /api/storage",
    "GET /api/dns",
    "GET /api/alerts",
    "GET /api/events",
    "GET /api/events/stream (SSE)",
    "GET /api/integrations",
    "GET /api/github/repos",
    "GET /api/settings",
  ];
  return (
    <div className="grid gap-2.5 p-3 md:p-4">
      <h1 className="text-base font-semibold tracking-tight">API</h1>
      <Card>
        <CardHeader>
          <CardTitle>Resource endpoints</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="grid gap-1 font-mono text-xs text-ink-2">
            {endpoints.map((e) => (
              <li key={e} className="rounded border border-edge/60 bg-void px-2 py-1.5">
                {e}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

export function NotFoundPage(): React.JSX.Element {
  return (
    <div className="p-8 text-center">
      <p className="text-lg font-semibold">Not found</p>
      <p className="mt-1 text-sm text-ink-2">This view does not exist.</p>
      <Button
        variant="secondary"
        size="sm"
        className="mt-4"
        onClick={() => {
          window.location.pathname = "/";
        }}
      >
        Back home
      </Button>
    </div>
  );
}
