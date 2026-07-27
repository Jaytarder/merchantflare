import type { ReactNode } from "react";

type NavKey = "dashboard" | "workers" | "performance" | "priorities" | "activity" | "settings";

type AppShellProps = {
  active: NavKey;
  children: ReactNode;
};

const links: Array<{ key: NavKey; label: string; href: string }> = [
  { key: "dashboard", label: "Command Center", href: "/dashboard" },
  { key: "priorities", label: "Priorities", href: "/dashboard#priorities" },
  { key: "workers", label: "AI Workers", href: "/dashboard#workers" },
  { key: "performance", label: "Performance", href: "/dashboard#performance" },
  { key: "activity", label: "Activity", href: "/dashboard#activity" },
  { key: "settings", label: "Settings", href: "/dashboard#settings" },
];

export default function AppShell({ active, children }: AppShellProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/dashboard" aria-label="MerchantFlare command center">
          <span className="brand-mark">M</span>
          <span>MerchantFlare</span>
        </a>
        <nav className="nav" aria-label="Primary navigation">
          {links.map((link) => (
            <a className={active === link.key ? "active" : ""} href={link.href} key={link.key}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <strong>Mercury OS</strong><br />
          <small>Preview environment online</small>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
