import type * as React from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Container,
  Globe,
  HardDrive,
  Network,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Card, CardAction, CardBody, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/cn";

interface QuickAction {
  label: string;
  description: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}

const actions: QuickAction[] = [
  {
    label: "Live topology",
    description: "Inspect nodes, links, and P2P paths",
    to: "/network/live",
    icon: Network,
    tone: "text-accent-strong bg-accent/12",
  },
  {
    label: "Alert center",
    description: "Triage active warnings and incidents",
    to: "/alerts",
    icon: Bell,
    tone: "text-rose-500 bg-rose-500/10",
  },
  {
    label: "Container control",
    description: "Start, stop, and inspect workloads",
    to: "/docker",
    icon: Container,
    tone: "text-sky-500 bg-sky-500/10",
  },
  {
    label: "Service checks",
    description: "Run probes and review response times",
    to: "/services",
    icon: Globe,
    tone: "text-emerald-500 bg-emerald-500/10",
  },
  {
    label: "Storage pools",
    description: "Check capacity, disks, and object storage",
    to: "/storage",
    icon: HardDrive,
    tone: "text-amber-500 bg-amber-500/10",
  },
  {
    label: "System settings",
    description: "Tune appearance, thresholds, and access",
    to: "/settings",
    icon: Settings,
    tone: "text-violet-500 bg-violet-500/10",
  },
];

/** Fast paths for the most common operator actions from the overview. */
export function QuickActions(): React.JSX.Element {
  return (
    <Card variant="feature" className="overflow-visible">
      <CardHeader className="border-b border-edge/50">
        <div>
          <CardTitle>
            <span className="grid size-8 place-items-center rounded-xl bg-accent/12 text-accent-strong">
              <Activity className="size-4" aria-hidden />
            </span>
            <span>Operator shortcuts</span>
          </CardTitle>
          <p className="mt-1 text-[13px] text-ink-3">
            Jump straight into the controls you use most.
          </p>
        </div>
        <CardAction>
          <span className="hidden items-center gap-1.5 text-[11px] font-medium text-ink-3 sm:inline-flex">
            <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden />
            Live workspace
          </span>
        </CardAction>
      </CardHeader>
      <CardBody className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.to}
              to={action.to}
              className="group/action flex min-w-0 items-center gap-3 rounded-xl border border-edge/60 bg-panel/55 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-panel hover:shadow-lg active:translate-y-0 active:scale-[0.99]"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover/action:scale-105",
                  action.tone,
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {action.label}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-ink-3">
                  {action.description}
                </span>
              </span>
              <ArrowUpRight
                className="size-4 shrink-0 text-ink-3 transition-all duration-200 group-hover/action:-translate-y-0.5 group-hover/action:translate-x-0.5 group-hover/action:text-accent-strong"
                aria-hidden
              />
            </Link>
          );
        })}
      </CardBody>
    </Card>
  );
}
