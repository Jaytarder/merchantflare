import Link from "next/link";
import type { NavigationIcon, NavigationItem } from "./navigation";

const iconLabels: Record<NavigationIcon, string> = {
  mercury: "M",
  workers: "AI",
  atlas: "A",
  vector: "V",
  oracle: "O",
  sentinel: "S",
  forge: "F",
  pulse: "P",
  execution: "E",
  approvals: "✓",
  history: "H",
  knowledge: "K",
  integrations: "I",
  billing: "$",
  settings: "⚙",
};

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
      <span className="platform-nav-icon" aria-hidden="true">{iconLabels[item.icon]}</span>
      <span className="platform-nav-copy">
        <strong>{item.label}</strong>
        <small>{item.description}</small>
      </span>
    </Link>
  );
}
