import AuthenticatedAppShell from "../components/layout/AuthenticatedAppShell";
import "../components/premium-application.css";

export default function AtlasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
