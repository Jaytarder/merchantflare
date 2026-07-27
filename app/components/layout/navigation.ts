export type NavigationItem = {
  label: string;
  href: string;
  icon: string;
};

export type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

export const navigation: NavigationSection[] = [
  {
    label: "Overview",
    items: [{ label: "Mercury", href: "/dashboard", icon: "M" }],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Atlas", href: "/atlas", icon: "A" },
      { label: "Vector", href: "/vector", icon: "V" },
      { label: "Oracle", href: "/oracle", icon: "O" },
      { label: "Sentinel", href: "/sentinel", icon: "S" },
      { label: "Forge", href: "/forge", icon: "F" },
      { label: "Pulse", href: "/pulse", icon: "P" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Execution", href: "/execution", icon: "E" },
      { label: "Approvals", href: "/approvals", icon: "✓" },
      { label: "History", href: "/history", icon: "H" },
      { label: "Knowledge", href: "/knowledge", icon: "K" },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Integrations", href: "/integrations", icon: "I" },
      { label: "Billing", href: "/billing", icon: "$" },
      { label: "Settings", href: "/settings", icon: "⚙" },
    ],
  },
];

export const connections = [
  { label: "Amazon Vendor", connected: true },
  { label: "Amazon Ads", connected: true },
  { label: "Stripe", connected: true },
  { label: "Shopify", connected: false },
];
