"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../../../components/brand/Logo";
import SidebarSection from "./SidebarSection";
import { connections, navigationForRole } from "./navigation";
import type { OrganizationRole } from "../../../lib/platform";

type SidebarProps = {
  drawerOpen: boolean;
  userRole: OrganizationRole;
  tabletCollapsed: boolean;
  onClose: () => void;
};

function isActive(pathname: string, href: string) {
  const route = href.split("#")[0];
  if (href.includes("#")) return false;
  if (route === "/dashboard") return pathname === route;
  return pathname === route || pathname.startsWith(`${route}/`);
}

export default function Sidebar({
  drawerOpen,
  userRole,
  tabletCollapsed,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const authorizedNavigation = navigationForRole(userRole);

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
          <Link href="/dashboard" aria-label="MerchantFlare Decision Lab" onClick={onClose}>
            <Logo
              className="platform-brand-logo"
              variant="horizontal"
              surface="dark"
              priority
            />
            <Logo
              className="platform-brand-mark"
              variant="monogram"
              surface="dark"
              decorative
            />
          </Link>
          <button className="platform-drawer-close" type="button" aria-label="Close navigation" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav className="platform-nav" aria-label="Primary navigation">
          {authorizedNavigation.map((section) => (
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
