import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { useNavigate } from "react-router";
import * as React from "react";
import { useAlerts, useDevices, useDocker, useServers, useServices } from "../../lib/queries";
import { useUi } from "../../stores/ui";
import { Input } from "../ui/input";

interface Hit {
  group: string;
  label: string;
  hint?: string;
  to: string;
}

export function SearchDialog(): React.JSX.Element {
  const open = useUi((s) => s.searchOpen);
  const setOpen = useUi((s) => s.setSearchOpen);
  const [q, setQ] = React.useState("");
  const nav = useNavigate();
  const { data: servers } = useServers();
  const { data: docker } = useDocker();
  const { data: services } = useServices(false);
  const { data: devices } = useDevices("", "all");
  const { data: alerts } = useAlerts("active");

  React.useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const needle = q.trim().toLowerCase();
  const hits: Hit[] = [];
  if (needle) {
    for (const s of servers?.servers ?? []) {
      if (s.hostname.toLowerCase().includes(needle))
        hits.push({ group: "Servers", label: s.hostname, hint: s.os ?? undefined, to: "/servers" });
    }
    for (const c of docker?.containers ?? []) {
      if (c.name.toLowerCase().includes(needle) || c.image.toLowerCase().includes(needle))
        hits.push({ group: "Containers", label: c.name, hint: c.image, to: "/docker" });
    }
    for (const s of services?.services ?? []) {
      if (s.name.toLowerCase().includes(needle))
        hits.push({ group: "Services", label: s.name, hint: s.url ?? undefined, to: "/services" });
    }
    for (const d of devices?.devices ?? []) {
      if (d.name.toLowerCase().includes(needle) || d.ip.includes(needle))
        hits.push({ group: "Devices", label: d.name, hint: d.ip, to: "/devices" });
    }
    for (const a of alerts?.alerts ?? []) {
      if (a.title.toLowerCase().includes(needle))
        hits.push({ group: "Alerts", label: a.title, hint: a.severity, to: "/alerts" });
    }
  }

  const grouped = new Map<string, Hit[]>();
  for (const h of hits.slice(0, 30)) {
    const arr = grouped.get(h.group) ?? [];
    arr.push(h);
    grouped.set(h.group, arr);
  }

  return (
    <BaseDialog.Root open={open} onOpenChange={(v) => setOpen(v)}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/70" />
        <BaseDialog.Popup className="fixed left-1/2 top-[12vh] z-50 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-edge bg-panel shadow-2xl">
          <div className="border-b border-edge p-2">
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search servers, containers, services, devices, alerts…"
              aria-label="Global search"
            />
          </div>
          <div
            className="max-h-[50vh] overflow-y-auto p-2"
            role="listbox"
            aria-label="Search results"
          >
            {needle.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-ink-3">
                Type to search across infrastructure.
              </p>
            ) : hits.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-ink-3">No results for “{q}”.</p>
            ) : (
              [...grouped.entries()].map(([group, items]) => (
                <div key={group} className="mb-1">
                  <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                    {group}
                  </p>
                  {items.map((h, i) => (
                    <button
                      key={group + i}
                      role="option"
                      aria-selected="false"
                      onClick={() => {
                        setOpen(false);
                        nav(h.to);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-hover"
                    >
                      <span className="truncate text-ink">{h.label}</span>
                      {h.hint ? (
                        <span className="ml-auto truncate text-xs text-ink-3">{h.hint}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
