import * as React from "react";
import { Link } from "react-router";
import { Pause, Play, RefreshCw } from "lucide-react";
import { PageHeader } from "../../../components/ui/page-header";
import { Button } from "../../../components/ui/button";
import { ErrorState, EmptyState } from "../../../components/ui/states";
import { Skeleton } from "../../../components/ui/skeleton";
import { isMockEnabled, useLiveTopology, useNetworkEventHistory } from "../api";
import { useNetworkRealtime } from "../hooks";
import { useNetworkUi } from "../store";
import type { DeviceFilter } from "../types";
import { filterConnections, filterDevices, toFeedEntries } from "../utils";
import { TopologyCanvas } from "../components/TopologyCanvas";
import { FilterBar, LiveBadge, NetworkSummary, ViewTabs } from "../components/Panels";
import { ConnectionInspector, DeviceInspector } from "../components/Inspectors";
import { EventStream } from "../components/EventStream";
import { ConnectionsTable, DevicesTable } from "../components/Lists";

export function NetworkLivePage(): React.JSX.Element {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useLiveTopology();
  const history = useNetworkEventHistory();
  const [paused, setPaused] = React.useState(false);
  const { liveState, feed, setFeed } = useNetworkRealtime(paused);

  const selectedDeviceId = useNetworkUi((s) => s.selectedDeviceId);
  const selectedConnectionId = useNetworkUi((s) => s.selectedConnectionId);
  const view = useNetworkUi((s) => s.view);
  const filter = useNetworkUi((s) => s.filter);
  const query = useNetworkUi((s) => s.query);
  const eventsOpen = useNetworkUi((s) => s.eventsOpen);
  const animationsPaused = useNetworkUi((s) => s.animationsPaused);
  const positions = useNetworkUi((s) => s.positions);
  const selectDevice = useNetworkUi((s) => s.selectDevice);
  const selectConnection = useNetworkUi((s) => s.selectConnection);
  const setView = useNetworkUi((s) => s.setView);
  const setFilter = useNetworkUi((s) => s.setFilter);
  const setQuery = useNetworkUi((s) => s.setQuery);
  const setEventsOpen = useNetworkUi((s) => s.setEventsOpen);
  const toggleAnimations = useNetworkUi((s) => s.toggleAnimations);
  const setPosition = useNetworkUi((s) => s.setPosition);
  const resetPositions = useNetworkUi((s) => s.resetPositions);

  // Seed the feed from persisted history once.
  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (!seeded.current && history.data) {
      seeded.current = true;
      const entries = toFeedEntries(history.data.events);
      if (entries.length > 0) setFeed((prev) => [...prev, ...entries].slice(0, 100));
    }
  }, [history.data, setFeed]);

  const devices = React.useMemo(
    () => (data ? filterDevices(data.devices, data.connections, query, filter) : []),
    [data, query, filter],
  );
  const connections = React.useMemo(
    () => (data ? filterConnections(data.connections, data.devices, query, filter) : []),
    [data, query, filter],
  );

  const counts = React.useMemo(() => {
    if (!data) return {};
    const all: DeviceFilter[] = [
      "all",
      "online",
      "offline",
      "degraded",
      "p2p",
      "relay",
      "servers",
      "clients",
      "network",
      "containers",
    ];
    const out: Record<string, number> = {};
    for (const f of all) out[f] = filterDevices(data.devices, data.connections, "", f).length;
    return out;
  }, [data]);

  const names = React.useMemo(
    () => new Map((data?.devices ?? []).map((d) => [d.id, d.displayName || d.hostname])),
    [data],
  );
  const selectedDevice = data?.devices.find((d) => d.id === selectedDeviceId) ?? null;
  const selectedConnection = data?.connections.find((c) => c.id === selectedConnectionId) ?? null;
  const deviceConnections = React.useMemo(
    () =>
      selectedDevice
        ? (data?.connections ?? []).filter(
            (c) => c.sourceId === selectedDevice.id || c.targetId === selectedDevice.id,
          )
        : [],
    [data, selectedDevice],
  );

  // Canvas shows the filtered device set with links whose endpoints are visible.
  const visibleIds = React.useMemo(() => new Set(devices.map((d) => d.id)), [devices]);
  const visibleConnections = React.useMemo(
    () => connections.filter((c) => visibleIds.has(c.sourceId) && visibleIds.has(c.targetId)),
    [connections, visibleIds],
  );

  if (isLoading) {
    return (
      <div
        className="grid gap-3 p-3 md:p-4 lg:p-6"
        aria-busy="true"
        aria-label="Loading live network"
      >
        <PageHeader
          title="Live Network"
          description="Real-time infrastructure topology and P2P connectivity."
        />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="Live Network"
          description="Real-time infrastructure topology and P2P connectivity."
        />
        <ErrorState
          message="Network data unavailable — Opsora cannot reach the network collector."
          onRetry={() => void refetch()}
        />
        {dataUpdatedAt ? (
          <p className="text-xs text-ink-3">
            Last successful update: {new Date(dataUpdatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>
    );
  }

  if (data.devices.length === 0) {
    return (
      <div className="grid gap-3 p-3 md:p-4 lg:p-6">
        <PageHeader
          title="Live Network"
          description="Real-time infrastructure topology and P2P connectivity."
          badge={<LiveBadge state={liveState} deviceCount={0} />}
        />
        <EmptyState
          title="No network nodes detected yet"
          hint="Connect an Opsora agent to begin monitoring your infrastructure. Nodes appear here automatically once agents check in."
        >
          <Link
            to="/integrations/agent"
            className="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            Configure Agent
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="grid gap-3 p-3 md:p-4 lg:p-6">
      <PageHeader
        title="Live Network"
        description="Real-time infrastructure topology and P2P connectivity."
        badge={
          <LiveBadge state={liveState} deviceCount={data.summary.total} mock={isMockEnabled()} />
        }
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              className="gap-1.5 text-xs"
            >
              {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <NetworkSummary summary={data.summary} />

      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <ViewTabs view={view} onView={setView} />
        <div className="flex-1 xl:max-w-2xl">
          <FilterBar
            query={query}
            filter={filter}
            onQuery={setQuery}
            onFilter={setFilter}
            counts={counts}
          />
        </div>
      </div>

      {view === "topology" ? (
        <div className="relative">
          <TopologyCanvas
            devices={devices}
            connections={visibleConnections}
            overrides={positions}
            selectedDeviceId={selectedDeviceId}
            selectedConnectionId={selectedConnectionId}
            animationsPaused={animationsPaused}
            onSelectDevice={selectDevice}
            onSelectConnection={selectConnection}
            onPositionCommit={setPosition}
            onAutoLayout={resetPositions}
            onToggleAnimations={toggleAnimations}
            onRefresh={() => void refetch()}
            refreshing={isFetching}
          />
          {selectedDevice ? (
            <DeviceInspector
              device={selectedDevice}
              connections={deviceConnections}
              peerNames={names}
              onClose={() => selectDevice(null)}
              onSelectConnection={selectConnection}
            />
          ) : null}
          {selectedConnection && !selectedDevice ? (
            <ConnectionInspector
              connection={selectedConnection}
              source={data.devices.find((d) => d.id === selectedConnection.sourceId)}
              target={data.devices.find((d) => d.id === selectedConnection.targetId)}
              onClose={() => selectConnection(null)}
            />
          ) : null}
        </div>
      ) : null}

      {view === "devices" ? (
        <DevicesTable devices={devices} selectedId={selectedDeviceId} onSelect={selectDevice} />
      ) : null}

      {view === "connections" ? (
        <ConnectionsTable
          connections={visibleConnections}
          names={names}
          selectedId={selectedConnectionId}
          onSelect={selectConnection}
        />
      ) : null}

      <EventStream
        entries={feed}
        open={eventsOpen}
        onToggle={() => setEventsOpen(!eventsOpen)}
        filter={query}
      />

      <p className="text-[11px] text-ink-3">
        Updated {new Date(data.updatedAt).toLocaleTimeString()}
        {data.tailscaleStatus === "connected"
          ? " · Tailnet mesh synced"
          : " · Local topology"} ·{" "}
        <Link to="/network" className="underline hover:text-ink-2">
          Classic network view
        </Link>
      </p>
    </div>
  );
}

// Re-export for router convenience.
export default NetworkLivePage;
