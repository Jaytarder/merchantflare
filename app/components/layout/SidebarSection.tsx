import SidebarItem from "./SidebarItem";
import type { NavigationSection } from "./navigation";

type SidebarSectionProps = {
  section: NavigationSection;
  activeHref?: string;
  collapsed: boolean;
  onNavigate: () => void;
};

export default function SidebarSection({
  section,
  activeHref,
  collapsed,
  onNavigate,
}: SidebarSectionProps) {
  return (
    <section className="platform-nav-section" aria-labelledby={`nav-${section.label.toLowerCase().replaceAll(" ", "-")}`}>
      <h2
        className="platform-nav-label"
        id={`nav-${section.label.toLowerCase().replaceAll(" ", "-")}`}
      >
        {section.label}
      </h2>
      <div className="platform-nav-list">
        {section.items.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={activeHref === item.href}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
}
