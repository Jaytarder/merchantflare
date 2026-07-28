import AuthenticatedAppShell from "../components/layout/AuthenticatedAppShell";

export default function AtlasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
