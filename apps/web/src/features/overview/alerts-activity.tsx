import { timeAgo } from "@opsora/utils";
import { Link } from "react-router";
import { useActivity, useAlerts } from "../../lib/queries";
import { Card, CardBody, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/states";
import { Skeleton } from "../../components/ui/skeleton";
import { StatusBadge } from "../../components/ui/status";
import { Button } from "../../components/ui/button";
import { apiPost } from "../../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { keys } from "../../lib/query";
import * as React from "react";

export function AlertsPanel(): React.JSX.Element {
  const { data, isLoading } = useAlerts("active");
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function act(id: string, action: "acknowledge" | "resolve" | "mute"): Promise<void> {
    setBusy(id);
    try {
      await apiPost(`/api/alerts/${id}`, { action });
      await qc.invalidateQueries({ queryKey: keys.alerts() });
    } finally {
      setBusy(null);
    }
  }

  if (isLoading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardBody>
          <Skeleton className="h-24 w-full" />
        </CardBody>
      </Card>
    );
  const list = data?.alerts.slice(0, 6) ?? [];
  if (list.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
          <Link to="/alerts" className="text-xs text-accent-strong hover:underline">
            Center
          </Link>
        </CardHeader>
        <CardBody>
          <EmptyState
            title="No active alerts"
            hint="Everything is quiet. Threshold breaches will appear here."
          />
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts · {data?.alerts.length}</CardTitle>
        <Link to="/alerts" className="text-xs text-accent-strong hover:underline">
          Center
        </Link>
      </CardHeader>
      <CardBody className="grid gap-2">
        {list.map((a) => (
          <div
            key={a.id}
            className="flex items-start gap-2 rounded-md border border-edge/70 bg-panel-2 px-2.5 py-2"
          >
            <StatusBadge status={a.severity} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{a.title}</p>
              <p className="num text-[11px] text-ink-3">
                {a.resource ?? ""} · {timeAgo(a.createdAt)}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={busy === a.id}
                onClick={() => void act(a.id, "acknowledge")}
              >
                Ack
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy === a.id}
                onClick={() => void act(a.id, "resolve")}
              >
                Resolve
              </Button>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

export function ActivityFeed({ limit = 8 }: { limit?: number }): React.JSX.Element {
  const { data, isLoading } = useActivity();
  if (isLoading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardBody>
          <Skeleton className="h-24 w-full" />
        </CardBody>
      </Card>
    );
  const items = (data?.activity ?? []).slice(0, limit);
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <Link to="/activity" className="text-xs text-accent-strong hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardBody>
          <EmptyState
            title="No events yet"
            hint="Infrastructure events will stream here over SSE."
          />
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <Link to="/activity" className="text-xs text-accent-strong hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardBody>
        <ol className="relative grid gap-3 border-l border-edge pl-4">
          {items.map((e) => (
            <li key={e.id} className="text-[13px]">
              <p className="text-ink-2">
                <span className="text-ink">{e.resource ?? e.category}</span> — {e.message}
              </p>
              <p className="num text-[11px] text-ink-3">
                {timeAgo(e.ts)} · {e.category}
              </p>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
