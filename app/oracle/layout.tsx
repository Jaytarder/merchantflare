import AuthenticatedAppShell from "../components/layout/AuthenticatedAppShell";
import "../components/premium-application.css";
import "./oracle.css";

export default function OracleLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
