export type NavigationIcon =
  | "mercury"
  | "workers"
  | "atlas"
  | "vector"
  | "oracle"
  | "sentinel"
  | "forge"
  | "pulse"
  | "execution"
  | "approvals"
  | "history"
  | "knowledge"
  | "integrations"
  | "billing"
  | "settings";

export type NavigationItem = {
  label: string;
  href: string;
  icon: NavigationIcon;
  description: string;
  keywords?: string[];
};

export type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

export type PlatformConnection = {
  label: string;
  status: "connected" | "syncing" | "disconnected";
  detail: string;
};

export const navigation: NavigationSection[] = [
  {
    label: "Command",
    items: [
      {
        label: "Mercury",
        href: "/dashboard",
        icon: "mercury",
        description: "Command center and business intelligence",
        keywords: ["home", "dashboard", "command"],
      },
      {
        label: "AI Workers",
        href: "/workers",
        icon: "workers",
        description: "Mercury worker activity and assignments",
        keywords: ["agents", "workforce", "automation"],
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Atlas", href: "/atlas", icon: "atlas", description: "Catalog intelligence" },
      { label: "Vector", href: "/vector", icon: "vector", description: "Advertising control" },
      { label: "Oracle", href: "/oracle", icon: "oracle", description: "Inventory forecasting" },
      { label: "Sentinel", href: "/sentinel", icon: "sentinel", description: "Compliance defense" },
      { label: "Forge", href: "/forge", icon: "forge", description: "Creative operations" },
      { label: "Pulse", href: "/pulse", icon: "pulse", description: "Executive reporting" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Execution", href: "/execution", icon: "execution", description: "Staged and completed actions" },
      { label: "Approvals", href: "/approvals", icon: "approvals", description: "Review approval-gated work" },
      { label: "History", href: "/history", icon: "history", description: "Mercury plan history" },
      { label: "Knowledge", href: "/knowledge", icon: "knowledge", description: "Business context and sources" },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Integrations", href: "/integrations", icon: "integrations", description: "Data and commerce connections" },
      { label: "Billing", href: "/billing", icon: "billing", description: "Plan and usage" },
      { label: "Settings", href: "/settings", icon: "settings", description: "Workspace preferences" },
    ],
  },
];

export const navigationItems = navigation.flatMap((section) => section.items);

export const connections: PlatformConnection[] = [
  { label: "Amazon Vendor", status: "connected", detail: "Connected" },
  { label: "Amazon Ads", status: "connected", detail: "Connected" },
  { label: "Stripe", status: "syncing", detail: "Syncing" },
  { label: "Shopify", status: "disconnected", detail: "Not connected" },
];
