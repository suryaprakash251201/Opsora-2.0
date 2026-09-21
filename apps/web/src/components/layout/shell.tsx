import * as React from "react";
import { Outlet } from "react-router";
import { cn } from "../../lib/cn";
import { useUi } from "../../stores/ui";
import { CommandPalette } from "./palette";
import { SearchDialog } from "./search";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";

export function AppShell({ updatedAt }: { updatedAt?: string }): React.JSX.Element {
  const open = useUi((s) => s.sidebarOpen);
  const collapsed = useUi((s) => s.sidebarCollapsed);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useUi.getState().setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-full flex-col bg-void text-ink">
      <TopBar updatedAt={updatedAt} />
      <div className="flex min-h-0 flex-1 gap-2 p-2 pt-0">
        {open ? (
          <aside
            className={cn(
              "hidden shrink-0 flex-col overflow-hidden rounded-2xl border border-edge bg-panel shadow-sm transition-all md:flex",
              collapsed ? "w-[68px]" : "w-60",
            )}
          >
            <Sidebar />
          </aside>
        ) : null}
        <main className="min-w-0 flex-1 overflow-y-auto" id="main">
          <Outlet />
        </main>
      </div>
      {/* Mobile bottom nav */}
      <nav
        aria-label="Mobile"
        className="flex shrink-0 items-center justify-around border-t border-edge bg-panel px-2 py-1.5 md:hidden"
      >
        <MobileLink to="/" label="Home" />
        <MobileLink to="/servers" label="Servers" />
        <MobileLink to="/alerts" label="Alerts" />
        <MobileLink to="/services" label="Services" />
        <MobileLink to="/settings" label="Settings" />
      </nav>
      <SearchDialog />
      <CommandPalette />
    </div>
  );
}

function MobileLink({ to, label }: { to: string; label: string }): React.JSX.Element {
  return (
    <a
      href={to}
      className="rounded-lg px-3 py-1.5 text-xs text-ink-2 hover:bg-hover hover:text-ink"
    >
      {label}
    </a>
  );
}
