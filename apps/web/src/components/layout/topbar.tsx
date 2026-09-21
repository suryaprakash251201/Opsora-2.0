import type * as React from "react";
import { Bell, Menu, Moon, Search, Sun, TerminalSquare } from "lucide-react";
import { Link } from "react-router";
import { timeAgo } from "@opsora/utils";
import { useAlerts } from "../../lib/queries";
import { useEventsStream } from "../../lib/sse";
import { useUi } from "../../stores/ui";
import { Button } from "../ui/button";
import { StatusDot } from "../ui/status";

export function TopBar({ updatedAt }: { updatedAt?: string }): React.JSX.Element {
  const { connected } = useEventsStream(true);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const setSearchOpen = useUi((s) => s.setSearchOpen);
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const { data } = useAlerts("active");
  const activeCount = data?.alerts.length ?? 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-3">
      <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} aria-label="Toggle navigation">
        <Menu className="size-4" />
      </Button>
      <Link to="/" className="flex items-center gap-2 rounded-lg px-1 py-1">
        <span className="grid size-7 place-items-center rounded-lg bg-accent/15 text-sm font-bold text-accent-strong">
          O
        </span>
        <span className="text-sm font-semibold tracking-tight">Opsora</span>
      </Link>
      <div className="mx-2 hidden h-5 w-px bg-edge md:block" aria-hidden />
      <button
        onClick={() => setSearchOpen(true)}
        className="hidden h-9 flex-1 items-center gap-2 rounded-xl border border-edge bg-panel px-3 text-[13px] text-ink-3 shadow-sm transition-colors hover:border-ink-3 hover:text-ink-2 md:flex md:max-w-sm"
        aria-label="Global search (Ctrl+K)"
      >
        <Search className="size-3.5" aria-hidden />
        <span>Search servers, containers, services…</span>
        <kbd className="ml-auto rounded-md border border-edge bg-void px-1.5 text-[10px]">
          Ctrl K
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-1.5">
        {updatedAt ? (
          <span className="num hidden text-xs text-ink-3 lg:inline" title={updatedAt}>
            Updated {timeAgo(updatedAt)}
          </span>
        ) : null}
        <span
          className="flex items-center gap-1.5 rounded-full border border-edge bg-panel px-2.5 py-1 text-[11px] font-medium text-ink-2 shadow-sm"
          title={connected ? "Realtime connected (SSE)" : "Realtime disconnected — polling"}
        >
          <StatusDot status={connected ? "connected" : "stale"} live={connected} />
          {connected ? "Live" : "Polling"}
        </span>
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
          aria-label="Command palette"
        >
          <TerminalSquare className="size-4" />
        </Button>
        <Link
          to="/alerts"
          className="relative rounded-lg p-2 text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          aria-label={`Alerts (${activeCount} active)`}
        >
          <Bell className="size-4" />
          {activeCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {activeCount > 9 ? "9+" : activeCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
