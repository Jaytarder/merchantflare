import Link from "next/link";
import type { NavigationIcon, NavigationItem } from "./navigation";

function NavigationGlyph({ icon }: { icon: NavigationIcon }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<NavigationIcon, React.ReactNode> = {
    mercury: <><circle cx="12" cy="12" r="7.5" {...common} /><path d="M8.5 12.3 11 15l4.8-6" {...common} /></>,
    workers: <><rect x="5" y="5" width="14" height="14" rx="4" {...common} /><path d="M9 12h6M12 9v6" {...common} /></>,
    atlas: <><path d="M4.5 17.5 9 6.5l3 7 2.2-4.5 5.3 8.5" {...common} /><path d="M6 17.5h12" {...common} /></>,
    vector: <><path d="m5 17 6.5-10 2 5L19 7" {...common} /><path d="M15.5 7H19v3.5" {...common} /></>,
    oracle: <><path d="M4.5 17.5h15M7 15V9m5 6V5m5 10v-3" {...common} /></>,
    sentinel: <path d="M12 3.8 18 6v5.1c0 4-2.4 7.1-6 9.1-3.6-2-6-5.1-6-9.1V6l6-2.2Z" {...common} />,
    forge: <><path d="M7 18.5 17.5 8l-1.8-1.8L5.2 16.7 5 19l2-.5Z" {...common} /><path d="m13.5 6.2 2.3-2.3 4.3 4.3-2.3 2.3" {...common} /></>,
    pulse: <path d="M3.5 12h4l2-5 4 10 2.2-5H21" {...common} />,
    execution: <><path d="M5 5.5h14v13H5z" {...common} /><path d="m9.5 9 5 3-5 3V9Z" {...common} /></>,
    approvals: <><circle cx="12" cy="12" r="8" {...common} /><path d="m8.5 12 2.3 2.4 4.8-5" {...common} /></>,
    history: <><path d="M5.2 8A8 8 0 1 1 4 12" {...common} /><path d="M5 4.5V8h3.5M12 7.5V12l3 1.8" {...common} /></>,
    knowledge: <><path d="M5 5.5c2.8-.6 5 .1 7 2v11c-2-1.9-4.2-2.6-7-2V5.5Z" {...common} /><path d="M19 5.5c-2.8-.6-5 .1-7 2v11c2-1.9 4.2-2.6 7-2V5.5Z" {...common} /></>,
    integrations: <><path d="M8 8 5.5 5.5M16 8l2.5-2.5M8 16l-2.5 2.5M16 16l2.5 2.5" {...common} /><rect x="8" y="8" width="8" height="8" rx="2" {...common} /></>,
    billing: <><rect x="4" y="6" width="16" height="12" rx="2.5" {...common} /><path d="M4 10h16M8 14h3" {...common} /></>,
    settings: <><circle cx="12" cy="12" r="3" {...common} /><path d="M12 3.8v2M12 18.2v2M3.8 12h2M18.2 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4" {...common} /></>,
  };
  return <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">{paths[icon]}</svg>;
}

type SidebarItemProps = {
  item: NavigationItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
};

export default function SidebarItem({ item, active, collapsed, onNavigate }: SidebarItemProps) {
  return (
    <Link
      className={`platform-nav-item ${active ? "is-active" : ""}`}
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
    >
      <span className="platform-nav-icon" aria-hidden="true"><NavigationGlyph icon={item.icon} /></span>
      <span className="platform-nav-copy">
        <strong>{item.label}</strong>
        <small>{item.description}</small>
      </span>
    </Link>
  );
}
