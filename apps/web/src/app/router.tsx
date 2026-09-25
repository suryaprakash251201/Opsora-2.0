import { createBrowserRouter } from "react-router";
import { AppShell } from "../components/layout/shell";
import { ActivityPage, LogsPage, MonitoringPage } from "../routes/ops";
import { AlertsPage } from "../routes/alerts";
import { ApiPage, NotFoundPage, SettingsPage } from "../routes/admin";
import { DevicesPage } from "../routes/devices";
import { DnsPage } from "../routes/dns";
import { DockerPage } from "../routes/docker";
import { HomePage } from "../routes/home";
import { GithubPage, IntegrationDetailPage, IntegrationsPage } from "../routes/integrations";
import { NetworkPage } from "../routes/network";
import { NetworkLivePage } from "../features/network/pages/NetworkLivePage";
import { ServersPage } from "../routes/servers";
import { ServicesPage } from "../routes/services";
import { UptimePage } from "../routes/uptime";
import { StoragePage } from "../routes/storage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/servers", element: <ServersPage /> },
      { path: "/devices", element: <DevicesPage /> },
      { path: "/network", element: <NetworkPage /> },
      { path: "/network/live", element: <NetworkLivePage /> },
      { path: "/docker", element: <DockerPage /> },
      { path: "/services", element: <ServicesPage /> },
      { path: "/uptime", element: <UptimePage /> },
      { path: "/storage", element: <StoragePage /> },
      { path: "/dns", element: <DnsPage /> },
      { path: "/monitoring", element: <MonitoringPage /> },
      { path: "/alerts", element: <AlertsPage /> },
      { path: "/logs", element: <LogsPage /> },
      { path: "/activity", element: <ActivityPage /> },
      { path: "/integrations", element: <IntegrationsPage /> },
      { path: "/integrations/github", element: <GithubPage /> },
      { path: "/integrations/docker", element: <DockerPage /> },
      { path: "/integrations/pihole", element: <DnsPage /> },
      {
        path: "/integrations/agent",
        element: (
          <IntegrationDetailPage
            title="Linux Agent"
            hint="Install the agent on a host and point it at POST /api/servers/report with X-Agent-Token. Authenticated check-ins appear under Servers."
            to="/servers"
          />
        ),
      },
      {
        path: "/integrations/tailscale",
        element: (
          <IntegrationDetailPage
            title="Tailscale"
            hint="Set TAILSCALE_API_KEY and TAILSCALE_TAILNET server-side. Devices then appear under Devices and Network."
            to="/devices"
          />
        ),
      },
      {
        path: "/integrations/s3",
        element: (
          <IntegrationDetailPage
            title="S3 Storage"
            hint="Set S3_ENDPOINT plus access credentials server-side. Buckets appear under Storage."
            to="/storage"
          />
        ),
      },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/api", element: <ApiPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
