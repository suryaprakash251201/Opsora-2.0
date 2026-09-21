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

export function Sidebar(): React.JSX.Element {
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const { data } = useAlerts("active");
  const critCount = data?.alerts.filter((a) => a.severity === "critical").length ?? 0;

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex h-full flex-col gap-4 overflow-y-auto px-2 py-3",
        collapsed && "items-center px-1.5",
      )}
    >
      {navSections.map((section) => (
        <div key={section.label} className={cn("grid gap-0.5", collapsed ? "w-full" : "w-full")}>
          {!collapsed ? (
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {section.label}
            </p>
          ) : null}
          {section.items.map((item) => {
            const Icon = icons[item.icon] ?? Globe;
            return (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-ink-2 transition-colors hover:bg-white/5 hover:text-ink",
                    isActive && "bg-sky-400/10 text-sky-100",
                    collapsed && "justify-center px-0",
                  )
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
                {!collapsed && item.label === "Alerts" && critCount > 0 ? (
                  <span className="ml-auto rounded-full bg-red-500/20 px-1.5 text-[11px] font-semibold text-red-200">
                    {critCount}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
