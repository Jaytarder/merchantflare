import type { ReactNode } from "react";

type NavKey = "dashboard" | "workers" | "performance" | "catalog" | "advertising" | "settings";

type AppShellProps = {
  active: NavKey;
  children: ReactNode;
};

const links: Array<{ key: NavKey; label: string; href: string }> = [
  { key: "dashboard", label: "Command Center", href: "/dashboard" },
  { key: "workers", label: "AI Workers", href: "/workers" },
  { key: "performance", label: "Performance", href: "/dashboard#performance" },
  { key: "catalog", label: "Catalog", href: "/catalog" },
  { key: "advertising", label: "Advertising", href: "/advertising" },
  { key: "settings", label: "Settings", href: "/settings" },
];

export default function AppShell({ active, children }: AppShellProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/dashboard">
          <span className="brand-mark">M</span>
          MerchantFlare
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
          <small>Commerce intelligence online</small>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
