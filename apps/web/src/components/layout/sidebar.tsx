import type * as React from "react";
import {
  Activity,
  Bell,
  Blocks,
  Braces,
  Container,
  Database,
  Globe,
  HardDrive,
  History,
  LayoutDashboard,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Server,
  Settings,
  Shield,
  Smartphone,
  Waypoints,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router";
import { navSections } from "@opsora/config";
import { cn } from "../../lib/cn";
import { useUi } from "../../stores/ui";
import { useAlerts } from "../../lib/queries";

const icons: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  server: Server,
  smartphone: Smartphone,
  network: Network,
  container: Container,
  globe: Globe,
  "hard-drive": HardDrive,
  shield: Shield,
  activity: Activity,
  bell: Bell,
  "scroll-text": ScrollText,
  history: History,
  blocks: Blocks,
  github: Globe,
  terminal: Terminal,
  waypoints: Waypoints,
  database: Database,
  settings: Settings,
  braces: Braces,
};

/** Rounded-card navigation rail. Collapsed mode keeps icon tiles with tooltips. */
export function Sidebar(): React.JSX.Element {
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const setCollapsed = useUi((s) => s.setSidebarCollapsed);
  const { data } = useAlerts("active");
  const critCount = data?.alerts.filter((a) => a.severity === "critical").length ?? 0;
  const activeCount = data?.alerts.length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <nav
        aria-label="Primary"
        className={cn("flex-1 space-y-4 overflow-y-auto px-2 py-3", collapsed && "px-2")}
      >
        {navSections.map((section) => (
          <section
            key={section.label}
            aria-label={section.label}
            className={cn(collapsed && "grid justify-items-center")}
          >
            {!collapsed ? (
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                {section.label}
              </p>
            ) : (
              <span aria-hidden className="mb-1.5 h-px w-6 bg-edge" />
            )}
            <ul className={cn("space-y-1", collapsed && "grid justify-items-center")}>
              {section.items.map((item) => {
                const Icon = icons[item.icon] ?? Globe;
                const showBadge = item.label === "Alerts" && activeCount > 0;
                return (
                  <li key={item.to + item.label}>
                    <NavLink
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      aria-label={item.label}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-2.5 rounded-xl border border-transparent px-2 py-1.5 text-[13px] text-ink-2 transition-all hover:border-edge hover:bg-hover hover:text-ink",
                          isActive && "border-accent/25 bg-accent/10 text-ink shadow-sm",
                          collapsed && "justify-center px-0",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cn(
                              "relative grid size-7 shrink-0 place-items-center rounded-lg bg-hover text-ink-2 transition-colors group-hover:text-ink",
                              isActive && "bg-accent/20 text-accent-strong",
                              collapsed && "size-8",
                            )}
                          >
                            <Icon className="size-4" aria-hidden />
                            {showBadge && collapsed ? (
                              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                {activeCount > 9 ? "9+" : activeCount}
                              </span>
                            ) : null}
                          </span>
                          {!collapsed ? (
                            <>
                              <span className="truncate font-medium">{item.label}</span>
                              {item.label === "Alerts" && critCount > 0 ? (
                                <span className="ml-auto rounded-full bg-red-500/15 px-1.5 text-[11px] font-semibold text-red-600 dark:text-red-300">
                                  {critCount}
                                </span>
                              ) : null}
                            </>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
      <div className={cn("border-t border-edge p-2", collapsed && "grid justify-items-center")}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="flex items-center gap-2.5 rounded-xl border border-transparent px-2 py-1.5 text-[13px] text-ink-2 transition-all hover:border-edge hover:bg-hover hover:text-ink"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-hover">
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden />
            )}
          </span>
          {!collapsed ? <span className="font-medium">Collapse</span> : null}
        </button>
      </div>
    </div>
  );
}
