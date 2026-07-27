"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SidebarSection from "./SidebarSection";
import { connections, navigation } from "./navigation";

type SidebarProps = {
  drawerOpen: boolean;
  tabletCollapsed: boolean;
  onClose: () => void;
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ drawerOpen, tabletCollapsed, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {drawerOpen ? (
        <button className="platform-backdrop" type="button" aria-label="Close navigation" onClick={onClose} />
      ) : null}

      <aside
        className={`platform-sidebar ${drawerOpen ? "is-open" : ""} ${tabletCollapsed ? "is-collapsed" : ""}`}
        aria-label="Application navigation"
      >
        <div className="platform-brand">
          <Link href="/dashboard" aria-label="MerchantFlare Mercury command center" onClick={onClose}>
            <Image
              className="platform-brand-logo"
              src="/merchantflare-logo.svg"
              alt="MerchantFlare"
              width={180}
              height={53}
              priority
            />
            <span className="platform-brand-mark" aria-hidden="true">MF</span>
          </Link>
          <button className="platform-drawer-close" type="button" aria-label="Close navigation" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav className="platform-nav" aria-label="Primary navigation">
          {navigation.map((section) => (
            <SidebarSection
              key={section.label}
              section={section}
              activeHref={section.items.find((item) => isActive(pathname, item.href))?.href}
              collapsed={tabletCollapsed}
              onNavigate={onClose}
            />
          ))}
        </nav>

        <footer className="platform-connections">
          <h2>Platform status</h2>
          <div className="platform-connection-list">
            {connections.map((connection) => (
              <div className="platform-connection" key={connection.label} title={`${connection.label}: ${connection.detail}`}>
                <span className={`platform-connection-dot is-${connection.status}`} aria-hidden="true" />
                <span className="platform-connection-copy">
                  <strong>{connection.label}</strong>
                  <small>{connection.detail}</small>
                </span>
              </div>
            ))}
          </div>
        </footer>
      </aside>
    </>
  );
}
