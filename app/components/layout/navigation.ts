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
        label: "Decision Lab",
        href: "/dashboard",
        icon: "mercury",
        description: "Scientific decision workspace",
        keywords: ["home", "dashboard", "decision", "lab"],
        permission: "mercury.read",
      },
      { label: "Decision Cases", href: "/dashboard#decision-cases", icon: "history", description: "Evidence-backed decisions", permission: "decisions.read" },
      { label: "Evidence", href: "/dashboard#evidence", icon: "execution", description: "Sources and contradictions", permission: "decisions.read" },
      { label: "Knowledge", href: "/dashboard#knowledge", icon: "knowledge", description: "Lessons and reusable learning", permission: "decisions.read" },
      { label: "Experiments", href: "/dashboard#experiments", icon: "execution", description: "Tests and outcomes", permission: "decisions.read" },
      { label: "Approvals", href: "/approvals", icon: "approvals", description: "Human governance", permission: "decisions.approve" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Atlas", href: "/atlas", icon: "atlas", description: "Catalog intelligence", permission: "atlas.read" },
      { label: "Vector", href: "/vector", icon: "vector", description: "Advertising control", permission: "mercury.read" },
      { label: "Oracle", href: "/oracle", icon: "oracle", description: "Demand & availability", permission: "oracle.read" },
      { label: "Sentinel", href: "/sentinel", icon: "sentinel", description: "Compliance defense", permission: "mercury.read" },
      { label: "Forge", href: "/forge", icon: "forge", description: "Creative operations", permission: "mercury.read" },
      { label: "Pulse", href: "/pulse", icon: "pulse", description: "Executive reporting", permission: "mercury.read" },
    ],
  },
  {
    label: "Platform",
    items: [
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
