import * as React from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSettings } from "../lib/queries";
import { keys } from "../lib/query";
import { apiPatch, apiGet } from "../lib/api";
import { Check, Compass, Moon, Sun } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/card";
import { Input, Field } from "../components/ui/input";
import { PageHeader } from "../components/ui/page-header";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status";
import { accents, useUi } from "../stores/ui";

export function SettingsPage(): React.JSX.Element {
  const { data, isLoading } = useSettings();
  const qc = useQueryClient();
  const [form, setForm] = React.useState<Record<string, string>>({});
  const [saved, setSaved] = React.useState(false);
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const accent = useUi((s) => s.accent);
  const setAccent = useUi((s) => s.setAccent);
  const density = useUi((s) => s.density);
  const setDensity = useUi((s) => s.setDensity);

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
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="Settings"
          description="Appearance, alert thresholds, and Opsora self-health."
        />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="Settings"
        description="Appearance, alert thresholds, and Opsora self-health."
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-3">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-ink-2">Theme</span>
              <div className="ml-auto flex gap-1 rounded-xl border border-edge bg-void p-1">
                {(
                  [
                    { value: "dark", label: "Dark", Icon: Moon },
                    { value: "light", label: "Light", Icon: Sun },
                  ] as const
                ).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    aria-pressed={theme === value}
                    className={
                      theme === value
                        ? "flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-[13px] font-medium text-accent-strong"
                        : "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
                    }
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-ink-2">Accent color</span>
              <div className="ml-auto flex gap-1.5" role="radiogroup" aria-label="Accent color">
                {accents.map((a) => (
                  <button
                    key={a.name}
                    type="button"
                    role="radio"
                    aria-checked={accent === a.name}
                    title={a.label}
                    aria-label={`${a.label} accent`}
                    onClick={() => setAccent(a.name)}
                    className={
                      accent === a.name
                        ? "grid size-7 place-items-center rounded-full border-2 border-ink"
                        : "grid size-7 place-items-center rounded-full border-2 border-transparent hover:scale-105"
                    }
                    style={{ background: a.swatch }}
                  >
                    {accent === a.name ? (
                      <Check className="size-3.5 text-black/70" aria-hidden />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-ink-2">
                Density
                <span className="ml-1.5 text-[11px] text-ink-3">table rows & cards</span>
              </span>
              <div className="ml-auto flex gap-1 rounded-xl border border-edge bg-void p-1">
                {(
                  [
                    ["comfortable", "Comfortable"],
                    ["compact", "Compact"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDensity(value)}
                    aria-pressed={density === value}
                    className={
                      density === value
                        ? "rounded-lg bg-accent/15 px-3 py-1.5 text-[13px] font-medium text-accent-strong"
                        : "rounded-lg px-3 py-1.5 text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              Alert thresholds (%)
            </p>
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
                {saved ? (
                  <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-300">Saved</span>
                ) : null}
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
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader title="API" description="HTTP endpoints exposed by the Opsora API." />
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
    <div className="flex min-h-[70vh] items-center justify-center p-4 md:p-8">
      <div className="flex w-full max-w-lg flex-col items-center justify-center gap-5 rounded-3xl border border-edge/80 bg-panel/80 px-6 py-14 text-center shadow-xl">
        <span className="grid size-16 place-items-center rounded-2xl border border-edge/80 bg-surface-muted text-ink-3 shadow-sm">
          <Compass className="size-7" aria-hidden />
        </span>
        <div>
          <p className="num text-4xl font-bold tracking-tight text-accent-strong">404</p>
          <p className="mt-1 text-sm font-semibold text-ink">This page doesn’t exist</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-2">
            The route you followed isn’t part of Opsora. Check the address, or jump back to the
            dashboard.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/"
            className="inline-flex h-8 items-center rounded-md border border-accent/25 bg-accent/15 px-3 text-[13px] font-medium text-accent-strong transition-all duration-150 hover:bg-accent/25 active:scale-[0.97]"
          >
            Back home
          </Link>
          <Button variant="ghost" onClick={() => window.history.back()}>
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}
