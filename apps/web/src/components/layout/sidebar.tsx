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
  HeartPulse,
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
import { useAlerts, useDocker, useServers, useServices } from "../../lib/queries";
import { StatusDot } from "../ui/status";

const icons: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  server: Server,
  smartphone: Smartphone,
  network: Network,
  container: Container,
  globe: Globe,
  "heart-pulse": HeartPulse,
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
export function Sidebar({ mobile = false }: { mobile?: boolean }): React.JSX.Element {
  const desktopCollapsed = useUi((s) => s.sidebarCollapsed);
  const isCollapsed = mobile ? false : desktopCollapsed;
  const setCollapsed = useUi((s) => s.setSidebarCollapsed);
  const { data: alertData } = useAlerts("active");
  const { data: dockerData } = useDocker();
  const { data: serviceData } = useServices(false);
  const { data: serverData } = useServers();

  const critCount = alertData?.alerts.filter((a) => a.severity === "critical").length ?? 0;
  const activeAlerts = alertData?.alerts.length ?? 0;
  const runningContainers = dockerData?.running ?? 0;
  const unhealthyServices =
    serviceData?.services.filter((s) => s.status === "down" || s.status === "degraded").length ?? 0;
  const host = serverData?.servers[0];

  return (
    <div className="flex h-full flex-col">
      <nav
        aria-label="Primary"
        className={cn(
          "flex-1 space-y-5 overflow-y-auto scrollbar-hide px-3 py-5",
          isCollapsed && "px-2",
        )}
      >
        {navSections.map((section) => (
          <section
            key={section.label}
            aria-label={section.label}
            className={cn(isCollapsed && "grid justify-items-center")}
          >
            {!isCollapsed ? (
              <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-3">
                {section.label}
              </p>
            ) : (
              <span
                aria-hidden
                className="mb-2 mt-1 h-px w-7 bg-gradient-to-r from-transparent via-edge to-transparent"
              />
            )}
            <ul className={cn("space-y-1", isCollapsed && "grid justify-items-center")}>
              {section.items.map((item) => {
                const Icon = icons[item.icon] ?? Globe;
                const isAlerts = item.label === "Alerts";
                const isContainers = item.label === "Docker";
                const isServices = item.label === "Services";

                return (
                  <li key={item.to + item.label}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/" || item.to === "/network" || item.to === "/integrations"}
                      title={isCollapsed ? item.label : undefined}
                      aria-label={item.label}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2.5 text-[13px] font-medium text-ink-2 transition-all hover:border-edge/70 hover:bg-hover hover:text-ink",
                          isActive &&
                            "border-accent/35 bg-accent/10 text-ink shadow-sm dark:border-accent dark:bg-accent dark:text-accent-ink dark:shadow-[0_8px_24px_-12px_var(--accent)] dark:hover:bg-accent-strong",
                          isCollapsed && "justify-center px-1.5 py-2",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Active accent bar */}
                          {isActive ? (
                            <span className="absolute -left-0.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_10px_var(--accent)] dark:bg-accent-ink dark:shadow-none" />
                          ) : null}
                          <span
                            className={cn(
                              "relative grid size-8 shrink-0 place-items-center rounded-xl border border-transparent bg-surface-muted/55 text-ink-3 transition-all duration-200 group-hover:border-edge/70 group-hover:bg-hover group-hover:text-ink",
                              isActive &&
                                "border-accent/25 bg-accent/15 text-accent-strong dark:border-white/20 dark:bg-white/15 dark:text-accent-ink",
                              isCollapsed && "size-9",
                            )}
                          >
                            <Icon className="size-4" aria-hidden />
                            {isAlerts && activeAlerts > 0 && isCollapsed ? (
                              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                                {activeAlerts > 9 ? "9+" : activeAlerts}
                              </span>
                            ) : null}
                          </span>
                          {!isCollapsed ? (
                            <>
                              <span className="truncate">{item.label}</span>
                              {isAlerts && activeAlerts > 0 ? (
                                <span
                                  className={cn(
                                    "ml-auto rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                                    critCount > 0
                                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                                  )}
                                >
                                  {activeAlerts}
                                </span>
                              ) : null}
                              {isContainers && runningContainers > 0 ? (
                                <span className="ml-auto rounded-full bg-void border border-edge px-1.5 py-0.2 text-[10px] font-medium text-ink-3">
                                  {runningContainers}
                                </span>
                              ) : null}
                              {isServices && unhealthyServices > 0 ? (
                                <span className="ml-auto size-2 rounded-full bg-amber-500 animate-pulse" />
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

      {/* Host quick indicator in bottom of sidebar */}
      {!isCollapsed && host ? (
        <div className="mx-2 mb-3 rounded-2xl border border-edge/70 bg-surface-muted/55 p-3 shadow-xs">
          <div className="flex items-center gap-2">
            <StatusDot status={host.online ? "online" : "offline"} live={host.online} />
            <span className="truncate text-xs font-semibold text-ink">{host.hostname}</span>
            <span className="ml-auto text-[10px] text-ink-3 uppercase">{host.source}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-ink-3">
            <span>
              CPU{" "}
              <strong className="font-semibold text-ink-2">
                {host.cpuPercent != null ? `${Math.round(host.cpuPercent)}%` : "—"}
              </strong>
            </span>
            <span>
              RAM{" "}
              <strong className="font-semibold text-ink-2">
                {host.memPercent != null ? `${Math.round(host.memPercent)}%` : "—"}
              </strong>
            </span>
          </div>
        </div>
      ) : null}

      {!mobile ? (
        <div
          className={cn(
            "border-t border-edge/70 p-2.5",
            isCollapsed && "grid justify-items-center",
          )}
        >
          <button
            type="button"
            onClick={() => setCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl border border-edge/60 bg-surface-muted/35 px-2.5 py-2 text-[13px] text-ink-2 transition-all hover:border-accent/35 hover:bg-hover hover:text-ink",
              isCollapsed && "mx-auto size-10 justify-center px-0",
            )}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-muted">
              {isCollapsed ? (
                <PanelLeftOpen className="size-4" aria-hidden />
              ) : (
                <PanelLeftClose className="size-4" aria-hidden />
              )}
            </span>
            {!isCollapsed ? <span className="font-medium text-xs">Collapse</span> : null}
          </button>
        </div>
      ) : null}
    </div>
  );
}
