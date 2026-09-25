import * as React from "react";
import {
  Container,
  Cpu,
  Crosshair,
  Globe,
  Monitor,
  Laptop,
  Maximize,
  Minus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Router,
  Scan,
  Server,
  ShieldQuestion,
  Smartphone,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../../lib/cn";
import type { NetworkConnection, NetworkDevice, NetworkDeviceType, NodePosition } from "../types";
import {
  CONNECTION_TYPE_LABEL,
  autoLayout,
  connectionStrokeClass,
  deviceDotClass,
  LAYOUT_HEIGHT,
  LAYOUT_WIDTH,
} from "../utils";
import "../topology.css";

const NODE_W = 176;
const NODE_H = 96;

const TYPE_ICONS: Record<NetworkDeviceType, LucideIcon> = {
  server: Server,
  desktop: Monitor,
  laptop: Laptop,
  mobile: Smartphone,
  router: Router,
  gateway: Waypoints,
  container: Container,
  vm: Cpu,
  network: Globe,
  unknown: ShieldQuestion,
};

export function DeviceGlyph({
  type,
  className,
}: {
  type: NetworkDeviceType;
  className?: string;
}): React.JSX.Element {
  const Icon = TYPE_ICONS[type] ?? ShieldQuestion;
  return <Icon className={className ?? "size-4"} aria-hidden />;
}

// ── Node ────────────────────────────────────────────────────────────────────

interface NodeProps {
  device: NetworkDevice;
  pos: NodePosition;
  selected: boolean;
  dimmed: boolean;
  peerTag?: string | null;
  onSelect: (id: string) => void;
  onDragStart: (id: string, e: React.PointerEvent) => void;
}

const TopologyNode = React.memo(function TopologyNode({
  device,
  pos,
  selected,
  dimmed,
  peerTag,
  onSelect,
  onDragStart,
}: NodeProps): React.JSX.Element {
  const label = device.displayName || device.hostname;
  return (
    <g
      transform={`translate(${pos.x - NODE_W / 2},${pos.y - NODE_H / 2})`}
      opacity={dimmed ? 0.25 : 1}
      className="cursor-grab"
      tabIndex={0}
      role="button"
      aria-label={`${label}, ${device.status}, ${device.primaryIp ?? "no IP"}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(device.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(device.id);
        }
      }}
      onPointerDown={(e) => onDragStart(device.id, e)}
    >
      <foreignObject width={NODE_W} height={NODE_H}>
        <div
          data-testid={`topology-node-${device.id}`}
          className={cn(
            "nl-node-card flex h-full w-full flex-col justify-center gap-1 rounded-xl border bg-panel/95 px-3 py-2.5 shadow-sm",
            selected ? "border-accent/70" : "border-edge",
            device.status === "offline" && "opacity-90",
          )}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={cn("size-1.5 shrink-0 rounded-full", deviceDotClass(device.status))}
              aria-hidden
            />
            <span className="truncate text-xs font-semibold text-ink">{label}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] capitalize text-ink-3">
            <DeviceGlyph type={device.type} className="size-3 shrink-0" />
            <span className="truncate">{device.type}</span>
          </div>
          <div className="truncate font-mono text-[11px] text-ink-2">
            {device.primaryIp ?? device.ipAddresses[0] ?? "—"}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-ink-3">
            <span className="num font-medium text-ink-2">
              {device.latencyMs != null ? `${device.latencyMs} ms` : "—"}
            </span>
            <span aria-hidden>•</span>
            <span>{peerTag ?? device.status}</span>
          </div>
        </div>
      </foreignObject>
    </g>
  );
});

// ── Edge ────────────────────────────────────────────────────────────────────

interface EdgeProps {
  connection: NetworkConnection;
  from: NodePosition;
  to: NodePosition;
  selected: boolean;
  dimmed: boolean;
  alwaysLabel: boolean;
  onSelect: (id: string) => void;
}

const TopologyEdge = React.memo(function TopologyEdge({
  connection: c,
  from,
  to,
  selected,
  dimmed,
  alwaysLabel,
  onSelect,
}: EdgeProps): React.JSX.Element {
  const [hovered, setHovered] = React.useState(false);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const trim = Math.min(len / 2 - 4, 100);
  const ux = dx / len;
  const uy = dy / len;
  const x1 = from.x + ux * trim;
  const y1 = from.y + uy * trim;
  const x2 = to.x - ux * trim;
  const y2 = to.y - uy * trim;
  const animated = c.status === "active" || c.status === "degraded";
  const showLabel = alwaysLabel || selected || hovered;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const label = [CONNECTION_TYPE_LABEL[c.type], c.latencyMs != null ? `${c.latencyMs} ms` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <g opacity={dimmed ? 0.15 : 1}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={14}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`${CONNECTION_TYPE_LABEL[c.type]} connection, ${c.status}`}
        data-testid={`topology-edge-${c.id}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(c.id);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(c.id);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <title>{`${CONNECTION_TYPE_LABEL[c.type]} connection, ${c.status}`}</title>
      </line>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeWidth={selected || hovered ? 2.4 : 1.5}
        className={cn(
          connectionStrokeClass(c.status),
          animated && (c.status === "active" ? "nl-edge-active" : "nl-edge-degraded"),
          c.status === "inactive" && "stroke-dasharray-[3_6]",
          c.status === "unknown" && "stroke-dasharray-[2_5]",
          selected && "stroke-accent",
          "pointer-events-none fill-none",
        )}
      />
      {showLabel && label ? (
        <g transform={`translate(${midX},${midY})`} className="pointer-events-none">
          <rect x={-48} y={-10} width={96} height={18} rx={4} className="fill-panel stroke-edge" />
          <text textAnchor="middle" dy={4} className="fill-ink-2 font-mono" fontSize={10}>
            {label.length > 19 ? `${label.slice(0, 18)}…` : label}
          </text>
        </g>
      ) : null}
    </g>
  );
});

// ── Canvas ──────────────────────────────────────────────────────────────────

interface CanvasProps {
  devices: NetworkDevice[];
  connections: NetworkConnection[];
  overrides: Record<string, NodePosition>;
  selectedDeviceId: string | null;
  selectedConnectionId: string | null;
  animationsPaused: boolean;
  onSelectDevice: (id: string | null) => void;
  onSelectConnection: (id: string | null) => void;
  onPositionCommit: (id: string, pos: NodePosition) => void;
  onAutoLayout: () => void;
  onToggleAnimations: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

interface Viewport {
  x: number;
  y: number;
  k: number;
}

export function TopologyCanvas(props: CanvasProps): React.JSX.Element {
  const { devices, connections, overrides } = props;
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ w: 800, h: 520 });
  const [view, setView] = React.useState<Viewport>({ x: 0, y: 0, k: 1 });
  const [drag, setDrag] = React.useState<{
    kind: "pan" | "node";
    id?: string;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null>(null);
  const viewRef = React.useRef(view);
  viewRef.current = view;

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const base = React.useMemo(() => autoLayout(devices, connections), [devices, connections]);
  const [live, setLive] = React.useState<Map<string, NodePosition>>(base);
  React.useEffect(() => {
    setLive((prev) => {
      const next = new Map(base);
      for (const [id, p] of Object.entries(overrides)) if (next.has(id)) next.set(id, p);
      // Preserve in-progress drag positions already in prev? Overrides cover persisted ones.
      void prev;
      return next;
    });
  }, [base, overrides]);
  const liveRef = React.useRef(live);
  liveRef.current = live;

  const highlight = React.useMemo(() => {
    if (!props.selectedDeviceId) return null;
    const keep = new Set<string>([props.selectedDeviceId]);
    const edgeIds = new Set<string>();
    for (const c of connections) {
      if (c.sourceId === props.selectedDeviceId || c.targetId === props.selectedDeviceId) {
        keep.add(c.sourceId);
        keep.add(c.targetId);
        edgeIds.add(c.id);
      }
    }
    return { keep, edgeIds };
  }, [props.selectedDeviceId, connections]);

  const peerTag = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const d of devices) {
      const tags = new Set<string>();
      for (const c of connections) {
        if (c.sourceId === d.id || c.targetId === d.id) {
          if (c.type === "p2p" || c.type === "direct") tags.add("P2P");
          else if (c.type === "relay") tags.add("Relay");
        }
      }
      if (tags.size > 0) m.set(d.id, [...tags].join("/"));
    }
    return m;
  }, [devices, connections]);

  function handleNodeDragStart(id: string, e: React.PointerEvent): void {
    if (e.button !== 0) return;
    const p = liveRef.current.get(id);
    if (!p) return;
    setDrag({ kind: "node", id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y });
  }

  function handlePointerMove(e: React.PointerEvent): void {
    if (!drag) return;
    if (drag.kind === "pan") {
      setView((v) => ({
        ...v,
        x: drag.ox + (e.clientX - drag.sx),
        y: drag.oy + (e.clientY - drag.sy),
      }));
    } else if (drag.id) {
      const k = viewRef.current.k;
      const next = {
        x: drag.ox + (e.clientX - drag.sx) / k,
        y: drag.oy + (e.clientY - drag.sy) / k,
      };
      const m = new Map(liveRef.current);
      m.set(drag.id, next);
      liveRef.current = m;
      setLive(m);
    }
  }

  function endDrag(): void {
    if (drag?.kind === "node" && drag.id) {
      const p = liveRef.current.get(drag.id);
      if (p) props.onPositionCommit(drag.id, { x: Math.round(p.x), y: Math.round(p.y) });
    }
    setDrag(null);
  }

  function zoomAt(factor: number, cx?: number, cy?: number): void {
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.35, v.k * factor));
      const px = cx ?? size.w / 2;
      const py = cy ?? size.h / 2;
      const lx = (px - v.x) / v.k;
      const ly = (py - v.y) / v.k;
      return { k, x: px - lx * k, y: py - ly * k };
    });
  }

  const fitTo = React.useCallback(
    (positions: Map<string, NodePosition>): void => {
      const pts = [...positions.values()];
      if (pts.length === 0) return;
      const el = wrapRef.current;
      const w = el?.clientWidth ?? size.w;
      const h = el?.clientHeight ?? size.h;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const minX = Math.min(...xs) - NODE_W;
      const maxX = Math.max(...xs) + NODE_W;
      const minY = Math.min(...ys) - NODE_H;
      const maxY = Math.max(...ys) + NODE_H;
      const k = Math.min(1.4, Math.max(0.35, Math.min(w / (maxX - minX), h / (maxY - minY))));
      setView({
        k,
        x: w / 2 - ((minX + maxX) / 2) * k,
        y: h / 2 - ((minY + maxY) / 2) * k,
      });
    },
    [size.w, size.h],
  );

  function centerView(): void {
    setView((v) => ({
      ...v,
      x: size.w / 2 - (LAYOUT_WIDTH / 2) * v.k,
      y: size.h / 2 - (LAYOUT_HEIGHT / 2) * v.k,
    }));
  }

  const fittedFor = React.useRef("");
  React.useEffect(() => {
    const key = devices.map((d) => d.id).join(",");
    if (key && fittedFor.current !== key) {
      const t = setTimeout(() => {
        fittedFor.current = key;
        fitTo(liveRef.current);
      }, 40);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [devices, fitTo]);

  return (
    <div
      ref={wrapRef}
      data-testid="topology-canvas"
      className={cn(
        "relative h-[420px] w-full touch-none overflow-hidden rounded-xl border border-edge bg-surface-muted select-none md:h-[520px] lg:h-[560px]",
        props.animationsPaused && "nl-anim-paused",
      )}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        role="application"
        aria-label="Network topology canvas. Drag to pan, scroll to zoom, tab to reach nodes."
        onPointerDown={(e) => {
          if ((e.target as Element).closest("[data-node-root]")) return;
          setDrag({ kind: "pan", sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y });
        }}
        onClick={() => {
          props.onSelectDevice(null);
          props.onSelectConnection(null);
        }}
        onWheel={(e) => {
          const rect = wrapRef.current?.getBoundingClientRect();
          zoomAt(
            e.deltaY < 0 ? 1.12 : 0.89,
            e.clientX - (rect?.left ?? 0),
            e.clientY - (rect?.top ?? 0),
          );
        }}
      >
        <defs>
          <pattern id="nl-grid" width={28} height={28} patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" strokeWidth={1} className="stroke-edge/40" />
          </pattern>
          <pattern id="nl-dots" width={28} height={28} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={1} className="fill-ink-3/30" />
          </pattern>
        </defs>
        <rect x={-4000} y={-4000} width={9000} height={9000} fill="url(#nl-grid)" opacity={0.5} />
        <rect x={-4000} y={-4000} width={9000} height={9000} fill="url(#nl-dots)" opacity={0.6} />
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {connections.map((c) => {
            const from = live.get(c.sourceId);
            const to = live.get(c.targetId);
            if (!from || !to) return null;
            const dimmed = highlight
              ? !highlight.edgeIds.has(c.id) && props.selectedConnectionId !== c.id
              : false;
            return (
              <TopologyEdge
                key={c.id}
                connection={c}
                from={from}
                to={to}
                selected={props.selectedConnectionId === c.id}
                dimmed={dimmed}
                alwaysLabel={c.type === "p2p" || c.type === "relay" || c.status === "degraded"}
                onSelect={props.onSelectConnection}
              />
            );
          })}
          {devices.map((d) => {
            const p = live.get(d.id);
            if (!p) return null;
            return (
              <g key={d.id} data-node-root="true">
                <TopologyNode
                  device={d}
                  pos={p}
                  selected={props.selectedDeviceId === d.id}
                  dimmed={highlight ? !highlight.keep.has(d.id) : false}
                  peerTag={peerTag.get(d.id) ?? null}
                  onSelect={props.onSelectDevice}
                  onDragStart={handleNodeDragStart}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating toolbar */}
      <div
        className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-edge bg-panel/95 p-1 shadow-md"
        role="toolbar"
        aria-label="Topology controls"
      >
        <ToolButton label="Zoom in" onClick={() => zoomAt(1.25)}>
          <Plus className="size-3.5" />
        </ToolButton>
        <ToolButton label="Zoom out" onClick={() => zoomAt(0.8)}>
          <Minus className="size-3.5" />
        </ToolButton>
        <span className="mx-0.5 h-4 w-px bg-edge" aria-hidden />
        <ToolButton label="Fit to view" onClick={() => fitTo(liveRef.current)}>
          <Maximize className="size-3.5" />
        </ToolButton>
        <ToolButton label="Center" onClick={centerView}>
          <Crosshair className="size-3.5" />
        </ToolButton>
        <ToolButton label="Auto layout" onClick={props.onAutoLayout}>
          <Scan className="size-3.5" />
        </ToolButton>
        <span className="mx-0.5 h-4 w-px bg-edge" aria-hidden />
        <ToolButton
          label={props.animationsPaused ? "Resume animation" : "Pause animation"}
          onClick={props.onToggleAnimations}
          active={props.animationsPaused}
        >
          {props.animationsPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </ToolButton>
        <ToolButton label="Refresh topology" onClick={props.onRefresh}>
          <RefreshCw className={cn("size-3.5", props.refreshing && "animate-spin")} />
        </ToolButton>
      </div>

      <div className="pointer-events-none absolute top-3 left-3 rounded-md border border-edge bg-panel/90 px-2 py-1 font-mono text-[10px] text-ink-3">
        {devices.length} nodes · {connections.length} links
      </div>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "grid size-7 place-items-center rounded-md text-ink-2 transition-colors hover:bg-hover hover:text-ink",
        active && "bg-accent/15 text-accent-strong",
      )}
    >
      {children}
    </button>
  );
}

export { LAYOUT_HEIGHT, LAYOUT_WIDTH };
