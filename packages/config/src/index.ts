/** Centralised polling / freshness policy ( §45-46 ). */
export const queryPolicy = {
  metrics: { staleTime: 4_000, refetchInterval: 5_000, retry: 1 },
  serviceHealth: { staleTime: 20_000, refetchInterval: 30_000, retry: 1 },
  discovery: { staleTime: 90_000, refetchInterval: 120_000, retry: 1 },
  history: { staleTime: 5 * 60_000, refetchInterval: false as const, retry: 1 },
  external: { staleTime: 60_000, refetchInterval: 120_000, retry: 1 },
  storage: { staleTime: 30_000, refetchInterval: 60_000, retry: 1 },
} as const;

export const navSections = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Home", icon: "layout-dashboard" }],
  },
  {
    label: "Infrastructure",
    items: [
      { to: "/servers", label: "Servers", icon: "server" },
      { to: "/devices", label: "Devices", icon: "smartphone" },
      { to: "/network", label: "Network", icon: "network" },
      { to: "/network/live", label: "Live Network", icon: "waypoints" },
      { to: "/docker", label: "Docker", icon: "container" },
      { to: "/services", label: "Services", icon: "globe" },
      { to: "/uptime", label: "Uptime", icon: "heart-pulse" },
      { to: "/storage", label: "Storage", icon: "hard-drive" },
      { to: "/dns", label: "DNS", icon: "shield" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/monitoring", label: "Monitoring", icon: "activity" },
      { to: "/alerts", label: "Alerts", icon: "bell" },
      { to: "/logs", label: "Logs", icon: "scroll-text" },
      { to: "/activity", label: "Activity", icon: "history" },
    ],
  },
  {
    label: "Integrations",
    items: [
      { to: "/integrations", label: "All integrations", icon: "blocks" },
      { to: "/integrations/github", label: "GitHub", icon: "github" },
      { to: "/integrations/docker", label: "Docker", icon: "container" },
      { to: "/integrations/pihole", label: "Pi-hole", icon: "shield" },
      { to: "/integrations/agent", label: "Linux Agent", icon: "terminal" },
      { to: "/integrations/tailscale", label: "Tailscale", icon: "waypoints" },
      { to: "/integrations/s3", label: "S3 Storage", icon: "database" },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/settings", label: "Settings", icon: "settings" },
      { to: "/api", label: "API", icon: "braces" },
    ],
  },
] as const;
