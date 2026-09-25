import * as React from "react";
import {
  Bell,
  ChevronRight,
  HelpCircle,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Sun,
  TerminalSquare,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { timeAgo } from "@opsora/utils";
import { useAlerts } from "../../lib/queries";
import { useEventsStream } from "../../lib/sse";
import { useUi } from "../../stores/ui";
import { Button } from "../ui/button";
import { StatusDot } from "../ui/status";
import { cn } from "../../lib/cn";

const routeTitles: Record<string, string> = {
  "/": "Overview",
  "/servers": "Servers",
  "/docker": "Containers",
  "/services": "Services",
  "/uptime": "Uptime Monitor",
  "/storage": "Storage",
  "/network": "Network",
  "/network/live": "Live Network",
  "/devices": "Devices",
  "/dns": "DNS & Pi-hole",
  "/alerts": "Alerts",
  "/activity": "Activity",
  "/monitoring": "Monitoring",
  "/logs": "Logs",
  "/integrations": "Integrations",
  "/integrations/github": "GitHub",
  "/integrations/docker": "Docker integration",
  "/integrations/pihole": "Pi-hole integration",
  "/integrations/agent": "Linux agent",
  "/integrations/tailscale": "Tailscale integration",
  "/integrations/s3": "S3 storage",
  "/settings": "Settings",
  "/api": "API Reference",
};

export function TopBar({
  updatedAt,
  onMenu,
}: {
  updatedAt?: string;
  onMenu?: () => void;
}): React.JSX.Element {
  const location = useLocation();
  const qc = useQueryClient();
  const { connected } = useEventsStream(true);
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const mobileNavOpen = useUi((s) => s.mobileNavOpen);
  const setSearchOpen = useUi((s) => s.setSearchOpen);
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  const setShortcutsOpen = useUi((s) => s.setShortcutsOpen);
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const autoRefresh = useUi((s) => s.autoRefresh);
  const setAutoRefresh = useUi((s) => s.setAutoRefresh);
  const addToast = useUi((s) => s.addToast);
  const { data } = useAlerts("active");
  const activeCount = data?.alerts.length ?? 0;

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 767px)").matches,
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 767px)");
    const update = (): void => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    if (autoRefresh <= 0) return;
    const interval = window.setInterval(() => {
      void qc.invalidateQueries();
    }, autoRefresh * 1000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, qc]);

  const handleManualRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await qc.invalidateQueries();
      addToast({
        title: "Dashboard refreshed",
        message: "All metrics and resources synchronized.",
        type: "info",
      });
    } finally {
      window.setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const currentTitle = routeTitles[location.pathname] ?? "Opsora";
  const navigationExpanded = isMobile ? mobileNavOpen : sidebarOpen;

  React.useEffect(() => {
    document.title = `${currentTitle} · Opsora`;
  }, [currentTitle]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-edge/70 bg-panel/80 px-3 shadow-[0_1px_0_rgb(255_255_255/0.02)] backdrop-blur-xl md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenu}
          aria-label={navigationExpanded ? "Close navigation" : "Open navigation"}
          aria-expanded={navigationExpanded}
          className="shrink-0"
        >
          <Menu className="size-[18px]" />
        </Button>

        <Link
          to="/"
          className="group flex min-w-0 items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors hover:bg-hover"
          aria-label="Opsora overview"
        >
          <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-[15px] font-black tracking-[-0.08em] text-accent-ink shadow-md shadow-accent/15 transition-transform group-hover:scale-[1.03]">
            O
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border-2 border-panel bg-emerald-400" />
          </span>
          <span className="hidden min-w-0 flex-col leading-none sm:flex">
            <span className="text-[13px] font-extrabold tracking-[0.14em] text-ink">OPSORA</span>
            <span className="mt-1 truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              Infrastructure control
            </span>
          </span>
        </Link>
        <div className="mx-1 hidden h-6 w-px bg-edge/80 lg:block" aria-hidden />
        <div className="hidden min-w-0 items-center gap-1.5 text-xs lg:flex">
          <span className="text-ink-3">Workspace</span>
          <ChevronRight className="size-3 text-ink-3/70" aria-hidden />
          <span className="truncate font-semibold text-ink">{currentTitle}</span>
        </div>
      </div>

      <button
        onClick={() => setSearchOpen(true)}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-hover hover:text-ink md:hidden"
        aria-label="Open global search"
      >
        <Search className="size-4" />
      </button>

      <button
        onClick={() => setSearchOpen(true)}
        className="group ml-auto hidden h-9 min-w-0 max-w-[22rem] flex-1 items-center gap-2.5 rounded-xl border border-edge/80 bg-surface-muted/60 px-3 text-left text-[13px] text-ink-3 shadow-xs transition-all hover:border-accent/45 hover:bg-surface hover:text-ink-2 md:flex lg:max-w-sm"
        aria-label="Global search (Control K)"
      >
        <Search
          className="size-4 shrink-0 transition-colors group-hover:text-accent-strong"
          aria-hidden
        />
        <span className="truncate">Search hosts, containers, services…</span>
        <kbd className="ml-auto hidden shrink-0 rounded-md border border-edge/80 bg-panel px-1.5 py-0.5 text-[10px] font-medium text-ink-3 lg:inline">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-2">
        <div className="flex items-center rounded-xl border border-edge/80 bg-surface-muted/60 p-0.5">
          <button
            onClick={() => void handleManualRefresh()}
            disabled={isRefreshing}
            className="grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-hover hover:text-ink disabled:cursor-wait"
            title="Refresh metrics now (R)"
            aria-label="Refresh metrics"
          >
            <RefreshCw
              className={cn("size-3.5", isRefreshing && "animate-spin text-accent-strong")}
            />
          </button>
          <select
            value={autoRefresh}
            onChange={(e) => setAutoRefresh(Number(e.target.value))}
            className="hidden h-8 cursor-pointer bg-transparent pr-2 text-[11px] font-medium text-ink-3 outline-none sm:block"
            aria-label="Auto refresh rate"
            title="Auto-refresh rate"
          >
            <option value={0}>Pause</option>
            <option value={10}>10s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>
        </div>

        <span
          className="flex items-center gap-1.5 rounded-full border border-edge/80 bg-panel px-2.5 py-1.5 text-[11px] font-semibold text-ink-2 shadow-xs max-[380px]:hidden"
          title={
            connected ? "Realtime connected (SSE)" : "Realtime disconnected — polling fallback"
          }
        >
          <StatusDot status={connected ? "connected" : "stale"} live={connected} />
          <span className="hidden sm:inline">{connected ? "Live" : "Polling"}</span>
        </span>

        {updatedAt ? (
          <span className="num hidden text-[11px] text-ink-3 2xl:inline" title={updatedAt}>
            Updated {timeAgo(updatedAt)}
          </span>
        ) : null}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setShortcutsOpen(true)}
          aria-label="Keyboard shortcuts (?)"
          title="Keyboard shortcuts (?)"
          className="hidden lg:inline-flex"
        >
          <HelpCircle className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPaletteOpen(true)}
          aria-label="Command palette (Control P)"
          title="Command palette"
          className="hidden sm:inline-flex"
        >
          <TerminalSquare className="size-4" />
        </Button>

        <Link
          to="/alerts"
          className="relative grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          aria-label={`Alerts (${activeCount} active)`}
        >
          <Bell className="size-4" />
          {activeCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
              {activeCount > 9 ? "9+" : activeCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
