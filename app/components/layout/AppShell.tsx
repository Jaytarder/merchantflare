"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type {
  OrganizationRole,
  PlatformNotification,
} from "../../../lib/platform";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Workspace from "./Workspace";

type AppShellProps = {
  children: ReactNode;
  userEmail?: string;
  userRole?: OrganizationRole;
  notifications?: PlatformNotification[];
};

export default function AppShell({
  children,
  userEmail = "jmartin@merchantflare.com",
  userRole = "owner",
  notifications = [],
}: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tabletCollapsed, setTabletCollapsed] = useState(true);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen]);

  return (
    <div className={`platform-shell ${tabletCollapsed ? "is-tablet-collapsed" : ""}`}>
      <Sidebar
        userRole={userRole}
        drawerOpen={drawerOpen}
        tabletCollapsed={tabletCollapsed}
        onClose={() => setDrawerOpen(false)}
      />
      <div className="platform-main">
        <Topbar
          userEmail={userEmail}
          userRole={userRole}
          notifications={notifications}
          tabletCollapsed={tabletCollapsed}
          onToggleTablet={() => setTabletCollapsed((collapsed) => !collapsed)}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <Workspace>{children}</Workspace>
      </div>
    </div>
  );
}
