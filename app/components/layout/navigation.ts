import {
  hasPermission,
  type OrganizationRole,
  type PlatformPermission,
} from "../../../lib/platform/authorization";

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
  permission: PlatformPermission;
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
        description: "Commerce Intelligence workspace",
        keywords: ["home", "dashboard", "command", "conversation"],
        permission: "mercury.read",
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Atlas", href: "/atlas", icon: "atlas", description: "Catalog intelligence", permission: "atlas.read" },
      { label: "Vector", href: "/vector", icon: "vector", description: "Advertising control", permission: "mercury.read" },
      { label: "Oracle", href: "/oracle", icon: "oracle", description: "Inventory forecasting", permission: "mercury.read" },
      { label: "Sentinel", href: "/sentinel", icon: "sentinel", description: "Compliance defense", permission: "mercury.read" },
      { label: "Forge", href: "/forge", icon: "forge", description: "Creative operations", permission: "mercury.read" },
      { label: "Pulse", href: "/pulse", icon: "pulse", description: "Executive reporting", permission: "mercury.read" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Execution", href: "/execution", icon: "execution", description: "Staged and completed actions", permission: "mercury.write" },
      { label: "Approvals", href: "/approvals", icon: "approvals", description: "Review approval-gated work", permission: "mercury.approve" },
      { label: "History", href: "/history", icon: "history", description: "Mercury plan history", permission: "mercury.read" },
      { label: "Knowledge", href: "/knowledge", icon: "knowledge", description: "Business context and sources", permission: "organization.read" },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Integrations", href: "/integrations", icon: "integrations", description: "Data and commerce connections", permission: "integrations.read" },
      { label: "Billing", href: "/billing", icon: "billing", description: "Plan and usage", permission: "billing.read" },
      { label: "Settings", href: "/settings", icon: "settings", description: "Workspace preferences", permission: "organization.read" },
    ],
  },
];

export const navigationItems = navigation.flatMap((section) => section.items);

export function navigationForRole(role: OrganizationRole) {
  return navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        hasPermission({ role }, item.permission),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export const connections: PlatformConnection[] = [
  { label: "Amazon Vendor", status: "disconnected", detail: "Not configured" },
  { label: "Amazon Ads", status: "disconnected", detail: "Not configured" },
  { label: "Stripe", status: "disconnected", detail: "Not configured" },
  { label: "Shopify", status: "disconnected", detail: "Not configured" },
];
