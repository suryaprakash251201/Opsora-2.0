import * as React from "react";
import { cn } from "../../../lib/cn";
import { StatusBadge } from "../../../components/ui/status";
import type { NetworkConnection, NetworkDevice } from "../types";
import { DeviceGlyph } from "./TopologyCanvas";
import { CONNECTION_TYPE_LABEL, timeAgo } from "../utils";

// ── Devices table ───────────────────────────────────────────────────────────

export function DevicesTable({
  devices,
  selectedId,
  onSelect,
}: {
  devices: NetworkDevice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  return (
    <div
      data-testid="devices-table"
      className="overflow-x-auto rounded-xl border border-edge bg-panel"
    >
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr className="border-b border-edge text-[11px] uppercase tracking-wider text-ink-3">
            {["Status", "Name", "Type", "IP", "OS", "Latency", "Conn.", "Last seen"].map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr
              key={d.id}
              onClick={() => onSelect(d.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(d.id);
                }
              }}
              role="button"
              aria-pressed={selectedId === d.id}
              tabIndex={0}
              className={cn(
                "cursor-pointer border-b border-edge/50 transition-colors last:border-0 hover:bg-hover/40",
                selectedId === d.id && "bg-accent/10",
              )}
            >
              <td className="px-3 py-2">
                <StatusBadge status={d.status} />
              </td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  <DeviceGlyph type={d.type} className="size-3.5 text-ink-3" />
                  {d.displayName || d.hostname}
                </span>
              </td>
              <td className="px-3 py-2 capitalize text-ink-2">{d.type}</td>
              <td className="num px-3 py-2 font-mono text-ink-2">{d.primaryIp ?? "—"}</td>
              <td className="max-w-40 truncate px-3 py-2 text-ink-2">{d.os ?? "—"}</td>
              <td className="num px-3 py-2 font-mono text-ink-2">
                {d.latencyMs != null ? `${d.latencyMs} ms` : "—"}
              </td>
              <td className="px-3 py-2 text-ink-2">{d.source}</td>
              <td className="num px-3 py-2 text-ink-3">{timeAgo(d.lastSeen)}</td>
            </tr>
          ))}
          {devices.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-3 py-6 text-center text-ink-3">
                No devices match the current filter.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

// ── Connections table ───────────────────────────────────────────────────────

export function ConnectionsTable({
  connections,
  names,
  selectedId,
  onSelect,
}: {
  connections: NetworkConnection[];
  names: Map<string, string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  return (
    <div
      data-testid="connections-table"
      className="overflow-x-auto rounded-xl border border-edge bg-panel"
    >
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr className="border-b border-edge text-[11px] uppercase tracking-wider text-ink-3">
            {["Source", "Destination", "Type", "Status", "Latency", "Loss", "Last activity"].map(
              (h) => (
                <th key={h} scope="col" className="px-3 py-2 font-medium">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {connections.map((c) => (
            <tr
              key={c.id}
              onClick={() => onSelect(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(c.id);
                }
              }}
              role="button"
              aria-pressed={selectedId === c.id}
              tabIndex={0}
              className={cn(
                "cursor-pointer border-b border-edge/50 transition-colors last:border-0 hover:bg-hover/40",
                selectedId === c.id && "bg-accent/10",
              )}
            >
              <td className="px-3 py-2 font-medium text-ink">
                {names.get(c.sourceId) ?? c.sourceId}
              </td>
              <td className="px-3 py-2 font-medium text-ink">
                {names.get(c.targetId) ?? c.targetId}
              </td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-1.5 text-ink-2">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      c.type === "p2p" || c.type === "direct"
                        ? "bg-emerald-500 dark:bg-emerald-400"
                        : c.type === "relay"
                          ? "bg-amber-500 dark:bg-amber-400"
                          : "bg-zinc-500",
                    )}
                    aria-hidden
                  />
                  {CONNECTION_TYPE_LABEL[c.type]}
                </span>
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={c.status} />
              </td>
              <td className="num px-3 py-2 font-mono text-ink-2">
                {c.latencyMs != null ? `${c.latencyMs} ms` : "—"}
              </td>
              <td className="num px-3 py-2 font-mono text-ink-2">
                {c.packetLossPercent != null ? `${c.packetLossPercent}%` : "—"}
              </td>
              <td className="num px-3 py-2 text-ink-3">{timeAgo(c.lastActivity)}</td>
            </tr>
          ))}
          {connections.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-ink-3">
                No connections match the current filter.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
