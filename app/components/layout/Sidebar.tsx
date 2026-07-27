"use client";

import { usePathname } from "next/navigation";
import { connections, navigation } from "./navigation";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/mercury";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && <button className="platform-backdrop" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`platform-sidebar ${open ? "open" : ""}`} aria-label="Application navigation">
        <div className="platform-brand">
          <a href="/dashboard" aria-label="MerchantFlare Mercury">
            <img src="/merchantflare-logo.svg" alt="MerchantFlare" />
          </a>
        </div>

        <nav className="platform-nav">
          {navigation.map((section) => (
            <section className="platform-nav-section" key={section.label}>
              <span className="platform-nav-label">{section.label}</span>
              <div className="platform-nav-list">
                {section.items.map((item) => (
                  <a
                    className={`platform-nav-item ${isActive(pathname, item.href) ? "active" : ""}`}
                    href={item.href}
                    key={item.href}
                    onClick={onClose}
                  >
                    <span className="platform-nav-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="platform-connections">
          <h3>Connections</h3>
          {connections.map((connection) => (
            <div className={`platform-connection ${connection.connected ? "" : "offline"}`} key={connection.label}>
              <span>{connection.label}</span>
              <i aria-label={connection.connected ? "Connected" : "Not connected"} />
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
