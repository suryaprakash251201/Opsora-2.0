import * as React from "react";
import { ArrowRight, Copy, Check, Send, X } from "lucide-react";
import { cn } from "../../../lib/cn";
import { Button } from "../../../components/ui/button";
import { StatusBadge } from "../../../components/ui/status";
import { useUi } from "../../../stores/ui";
import { pingHost } from "../api";
import type { NetworkConnection, NetworkDevice } from "../types";
import { DeviceGlyph } from "./TopologyCanvas";
import {
  CONNECTION_TYPE_LABEL,
  deviceDotClass,
  formatBytes,
  formatDuration,
  timeAgo,
} from "../utils";

function Shell({
  title,
  onClose,
  children,
  testId,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  testId: string;
}): React.JSX.Element {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <aside
      data-testid={testId}
      role="complementary"
      aria-label={title}
      className="absolute top-0 right-0 bottom-0 z-20 flex w-full flex-col border-l border-edge bg-panel/98 shadow-xl backdrop-blur sm:w-[340px] max-sm:top-auto max-sm:h-[62%] max-sm:border-t max-sm:border-l-0"
    >
      <div className="flex items-center justify-between border-b border-edge px-3.5 py-2.5">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="rounded p-1 text-ink-3 transition-colors hover:bg-hover hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3.5 py-3">{children}</div>
    </aside>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-xs">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-ink-3">
        {label}
      </span>
      <span className={cn("truncate text-right text-ink-2", mono && "font-mono num")}>{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="border-b border-edge/60 py-2.5 last:border-0" aria-label={title}>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

// ── Device inspector ────────────────────────────────────────────────────────

export function DeviceInspector({
  device,
  connections,
  peerNames,
  onClose,
  onSelectConnection,
}: {
  device: NetworkDevice;
  connections: NetworkConnection[];
  peerNames: Map<string, string>;
  onClose: () => void;
  onSelectConnection: (id: string) => void;
}): React.JSX.Element {
  const addToast = useUi((s) => s.addToast);
  const [pinging, setPinging] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const active = connections.filter((c) => c.status === "active").length;
  const label = device.displayName || device.hostname;

  async function handlePing(): Promise<void> {
    const target = device.primaryIp ?? device.ipAddresses[0] ?? device.hostname;
    setPinging(true);
    try {
      const res = await pingHost(target);
      addToast({
        type: res.ok ? "success" : "error",
        message: res.ok ? `Ping to ${res.host}: ${res.latencyMs} ms` : `Ping to ${res.host} failed`,
      });
    } catch {
      addToast({ type: "error", message: `Failed to probe ${target}` });
    } finally {
      setPinging(false);
    }
  }

  function copyIp(): void {
    const ip = device.primaryIp ?? device.ipAddresses[0];
    if (!ip) return;
    void navigator.clipboard.writeText(ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Shell title="Device details" onClose={onClose} testId="device-inspector">
      <div className="flex items-center gap-2.5 pb-1">
        <span className="grid size-9 place-items-center rounded-lg bg-void text-ink-2">
          <DeviceGlyph type={device.type} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{label}</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-3">
            <span
              className={cn("size-1.5 rounded-full", deviceDotClass(device.status))}
              aria-hidden
            />
            <span className="capitalize">{device.type}</span> ·{" "}
            <StatusBadge status={device.status} />
          </p>
        </div>
      </div>

      <Section title="Network">
        <Row label="IP" value={device.primaryIp ?? "—"} mono />
        {device.ipAddresses.length > 1 ? (
          <Row label="Aliases" value={device.ipAddresses.slice(1).join(", ")} mono />
        ) : null}
        <Row label="Hostname" value={device.hostname} mono />
        <Row label="Interface" value={device.iface ?? "—"} mono />
        <Row label="OS" value={device.os ?? "—"} />
        <Row
          label="Latency"
          value={device.latencyMs != null ? `${device.latencyMs} ms` : "—"}
          mono
        />
        <Row
          label="Packet loss"
          value={device.packetLossPercent != null ? `${device.packetLossPercent}%` : "—"}
          mono
        />
      </Section>

      {device.cpuPercent != null || device.memoryPercent != null || device.diskPercent != null ? (
        <Section title="System">
          <Row label="CPU" value={device.cpuPercent != null ? `${device.cpuPercent}%` : "—"} mono />
          <Row
            label="Memory"
            value={device.memoryPercent != null ? `${device.memoryPercent}%` : "—"}
            mono
          />
          <Row
            label="Disk"
            value={device.diskPercent != null ? `${device.diskPercent}%` : "—"}
            mono
          />
        </Section>
      ) : null}

      <Section title={`Connections · ${active} active`}>
        {connections.length === 0 ? (
          <p className="py-1 text-xs text-ink-3">No observed connections.</p>
        ) : (
          <ul className="grid gap-1">
            {connections.map((c) => {
              const peerId = c.sourceId === device.id ? c.targetId : c.sourceId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelectConnection(c.id)}
                    className="flex w-full items-center justify-between rounded-md border border-edge/60 bg-void/60 px-2 py-1.5 text-left text-xs transition-colors hover:border-accent/40"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <ArrowRight className="size-3 shrink-0 text-ink-3" aria-hidden />
                      <span className="truncate text-ink-2">{peerNames.get(peerId) ?? peerId}</span>
                    </span>
                    <span className="num shrink-0 font-mono text-[11px] text-ink-3">
                      {CONNECTION_TYPE_LABEL[c.type]}
                      {c.latencyMs != null ? ` · ${c.latencyMs} ms` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Last seen">
        <Row label="Seen" value={timeAgo(device.lastSeen)} />
        <Row label="Source" value={device.source} />
      </Section>

      <div className="flex gap-1.5 pt-3">
        <Button size="sm" onClick={() => void handlePing()} disabled={pinging} className="gap-1.5">
          <Send className="size-3.5" />
          {pinging ? "Pinging…" : "Ping"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={copyIp}
          disabled={!device.primaryIp && device.ipAddresses.length === 0}
          className="gap-1.5"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="size-3.5" />
          )}
          Copy IP
        </Button>
      </div>
    </Shell>
  );
}

// ── Connection inspector ────────────────────────────────────────────────────

export function ConnectionInspector({
  connection,
  source,
  target,
  onClose,
}: {
  connection: NetworkConnection;
  source?: NetworkDevice;
  target?: NetworkDevice;
  onClose: () => void;
}): React.JSX.Element {
  const sName = source?.displayName || source?.hostname || connection.sourceId;
  const tName = target?.displayName || target?.hostname || connection.targetId;
  return (
    <Shell title="Connection details" onClose={onClose} testId="connection-inspector">
      <div className="flex items-center gap-2 pb-1 text-sm font-semibold text-ink">
        <span className="truncate">{sName}</span>
        <ArrowRight className="size-4 shrink-0 text-ink-3" aria-hidden />
        <span className="truncate">{tName}</span>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-ink-3">
        <StatusBadge status={connection.status} />
        <span>·</span>
        <span>{CONNECTION_TYPE_LABEL[connection.type]}</span>
        {connection.type === "p2p" ? (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">· DIRECT</span>
        ) : null}
      </p>

      <Section title="Path quality">
        <Row
          label="Latency"
          value={connection.latencyMs != null ? `${connection.latencyMs} ms` : "—"}
          mono
        />
        <Row
          label="Packet loss"
          value={connection.packetLossPercent != null ? `${connection.packetLossPercent}%` : "—"}
          mono
        />
        <Row
          label="Traffic out"
          value={connection.bytesSent != null ? formatBytes(connection.bytesSent) : "—"}
          mono
        />
        <Row
          label="Traffic in"
          value={connection.bytesReceived != null ? formatBytes(connection.bytesReceived) : "—"}
          mono
        />
        <Row label="Duration" value={formatDuration(connection.durationSecs)} mono />
        <Row label="Last activity" value={timeAgo(connection.lastActivity)} />
      </Section>

      <Section title="Endpoints">
        <Row label="Interface" value={connection.iface ?? "—"} mono />
        <Row label="Local" value={connection.localEndpoint ?? "—"} mono />
        <Row label="Remote" value={connection.remoteEndpoint ?? "—"} mono />
      </Section>
    </Shell>
  );
}
