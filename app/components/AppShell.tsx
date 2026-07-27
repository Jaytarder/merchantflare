"use client";

import { useState, type ReactNode } from "react";

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

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <img
      className={compact ? "brand-logo compact" : "brand-logo"}
      src="/merchantflare-logo.svg"
      alt="MerchantFlare — The AI Workforce for Commerce"
    />
  );
}

export default function AppShell({ active, children }: AppShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="shell">
      <header className="mobile-bar">
        <a href="/dashboard" aria-label="MerchantFlare command center"><BrandLogo compact /></a>
        <button
          className="menu-button"
          type="button"
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          <span /><span /><span />
        </button>
      </header>

      {open && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head">
          <a href="/dashboard" aria-label="MerchantFlare command center"><BrandLogo /></a>
          <button className="close-button" type="button" aria-label="Close navigation" onClick={() => setOpen(false)}>×</button>
        </div>
        <nav className="nav" aria-label="Primary navigation">
          {links.map((link) => (
            <a className={active === link.key ? "active" : ""} href={link.href} key={link.key} onClick={() => setOpen(false)}>
              <span className="nav-dot" />{link.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-status"><span className="dot" /><strong>Mercury online</strong></div>
          <small>Preview environment · Main branch</small>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
