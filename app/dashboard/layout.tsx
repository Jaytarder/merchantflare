import AuthenticatedAppShell from "../components/layout/AuthenticatedAppShell";
import "../atlas/atlas.css";
import "./apple-decision-system.css";
import "../components/premium-application.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
