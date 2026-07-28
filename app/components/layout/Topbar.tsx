import NotificationBell from "./NotificationBell";
import SearchBar from "./SearchBar";
import UserMenu from "./UserMenu";
import type {
  OrganizationRole,
  PlatformNotification,
} from "../../../lib/platform";

type TopbarProps = {
  userEmail: string;
  userRole: OrganizationRole;
  notifications: PlatformNotification[];
  tabletCollapsed: boolean;
  onToggleTablet: () => void;
  onOpenDrawer: () => void;
};

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PanelIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 4v16" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d={collapsed ? "M14.5 9.5 17 12l-2.5 2.5" : "M17 9.5 14.5 12l2.5 2.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Topbar({
  userEmail,
  userRole,
  notifications,
  tabletCollapsed,
  onToggleTablet,
  onOpenDrawer,
}: TopbarProps) {
  return (
    <header className="platform-topbar">
      <a className="platform-skip-link" href="#main-content">Skip to content</a>
      <button
        className="platform-menu platform-menu-mobile"
        type="button"
        aria-label="Open navigation"
        onClick={onOpenDrawer}
      >
        <MenuIcon />
      </button>
      <button
        className="platform-menu platform-menu-tablet"
        type="button"
        aria-label={tabletCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!tabletCollapsed}
        onClick={onToggleTablet}
      >
        <PanelIcon collapsed={tabletCollapsed} />
      </button>

      <SearchBar role={userRole} />

      <div className="platform-topbar-actions">
        <NotificationBell notifications={notifications} />
        <UserMenu email={userEmail} role={userRole} />
      </div>
    </header>
  );
}
